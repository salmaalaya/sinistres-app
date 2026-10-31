import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.impute import SimpleImputer
from sqlalchemy.orm import Session, selectinload

from app.models.sinistre import Sinistre
from app.schemas.anomalies import AnomalieDossier

DEFAULT_CONTAMINATION = 0.05
Z_SCORE_THRESHOLD = 1.5

FEATURE_KEYS = [
    "montant",
    "sinistre_ouverture",
    "ouverture_ordonnancement",
    "ordonnancement_reglement",
    "ouverture_cloture",
]
FEATURE_LABELS = {
    "montant": "Montant regle",
    "sinistre_ouverture": "Delai Sinistre -> Ouverture",
    "ouverture_ordonnancement": "Delai Ouverture -> Ordonnancement",
    "ordonnancement_reglement": "Delai Ordonnancement -> Reglement",
    "ouverture_cloture": "Delai Ouverture -> Cloture",
}


def _build_features(sinistres: list[Sinistre]) -> np.ndarray:
    rows = []
    for s in sinistres:
        montant = float(s.montant_total_regle)
        sinistre_ouverture = (s.date_ouverture - s.date_sinistre).days
        ouverture_ordonnancement = (s.date_ordonnancement - s.date_ouverture).days
        reg_delays = [(r.date_reglement - s.date_ordonnancement).days for r in s.reglements]
        ordonnancement_reglement = sum(reg_delays) / len(reg_delays) if reg_delays else np.nan
        ouverture_cloture = (
            (s.date_cloture_sinistre - s.date_ouverture).days if s.date_cloture_sinistre else np.nan
        )
        rows.append(
            [montant, sinistre_ouverture, ouverture_ordonnancement, ordonnancement_reglement, ouverture_cloture]
        )
    return np.array(rows, dtype=float)


def _reasons_for(raw_row: np.ndarray, z_row: np.ndarray, is_cloture: bool) -> list[str]:
    eligible = [
        j
        for j in range(len(FEATURE_KEYS))
        if not (FEATURE_KEYS[j] == "ouverture_cloture" and not is_cloture) and not np.isnan(z_row[j])
    ]
    eligible.sort(key=lambda j: -abs(z_row[j]))

    reasons = []
    for j in eligible[:2]:
        if abs(z_row[j]) < Z_SCORE_THRESHOLD:
            continue
        label = FEATURE_LABELS[FEATURE_KEYS[j]]
        if FEATURE_KEYS[j] == "montant":
            direction = "eleve" if z_row[j] > 0 else "bas"
            reasons.append(f"{label} anormalement {direction} : {raw_row[j]:.3f} DT")
        else:
            word = "long" if z_row[j] > 0 else "court"
            reasons.append(f"{label} exceptionnellement {word} : {raw_row[j]:.0f}j")

    if not reasons and eligible:
        j = eligible[0]
        reasons.append(f"{FEATURE_LABELS[FEATURE_KEYS[j]]} atypique par rapport au portefeuille")
    return reasons


def detect_anomalies(
    db: Session, *, contamination: float = DEFAULT_CONTAMINATION, page: int = 0, size: int = 20
) -> tuple[list[AnomalieDossier], int, int, int]:
    sinistres = db.query(Sinistre).options(selectinload(Sinistre.reglements)).all()
    raw = _build_features(sinistres)

    col_means = np.nanmean(raw, axis=0)
    col_stds = np.nanstd(raw, axis=0)
    col_stds[col_stds == 0] = 1.0

    X = SimpleImputer(strategy="median").fit_transform(raw)

    model = IsolationForest(n_estimators=200, contamination=contamination, random_state=42)
    model.fit(X)
    raw_scores = model.decision_function(X)
    predictions = model.predict(X)

    results = []
    for i, s in enumerate(sinistres):
        if predictions[i] != -1:
            continue
        z_row = (raw[i] - col_means) / col_stds
        reasons = _reasons_for(raw[i], z_row, is_cloture=s.date_cloture_sinistre is not None)

        results.append(
            AnomalieDossier(
                id=s.id,
                code_sinistre=s.code_sinistre,
                n_sinistre=s.n_sinistre,
                statut=s.statut,
                montant_total_regle=s.montant_total_regle,
                score_anomalie=round(-float(raw_scores[i]), 4),
                raisons=reasons,
            )
        )

    results.sort(key=lambda a: a.score_anomalie, reverse=True)
    total_elements = len(results)
    total_pages = -(-total_elements // size) if total_elements else 0
    start = page * size
    page_items = results[start : start + size]
    return page_items, total_elements, total_pages, len(sinistres)
