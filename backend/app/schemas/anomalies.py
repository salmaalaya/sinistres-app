from decimal import Decimal

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class AnomalieDossier(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: int
    code_sinistre: int
    n_sinistre: str
    statut: str
    montant_total_regle: Decimal
    score_anomalie: float
    raisons: list[str]


class AnomaliesPage(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    content: list[AnomalieDossier]
    total_elements: int
    total_pages: int
    number: int
    size: int
    contamination: float
    nombre_dossiers_analyses: int
