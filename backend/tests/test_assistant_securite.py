"""Securite de l'Assistant IA (perimetre prioritaire, voir
TESTS_ET_NOTIFICATIONS_ADDENDUM.md) :

- validate_sql() rejette toute instruction qui n'est pas un simple SELECT ;
- une question qui viserait la table utilisateurs / la colonne password
  n'obtient jamais de donnees sensibles, meme si le LLM generait un SQL qui y
  fait reference ;
- LIMIT 50 est applique meme si le SQL genere par le LLM ne le precise pas,
  et jamais depasse si le LLM demande plus ;
- le compte MySQL dedie assistant_ro (GRANT SELECT uniquement) ne peut pas
  ecrire, meme en contournant le filtre applicatif : verifie contre la vraie
  base (skip si aucune base n'est joignable dans l'environnement courant).
"""

import pytest
from sqlalchemy import text
from sqlalchemy.exc import OperationalError, ProgrammingError

from app.services.assistant_security import MAX_ROWS, SqlRejected, validate_sql


@pytest.mark.parametrize(
    "sql",
    [
        "DROP TABLE sinistres",
        "DELETE FROM sinistres",
        "UPDATE sinistres SET code_sinistre = 1",
        "INSERT INTO sinistres (code_sinistre) VALUES (1)",
        "ALTER TABLE sinistres ADD COLUMN x INT",
        "TRUNCATE TABLE sinistres",
        "GRANT ALL ON sinistres_db.* TO 'x'@'%'",
        "SELECT * FROM sinistres; DROP TABLE sinistres;",
        "CREATE TABLE evil (id INT)",
    ],
)
def test_validate_sql_rejects_non_select(sql):
    with pytest.raises(SqlRejected):
        validate_sql(sql)


def test_validate_sql_accepts_plain_select():
    safe = validate_sql("SELECT code_sinistre FROM sinistres")
    assert safe.upper().startswith("SELECT")
    assert f"LIMIT {MAX_ROWS}" in safe.upper()


def test_validate_sql_rejects_utilisateurs_table():
    with pytest.raises(SqlRejected):
        validate_sql("SELECT * FROM utilisateurs")


def test_validate_sql_rejects_password_column():
    with pytest.raises(SqlRejected):
        validate_sql("SELECT password FROM utilisateurs WHERE username = 'admin'")


def test_validate_sql_adds_limit_when_missing():
    safe = validate_sql("SELECT code_sinistre FROM sinistres")
    assert f"LIMIT {MAX_ROWS}" in safe.upper()


def test_validate_sql_caps_limit_when_llm_requests_more():
    safe = validate_sql("SELECT code_sinistre FROM sinistres LIMIT 5000")
    assert f"LIMIT {MAX_ROWS}" in safe.upper()
    assert "LIMIT 5000" not in safe.upper()


def test_validate_sql_keeps_smaller_limit_untouched():
    safe = validate_sql("SELECT code_sinistre FROM sinistres LIMIT 3")
    assert "LIMIT 3" in safe.upper()


def test_endpoint_never_returns_password_when_llm_targets_utilisateurs(
    client, admin_headers, monkeypatch
):
    """Meme si le LLM (mocke ici) generait un SQL qui interroge la table
    utilisateurs / colonne password, l'API ne doit jamais renvoyer ces
    donnees : le filtre applicatif doit rejeter la requete avant execution."""
    import app.routers.assistant as assistant_router

    monkeypatch.setattr(assistant_router.llm_provider, "is_configured", lambda: True)
    monkeypatch.setattr(
        assistant_router.assistant_llm,
        "generate_sql",
        lambda question, history: "SELECT username, password FROM utilisateurs",
    )

    resp = client.post(
        "/api/assistant/query",
        json={"question": "Quel est le mot de passe de l'admin ?"},
        headers=admin_headers,
    )

    assert resp.status_code == 200
    body = resp.json()
    assert body["sql"] == ""
    assert "password" not in str(body["result"]).lower()
    assert body["result"]["label"] == "Requete refusee"


def _assistant_ro_engine_or_skip():
    from app.services import assistant_db

    try:
        engine = assistant_db._get_engine()
        with engine.connect():
            pass
    except Exception as exc:  # pragma: no cover - environnement sans MySQL
        pytest.skip(f"Base assistant_ro non joignable dans cet environnement : {exc}")
    return engine


def test_assistant_ro_user_cannot_write_even_bypassing_the_app_filter():
    """Verifie le GRANT reel (defense en profondeur), independamment de
    validate_sql() : meme en executant du SQL d'ecriture directement sur la
    connexion assistant_ro, MySQL doit refuser faute de privilege. Le WHERE
    1=0 garantit qu'aucune ligne ne serait affectee meme si le privilege
    etait mal configure."""
    engine = _assistant_ro_engine_or_skip()

    with engine.connect() as conn:
        with pytest.raises((OperationalError, ProgrammingError)):
            conn.execute(text("DELETE FROM sinistres WHERE 1=0"))


def test_assistant_ro_user_can_still_select():
    engine = _assistant_ro_engine_or_skip()

    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1 AS ok"))
        assert result.fetchone()[0] == 1
