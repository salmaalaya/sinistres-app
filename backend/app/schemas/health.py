from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class HealthScoreComposantes(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    cloture: float
    delais: float
    anomalies: float
    critiques: float


class HealthScoreResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    score: float
    composantes: HealthScoreComposantes
