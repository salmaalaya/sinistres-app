from app.core.config import settings
from app.services.llm_clients.base import LlmClient

_client: LlmClient | None = None


def label() -> str:
    return "OpenAI" if settings.llm_provider == "openai" else "Gemini"


def is_configured() -> bool:
    if settings.llm_provider == "openai":
        return bool(settings.openai_api_key)
    return bool(settings.gemini_api_key)


def get_client() -> LlmClient:
    """Renvoie le client LLM actif selon settings.llm_provider ("gemini" par
    defaut, "openai" en repli). Change de fournisseur = changer cette seule
    variable (LLM_PROVIDER dans .env) - le reste de l'app (prompt systeme,
    validation SQL, execution read-only) ne depend jamais d'un SDK precis."""
    global _client
    if _client is not None:
        return _client

    if settings.llm_provider == "openai":
        from app.services.llm_clients.openai_client import OpenAiClient

        _client = OpenAiClient()
    else:
        from app.services.llm_clients.gemini_client import GeminiClient

        _client = GeminiClient()
    return _client
