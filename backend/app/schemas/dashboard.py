from decimal import Decimal

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class RepartitionItem(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    label: str
    value: int


class DelaisMoyens(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    sinistre_ouverture_jours: float | None
    ouverture_ordonnancement_jours: float | None
    ordonnancement_reglement_jours: float | None
    ouverture_cloture_jours: float | None
    seuil_critique_cloture_jours: int


class SinistreRecent(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: int
    code_sinistre: int
    n_sinistre: str
    nature_sin: str
    date_ouverture: str
    statut: str
    montant_total_regle: Decimal


class DashboardKpis(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    total_sinistres: int
    dossiers_ouverts: int
    dossiers_clotures: int
    pct_cloture: float
    montant_total_regle: Decimal
    montant_moyen_regle: Decimal
    nombre_dossiers_express: int
    dossiers_critiques: int
    nombre_anomalies: int
    delais_moyens: DelaisMoyens
    repartition_nature: list[RepartitionItem]
    repartition_type: list[RepartitionItem]
    repartition_processus: list[RepartitionItem]
    dossiers_recents: list[SinistreRecent]
