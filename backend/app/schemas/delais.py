from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class DelaiStat(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    moyenne: float | None
    mediane: float | None
    minimum: float | None
    maximum: float | None
    nombre_dossiers: int


class DelaisStatsResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    sinistre_ouverture: DelaiStat
    ouverture_ordonnancement: DelaiStat
    ordonnancement_reglement: DelaiStat
    ouverture_cloture: DelaiStat
    seuil_critique_cloture_jours: int


class SinistreDelai(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: int
    code_sinistre: int
    n_sinistre: str
    statut: str
    sinistre_ouverture_jours: int | None
    ouverture_ordonnancement_jours: int | None
    ordonnancement_reglement_jours: float | None
    ouverture_cloture_jours: int | None


class SinistresDelaisPage(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    content: list[SinistreDelai]
    total_elements: int
    total_pages: int
    number: int
    size: int


class TrancheHistogramme(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    tranche: str
    nombre_dossiers: int


class GestionnaireScore(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    gestionnaire_id: int
    nom_complet: str
    nombre_dossiers: int
    score_moyen: float
