from typing import Any, Literal

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class AssistantQueryRequest(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    question: str
    conversation_id: str | None = None


class AssistantQueryResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    answer: str
    sql: str
    result_type: Literal["scalar", "table"]
    result: dict[str, Any]
    conversation_id: str
