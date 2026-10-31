from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class ScoreDossier(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: int
    code_sinistre: int
    n_sinistre: str
    statut: str
    score: float
    classement: str


class ScoresPage(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    content: list[ScoreDossier]
    total_elements: int
    total_pages: int
    number: int
    size: int


class ScoresDistribution(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    excellent: int
    bon: int
    moyen: int
    critique: int
    score_moyen: float
