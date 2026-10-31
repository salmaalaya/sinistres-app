from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class EvolutionMensuelle(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    mois: str
    montant_total: Decimal
    nombre_reglements: int


class MontantRepartitionItem(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    label: str
    montant: Decimal


class TopReglement(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    sinistre_id: int
    code_sinistre: int
    n_sinistre: str
    montant: Decimal
    date_reglement: date


class DashboardFinancier(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    evolution_mensuelle: list[EvolutionMensuelle]
    repartition_montant_nature: list[MontantRepartitionItem]
    repartition_montant_processus: list[MontantRepartitionItem]
    top_reglements: list[TopReglement]
