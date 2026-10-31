from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from app.schemas.reglement import ReglementResponse


class SinistreBase(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    code_sinistre: int
    n_sinistre: str
    date_sinistre: date
    date_ouverture: date
    date_cloture_sinistre: date | None = None
    nature_sin: str
    type_sin: str
    date_retour_quittance_signe: date | None = None
    date_ordonnancement: date
    processus: str = "Processus Standard"


class SinistreCreate(SinistreBase):
    pass


class SinistreUpdate(SinistreBase):
    pass


class SinistreResponse(SinistreBase):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)

    id: int
    statut: str
    montant_total_regle: Decimal
    gestionnaire_nom_complet: str | None = None
    reglements: list[ReglementResponse] = []


class PageResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    content: list[SinistreResponse]
    total_elements: int
    total_pages: int
    number: int
    size: int
