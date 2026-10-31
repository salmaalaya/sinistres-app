from abc import ABC, abstractmethod


class LlmAuthError(Exception):
    """Cle API invalide, manquante ou expiree chez le fournisseur LLM actif."""


class LlmQuotaError(Exception):
    """Quota ou credit epuise chez le fournisseur LLM actif."""


class LlmClient(ABC):
    """Interface commune a tous les fournisseurs LLM. Le reste de
    l'application (prompt systeme, few-shot, validation SQL, execution
    read-only) ne connait que cette interface, jamais le SDK d'un
    fournisseur en particulier - c'est ce qui permet de rebasculer
    d'OpenAI vers Gemini (ou l'inverse) sans toucher a assistant_llm.py."""

    @abstractmethod
    def complete(self, messages: list[dict], temperature: float) -> str:
        """messages : liste de {"role": "system"|"user"|"assistant", "content": str},
        dans cet ordre. Retourne le texte genere (jamais None)."""
        raise NotImplementedError
