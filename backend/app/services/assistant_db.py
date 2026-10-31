import secrets

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine

from app.core.config import settings
from app.core.database import engine as main_engine
from app.services.assistant_security import validate_sql

QUERY_TIMEOUT_SECONDS = 5
ASSISTANT_USER = "assistant_ro"

_engine: Engine | None = None


def _auto_provision_url() -> str:
    """Cree l'utilisateur MySQL/MariaDB read-only dedie a la volee, via la
    connexion applicative principale, si ASSISTANT_DB_URL n'est pas configure.

    Evite toute etape manuelle (developpement local ou premier demarrage
    Docker) : le compte est (re)cree de facon idempotente au premier appel,
    jamais reutilise pour les requetes generees par le LLM autrement que via
    ce role dedie en lecture seule (voir ASSISTANT_IA_SPEC.md).
    """
    password = secrets.token_urlsafe(18)
    db_name = main_engine.url.database
    with main_engine.connect() as conn:
        conn.execute(text(f"DROP USER IF EXISTS '{ASSISTANT_USER}'@'%'"))
        conn.execute(text(f"CREATE USER '{ASSISTANT_USER}'@'%' IDENTIFIED BY '{password}'"))
        conn.execute(text(f"GRANT SELECT ON {db_name}.* TO '{ASSISTANT_USER}'@'%'"))
        conn.execute(text("FLUSH PRIVILEGES"))
        conn.commit()

    host = main_engine.url.host
    port = main_engine.url.port or 3306
    return f"mysql+pymysql://{ASSISTANT_USER}:{password}@{host}:{port}/{db_name}"


def _get_engine() -> Engine:
    global _engine
    if _engine is None:
        url = settings.assistant_db_url or _auto_provision_url()
        _engine = create_engine(url, pool_pre_ping=True)
    return _engine


def execute_readonly_query(raw_sql: str) -> tuple[list[str], list[tuple]]:
    """Valide puis execute une requete SQL sur la connexion read-only dediee.
    Renvoie (colonnes, lignes). Leve SqlRejected si la requete est refusee."""
    safe_sql = validate_sql(raw_sql)

    engine = _get_engine()
    with engine.connect() as conn:
        try:
            conn.execute(text(f"SET SESSION max_statement_time={QUERY_TIMEOUT_SECONDS}"))
        except Exception:
            try:
                conn.execute(text(f"SET SESSION max_execution_time={QUERY_TIMEOUT_SECONDS * 1000}"))
            except Exception:
                pass

        result = conn.execute(text(safe_sql))
        columns = list(result.keys())
        rows = [tuple(row) for row in result.fetchall()]
    return columns, rows
