import re

FORBIDDEN_KEYWORDS = [
    "INSERT", "UPDATE", "DELETE", "DROP", "ALTER", "TRUNCATE", "GRANT",
    "REVOKE", "CREATE", "REPLACE", "RENAME", "CALL", "EXEC", "EXECUTE",
    "SET", "LOCK", "UNLOCK", "INTO OUTFILE", "INTO DUMPFILE", "LOAD_FILE",
]

# La table utilisateurs (et sa colonne password) n'est jamais exposee au LLM
# (voir le prompt systeme) ; ce filtre est une seconde ligne de defense au
# cas ou une requete y ferait quand meme reference.
FORBIDDEN_REFERENCES = ["utilisateurs", "password"]

MAX_ROWS = 50


class SqlRejected(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


def _strip_comments(sql: str) -> str:
    sql = re.sub(r"--.*?$", "", sql, flags=re.MULTILINE)
    sql = re.sub(r"/\*.*?\*/", "", sql, flags=re.DOTALL)
    return sql


def validate_sql(sql: str) -> str:
    """Valide une requete SQL generee par le LLM et renvoie une version sure
    a executer (avec LIMIT ajoute si absent). Leve SqlRejected sinon."""
    cleaned = _strip_comments(sql).strip()
    if not cleaned:
        raise SqlRejected("Requete vide.")

    if cleaned.count(";") > 1 or (cleaned.count(";") == 1 and not cleaned.rstrip().endswith(";")):
        raise SqlRejected("Une seule instruction SQL est autorisee.")
    cleaned = cleaned.rstrip(";").strip()

    if not re.match(r"^\s*SELECT\s", cleaned, flags=re.IGNORECASE):
        raise SqlRejected("Je ne peux executer que des requetes de consultation (SELECT).")

    upper = cleaned.upper()
    for kw in FORBIDDEN_KEYWORDS:
        if re.search(rf"\b{re.escape(kw)}\b", upper):
            raise SqlRejected("Je ne peux executer que des requetes de consultation.")

    lower = cleaned.lower()
    for ref in FORBIDDEN_REFERENCES:
        if ref in lower:
            raise SqlRejected("Cette information n'est pas accessible via l'assistant.")

    if not re.search(r"\bLIMIT\s+\d+\b", upper):
        cleaned = f"{cleaned} LIMIT {MAX_ROWS}"
    else:
        cleaned = re.sub(
            r"\bLIMIT\s+(\d+)\b",
            lambda m: f"LIMIT {min(int(m.group(1)), MAX_ROWS)}",
            cleaned,
            flags=re.IGNORECASE,
        )

    return cleaned
