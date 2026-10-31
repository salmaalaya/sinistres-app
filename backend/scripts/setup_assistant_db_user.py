"""Cree l'utilisateur MySQL dedie en lecture seule pour l'Assistant IA.

Le compte applicatif principal (root, utilise par app/core/database.py) n'est
jamais utilise pour executer les requetes SQL generees par le LLM - voir
ASSISTANT_IA_SPEC.md. Ce script cree 'assistant_ro'@'%' avec GRANT SELECT
uniquement, genere un mot de passe aleatoire, et l'ecrit dans .env.

Usage :
    .venv/Scripts/python.exe scripts/setup_assistant_db_user.py
"""

import secrets
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pymysql

from app.core.config import settings

ASSISTANT_USER = "assistant_ro"


def parse_db_url(url: str) -> dict:
    # mysql+pymysql://user:password@host:port/dbname
    rest = url.split("://", 1)[1]
    creds, hostpart = rest.split("@", 1)
    user = creds.split(":", 1)[0]
    hostport, dbname = hostpart.split("/", 1)
    host, port = (hostport.split(":", 1) + ["3306"])[:2]
    return {"user": user, "host": host, "port": int(port), "database": dbname}


def main():
    cfg = parse_db_url(settings.database_url)
    password = secrets.token_urlsafe(18)

    conn = pymysql.connect(host=cfg["host"], port=cfg["port"], user=cfg["user"], password="")
    cur = conn.cursor()
    # pymysql only performs %-substitution when an args tuple is passed to
    # execute(); mixing that with literal '%' in the SQL string (MySQL's
    # wildcard host syntax) requires care not to double-escape inconsistently
    # between statements. password is a securely generated urlsafe token with
    # no SQL-special characters, so it's safe to inline directly here.
    cur.execute(f"DROP USER IF EXISTS '{ASSISTANT_USER}'@'%'")
    cur.execute(f"CREATE USER '{ASSISTANT_USER}'@'%' IDENTIFIED BY '{password}'")
    cur.execute(f"GRANT SELECT ON {cfg['database']}.* TO '{ASSISTANT_USER}'@'%'")
    cur.execute("FLUSH PRIVILEGES")
    conn.commit()
    conn.close()

    env_path = Path(__file__).resolve().parent.parent / ".env"
    lines = env_path.read_text(encoding="utf-8").splitlines()
    lines = [ln for ln in lines if not ln.startswith("ASSISTANT_DB_URL=")]
    lines.append(
        f"ASSISTANT_DB_URL=mysql+pymysql://{ASSISTANT_USER}:{password}@{cfg['host']}:{cfg['port']}/{cfg['database']}"
    )
    env_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    print(f"Utilisateur '{ASSISTANT_USER}' cree avec GRANT SELECT uniquement sur {cfg['database']}.")
    print("ASSISTANT_DB_URL ecrit dans .env")


if __name__ == "__main__":
    main()
