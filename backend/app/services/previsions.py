import warnings

import pandas as pd
from sqlalchemy import func
from sqlalchemy.orm import Session
from statsmodels.tsa.arima.model import ARIMA

from app.models.reglement import Reglement
from app.models.sinistre import Sinistre
from app.schemas.previsions import PointPrevision, PrevisionsResponse, SeriePrevision

BACKTEST_MOIS = 4
SEUIL_HISTORIQUE_STABLE = 24  # mois ; en dessous, on avertit explicitement
ARIMA_ORDER = (1, 1, 1)


def _fit_forecast(train: pd.Series, steps: int, alpha: float = 0.2):
    # statsmodels mutates method_kwargs in place (injects enforce_stationarity
    # etc.) -> a fresh dict is required on every call, never a shared constant.
    method_kwargs = {"method": "nm", "disp": False, "maxiter": 500}
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        model = ARIMA(train, order=ARIMA_ORDER).fit(method_kwargs=method_kwargs)
        fc = model.get_forecast(steps=steps)
        mean = fc.predicted_mean
        ci = fc.conf_int(alpha=alpha)
    return mean, ci


def _build_serie(values: pd.Series, modele_label: str) -> SeriePrevision:
    n = len(values)
    points: list[PointPrevision] = []

    nb_backtest = min(BACKTEST_MOIS, max(n - 3, 0))
    mape = None

    if nb_backtest >= 1 and n - nb_backtest >= 3:
        train = values.iloc[: n - nb_backtest]
        test = values.iloc[n - nb_backtest :]
        mean, ci = _fit_forecast(train, steps=nb_backtest)

        erreurs = []
        for i in range(nb_backtest):
            reel = float(test.iloc[i])
            estime = float(mean.iloc[i])
            if reel != 0:
                erreurs.append(abs(reel - estime) / abs(reel))
        mape = round(sum(erreurs) / len(erreurs) * 100, 1) if erreurs else None

        for i in range(n - nb_backtest):
            mois = str(values.index[i])
            points.append(PointPrevision(mois=mois, valeur=float(values.iloc[i]), borne_basse=None, borne_haute=None, type="historique"))
        for i in range(nb_backtest):
            mois = str(test.index[i])
            points.append(
                PointPrevision(
                    mois=mois,
                    valeur=float(mean.iloc[i]),
                    borne_basse=max(float(ci.iloc[i, 0]), 0),
                    borne_haute=float(ci.iloc[i, 1]),
                    type="backtest",
                )
            )
    else:
        for i in range(n):
            mois = str(values.index[i])
            points.append(PointPrevision(mois=mois, valeur=float(values.iloc[i]), borne_basse=None, borne_haute=None, type="historique"))

    # Prevision du mois suivant, reentrainee sur l'historique complet
    mean_next, ci_next = _fit_forecast(values, steps=1)
    prochain_mois = (values.index[-1] + 1).strftime("%Y-%m")
    points.append(
        PointPrevision(
            mois=prochain_mois,
            valeur=float(mean_next.iloc[0]),
            borne_basse=max(float(ci_next.iloc[0, 0]), 0),
            borne_haute=float(ci_next.iloc[0, 1]),
            type="prevision",
        )
    )

    instable = n < SEUIL_HISTORIQUE_STABLE or (mape is not None and mape > 30)
    message = None
    if instable:
        raisons = []
        if n < SEUIL_HISTORIQUE_STABLE:
            raisons.append(f"historique limite a {n} mois (recommande : {SEUIL_HISTORIQUE_STABLE}+)")
        if mape is not None and mape > 30:
            raisons.append(f"erreur de backtest elevee ({mape}% MAPE)")
        message = "Prevision a interpreter avec prudence : " + ", ".join(raisons) + "."

    return SeriePrevision(
        points=points,
        modele=f"ARIMA{ARIMA_ORDER}",
        mape_backtest=mape,
        nombre_mois_historique=n,
        instable=instable,
        message_instabilite=message,
    )


def _monthly_series_sinistres(db: Session) -> pd.Series:
    mois_expr = func.date_format(Sinistre.date_ouverture, "%Y-%m")
    rows = db.query(mois_expr.label("mois"), func.count(Sinistre.id)).group_by("mois").order_by("mois").all()
    index = pd.PeriodIndex([r[0] for r in rows], freq="M")
    return pd.Series([r[1] for r in rows], index=index)


def _monthly_series_montant(db: Session) -> pd.Series:
    mois_expr = func.date_format(Reglement.date_reglement, "%Y-%m")
    rows = (
        db.query(mois_expr.label("mois"), func.sum(Reglement.montant_reglement))
        .group_by("mois")
        .order_by("mois")
        .all()
    )
    index = pd.PeriodIndex([r[0] for r in rows], freq="M")
    return pd.Series([float(r[1]) for r in rows], index=index)


def get_previsions(db: Session) -> PrevisionsResponse:
    serie_sinistres = _monthly_series_sinistres(db)
    serie_montant = _monthly_series_montant(db)

    return PrevisionsResponse(
        nombre_sinistres=_build_serie(serie_sinistres, "ARIMA"),
        montant_total=_build_serie(serie_montant, "ARIMA"),
    )
