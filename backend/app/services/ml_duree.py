import pandas as pd
from sqlalchemy.orm import Session

from app.models.sinistre import Sinistre
from app.schemas.predictions import (
    ComparaisonModeles,
    DureePredictionRequest,
    DureePredictionResponse,
)
from app.services import ml_similar
from app.services.ml_common import compare_and_train, compute_importances

CATEGORICAL_COLS = ["nature_sin", "type_sin", "processus"]
NUMERIC_COLS = ["montant_total_regle", "mois_ouverture"]
TARGET_COL = "duree_jours"

FEATURE_LABELS = {
    "nature_sin": "Nature du sinistre",
    "type_sin": "Type de sinistre",
    "processus": "Processus",
    "montant_total_regle": "Montant du dossier",
    "mois_ouverture": "Mois d'ouverture",
}

_cache: dict = {}


def _build_dataframe(db: Session) -> pd.DataFrame:
    sinistres = db.query(Sinistre).filter(Sinistre.date_cloture_sinistre.isnot(None)).all()
    rows = [
        {
            "nature_sin": s.nature_sin,
            "type_sin": s.type_sin,
            "processus": s.processus,
            "montant_total_regle": float(s.montant_total_regle),
            "mois_ouverture": s.date_ouverture.month,
            "duree_jours": (s.date_cloture_sinistre - s.date_ouverture).days,
        }
        for s in sinistres
    ]
    return pd.DataFrame(rows)


def get_or_train(db: Session) -> tuple[ComparaisonModeles, object]:
    if "comparaison" not in _cache:
        df = _build_dataframe(db)
        comparaison, pipeline = compare_and_train(df, CATEGORICAL_COLS, NUMERIC_COLS, TARGET_COL)
        _cache["comparaison"] = comparaison
        _cache["pipeline"] = pipeline
        _cache["df"] = df
    return _cache["comparaison"], _cache["pipeline"]


def get_importances(db: Session) -> list:
    get_or_train(db)
    if "importances" not in _cache:
        df = _cache["df"]
        pipeline = _cache["pipeline"]
        feature_cols = CATEGORICAL_COLS + NUMERIC_COLS
        _cache["importances"] = compute_importances(pipeline, df[feature_cols], df[TARGET_COL], FEATURE_LABELS)
    return _cache["importances"]


def predict(db: Session, payload: DureePredictionRequest) -> DureePredictionResponse:
    comparaison, pipeline = get_or_train(db)
    row = pd.DataFrame(
        [
            {
                "nature_sin": payload.nature_sin,
                "type_sin": payload.type_sin,
                "processus": payload.processus,
                "montant_total_regle": float(payload.montant_estime),
                "mois_ouverture": payload.date_ouverture.month,
            }
        ]
    )
    jours = round(max(float(pipeline.predict(row)[0]), 0), 1)
    similaires = ml_similar.find_similar(
        db,
        nature_sin=payload.nature_sin,
        type_sin=payload.type_sin,
        processus=payload.processus,
        montant_total_regle=float(payload.montant_estime),
        duree_jours=jours,
    )
    return DureePredictionResponse(
        jours_estimes=jours,
        modele_utilise=comparaison.meilleur_modele,
        facteurs_explicatifs=get_importances(db),
        dossiers_similaires=similaires,
    )
