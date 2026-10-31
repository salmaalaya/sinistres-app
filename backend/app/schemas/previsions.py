from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class PointPrevision(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    mois: str
    valeur: float
    borne_basse: float | None
    borne_haute: float | None
    type: str  # "historique" | "backtest" | "prevision"


class SeriePrevision(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    points: list[PointPrevision]
    modele: str
    mape_backtest: float | None
    nombre_mois_historique: int
    instable: bool
    message_instabilite: str | None


class PrevisionsResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    nombre_sinistres: SeriePrevision
    montant_total: SeriePrevision
