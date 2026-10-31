import uuid

from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.schemas.assistant import AssistantQueryRequest, AssistantQueryResponse
from app.services import assistant_llm, llm_provider
from app.services.assistant_db import execute_readonly_query
from app.services.assistant_security import SqlRejected
from app.services.llm_clients.base import LlmAuthError, LlmQuotaError

router = APIRouter(prefix="/api/assistant", tags=["assistant"], dependencies=[Depends(get_current_user)])

# Historique conversationnel court terme (3-4 derniers echanges), en memoire
# process - suffisant pour le contexte d'une session de chat, pas persiste.
_conversation_history: dict[str, list[dict]] = {}


def _not_configured_response(conversation_id: str) -> AssistantQueryResponse:
    return AssistantQueryResponse(
        answer=(
            "Assistant IA non configure : aucune cle API n'est renseignee cote "
            "serveur pour le fournisseur actif (GEMINI_API_KEY ou OPENAI_API_KEY "
            "dans backend/.env, selon LLM_PROVIDER)."
        ),
        sql="",
        result_type="scalar",
        result={"value": None, "label": "Non configure"},
        conversation_id=conversation_id,
    )


@router.post("/query", response_model=AssistantQueryResponse)
def query(payload: AssistantQueryRequest):
    conversation_id = payload.conversation_id or str(uuid.uuid4())

    if not llm_provider.is_configured():
        return _not_configured_response(conversation_id)

    history = _conversation_history.get(conversation_id, [])
    sql = ""

    try:
        sql = assistant_llm.generate_sql(payload.question, history)
        columns, rows = execute_readonly_query(sql)
    except SqlRejected as e:
        return AssistantQueryResponse(
            answer=e.message,
            sql="",
            result_type="scalar",
            result={"value": None, "label": "Requete refusee"},
            conversation_id=conversation_id,
        )
    except LlmAuthError:
        return AssistantQueryResponse(
            answer=(
                "La cle API configuree cote serveur pour le fournisseur actif "
                f"({llm_provider.label()}) est invalide ou expiree."
            ),
            sql="",
            result_type="scalar",
            result={"value": None, "label": "Cle API invalide"},
            conversation_id=conversation_id,
        )
    except LlmQuotaError:
        return AssistantQueryResponse(
            answer=(
                f"Le compte {llm_provider.label()} associe a la cle API n'a plus de "
                "credit ou quota disponible. Rechargez le compte pour reactiver "
                "l'assistant."
            ),
            sql="",
            result_type="scalar",
            result={"value": None, "label": "Quota epuise"},
            conversation_id=conversation_id,
        )
    except Exception:
        return AssistantQueryResponse(
            answer="Je n'ai pas pu executer cette requete. Essayez de reformuler votre question.",
            sql=sql,
            result_type="scalar",
            result={"value": None, "label": "Erreur"},
            conversation_id=conversation_id,
        )

    answer = assistant_llm.generate_answer(payload.question, columns, rows)

    if len(columns) == 1 and len(rows) == 1:
        result_type = "scalar"
        result = {"value": rows[0][0], "label": columns[0]}
    else:
        result_type = "table"
        result = {"columns": columns, "rows": [list(r) for r in rows]}

    history.append({"question": payload.question, "sql": sql})
    _conversation_history[conversation_id] = history[-4:]

    return AssistantQueryResponse(
        answer=answer, sql=sql, result_type=result_type, result=result, conversation_id=conversation_id
    )
