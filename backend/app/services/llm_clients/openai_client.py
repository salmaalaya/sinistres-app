import openai
from openai import OpenAI

from app.core.config import settings
from app.services.llm_clients.base import LlmAuthError, LlmClient, LlmQuotaError


class OpenAiClient(LlmClient):
    def __init__(self) -> None:
        self._client = OpenAI(api_key=settings.openai_api_key)

    def complete(self, messages: list[dict], temperature: float) -> str:
        try:
            response = self._client.chat.completions.create(
                model=settings.assistant_model, messages=messages, temperature=temperature
            )
        except openai.AuthenticationError as e:
            raise LlmAuthError(str(e)) from e
        except openai.RateLimitError as e:
            raise LlmQuotaError(str(e)) from e
        return response.choices[0].message.content or ""
