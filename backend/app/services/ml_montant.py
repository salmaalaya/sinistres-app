import pandas as pd
from sqlalchemy.orm import Session, selectinload

from app.models.sinistre import Sinistre
from app.schemas.predictions import (
    ComparaisonModeles,
    MontantPredictionRequest,
    MontantPredictionResponse,
)
from app.services import ml_similar
from app.services.ml_common import compare_and_train, compute_importances

CATEGORICAL_COLS = ["nature_sin", "type_sin", "processus"]
NUMERIC_COLS = ["sinistre_ouverture_jours", "ouverture_ordonnancement_jours"]
TARGET_COL = "montant_total_regle"

FEATURE_LABELS = {
    "nature_sin": "Nature du sinistre",
    "type_sin": "Type de sinistre",
    "processus": "Processus",
    "sinistre_ouverture_jours": "Delai sinistre -> ouverture",
    "ouverture_ordonnancement_jours": "Delai ouverture -> ordonnancement",
}

_cache: dict = {}


def _build_dataframe(db: Session) -> pd.DataFrame:
    sinistres = db.query(Sinistre).options(selectinload(Sinistre.reglements)).all()
    rows = [
        {
            "nature_sin": s.nature_sin,
            "type_sin": s.type_sin,
            "processus": s.processus,
            "sinistre_ouverture_jours": (s.date_ouverture - s.date_sinistre).days,
            "ouverture_ordonnancement_jours": (s.date_ordonnancement - s.date_ouverture).days,
            "montant_total_regle": float(s.montant_total_regle),
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


def predict(db: Session, payload: MontantPredictionRequest) -> MontantPredictionResponse:
    comparaison, pipeline = get_or_train(db)
    row = pd.DataFrame(
        [
            {
                "nature_sin": payload.nature_sin,
                "type_sin": payload.type_sin,
                "processus": payload.processus,
                "sinistre_ouverture_jours": payload.sinistre_ouverture_jours,
                "ouverture_ordonnancement_jours": payload.ouverture_ordonnancement_jours,
            }
        ]
    )
    montant = round(max(float(pipeline.predict(row)[0]), 0), 3)
    similaires = ml_similar.find_similar(
        db,
        nature_sin=payload.nature_sin,
        type_sin=payload.type_sin,
        processus=payload.processus,
        montant_total_regle=montant,
    )
    return MontantPredictionResponse(
        montant_estime=montant,
        modele_utilise=comparaison.meilleur_modele,
        facteurs_explicatifs=get_importances(db),
        dossiers_similaires=similaires,
    )
