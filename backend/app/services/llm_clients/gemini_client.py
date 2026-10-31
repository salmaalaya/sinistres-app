from google import genai
from google.genai import errors as genai_errors
from google.genai import types

from app.core.config import settings
from app.services.llm_clients.base import LlmAuthError, LlmClient, LlmQuotaError


class GeminiClient(LlmClient):
    def __init__(self) -> None:
        self._client = genai.Client(api_key=settings.gemini_api_key)

    def complete(self, messages: list[dict], temperature: float) -> str:
        system_instruction = None
        contents: list[types.Content] = []
        for m in messages:
            if m["role"] == "system":
                system_instruction = m["content"]
                continue
            role = "model" if m["role"] == "assistant" else "user"
            contents.append(types.Content(role=role, parts=[types.Part(text=m["content"])]))

        try:
            response = self._client.models.generate_content(
                model=settings.gemini_model,
                contents=contents,
                config=types.GenerateContentConfig(
                    system_instruction=system_instruction,
                    temperature=temperature,
                    automatic_function_calling=types.AutomaticFunctionCallingConfig(disable=True),
                ),
            )
        except genai_errors.ClientError as e:
            if e.code in (401, 403):
                raise LlmAuthError(str(e)) from e
            if e.code == 429:
                raise LlmQuotaError(str(e)) from e
            raise
        return response.text or ""
