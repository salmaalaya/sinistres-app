from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class FacteurExplicatif(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    feature: str
    importance_pct: float


class DossierSimilaire(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: int
    code_sinistre: int
    n_sinistre: str
    nature_sin: str
    type_sin: str
    processus: str
    montant_total_regle: Decimal
    duree_jours: int
    date_cloture_sinistre: date
    similarite_pct: float


class ModeleMetrics(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    mae: float
    rmse: float
    r2: float


class ComparaisonModeles(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    resultats: dict[str, ModeleMetrics]
    meilleur_modele: str
    nombre_dossiers_entrainement: int


class DureePredictionRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    nature_sin: str
    type_sin: str
    processus: str
    montant_estime: Decimal
    date_ouverture: date


class DureePredictionResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    jours_estimes: float
    modele_utilise: str
    facteurs_explicatifs: list[FacteurExplicatif] = []
    dossiers_similaires: list[DossierSimilaire] = []


class MontantPredictionRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    nature_sin: str
    type_sin: str
    processus: str
    sinistre_ouverture_jours: int
    ouverture_ordonnancement_jours: int


class MontantPredictionResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    montant_estime: float
    modele_utilise: str
    facteurs_explicatifs: list[FacteurExplicatif] = []
    dossiers_similaires: list[DossierSimilaire] = []
