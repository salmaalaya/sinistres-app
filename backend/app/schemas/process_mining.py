from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class TransitionProcessus(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    source: str
    cible: str
    frequence: int
    duree_moyenne_jours: float
    goulet: bool


class ProcessMiningResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    etapes: list[str]
    transitions: list[TransitionProcessus]
    etape_la_plus_lente: str
    nombre_dossiers_analyses: int
