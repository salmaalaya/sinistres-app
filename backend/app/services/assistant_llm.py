from app.services import llm_provider

SCHEMA_DESCRIPTION = """
Tables disponibles (lecture seule uniquement) :

sinistres (
  id INT, code_sinistre INT UNIQUE, n_sinistre VARCHAR(20),
  date_sinistre DATE, date_ouverture DATE, date_cloture_sinistre DATE NULL,
  nature_sin VARCHAR(5)  -- 'F', 'D' ou 'R'
  type_sin VARCHAR(5)    -- 'M' ou 'C'
  date_retour_quittance_signe DATE NULL, date_ordonnancement DATE,
  processus VARCHAR(50)  -- 'Processus Standard' ou 'Processus Express'
)
-- Un dossier est CLOTURE si date_cloture_sinistre IS NOT NULL, sinon OUVERT
-- (ce statut n'est jamais stocke, toujours calcule a partir de cette colonne).

reglements (
  id INT, sinistre_id INT REFERENCES sinistres(id),
  montant_reglement DECIMAL(15,3), date_reglement DATE
)
-- Un sinistre peut avoir plusieurs reglements : jointure sur
-- reglements.sinistre_id = sinistres.id

Aucune autre table n'est accessible (en particulier pas de table utilisateurs).
"""

FEW_SHOT = [
    (
        "Affiche les dossiers ouverts depuis plus de 60 jours",
        "SELECT code_sinistre, n_sinistre, date_ouverture FROM sinistres "
        "WHERE date_cloture_sinistre IS NULL AND DATEDIFF(CURDATE(), date_ouverture) > 60 "
        "ORDER BY date_ouverture ASC",
    ),
    (
        "Quels sont les dossiers Express non clotures ?",
        "SELECT code_sinistre, n_sinistre, date_ouverture FROM sinistres "
        "WHERE processus = 'Processus Express' AND date_cloture_sinistre IS NULL",
    ),
    (
        "Combien de dossiers ont ete regles ce mois-ci ?",
        "SELECT COUNT(DISTINCT r.sinistre_id) FROM reglements r "
        "WHERE YEAR(r.date_reglement) = YEAR(CURDATE()) AND MONTH(r.date_reglement) = MONTH(CURDATE())",
    ),
    (
        "Quel est le montant total paye en mars ?",
        "SELECT SUM(montant_reglement) FROM reglements WHERE MONTH(date_reglement) = 3",
    ),
    (
        "Quels sont les 5 dossiers avec le delai de cloture le plus long ?",
        "SELECT code_sinistre, n_sinistre, DATEDIFF(date_cloture_sinistre, date_ouverture) AS delai_jours "
        "FROM sinistres WHERE date_cloture_sinistre IS NOT NULL "
        "ORDER BY delai_jours DESC LIMIT 5",
    ),
]

SYSTEM_PROMPT = (
    "Tu es un assistant qui traduit des questions en francais sur la base "
    "sinistres_db (assurance BIAT) en requetes SQL MySQL strictement en "
    "LECTURE SEULE.\n\n"
    "Regles non negociables :\n"
    "- Tu ne generes QUE des requetes SELECT, jamais INSERT/UPDATE/DELETE/"
    "DROP/ALTER/TRUNCATE/GRANT ni aucune autre commande de modification.\n"
    "- Tu n'acceders jamais a une table autre que sinistres et reglements.\n"
    "- Reponds UNIQUEMENT avec la requete SQL brute : pas d'explication, pas "
    "de markdown, pas de point-virgule final.\n\n"
    f"Schema :\n{SCHEMA_DESCRIPTION}\n"
    "Exemples :\n" + "\n".join(f"Q: {q}\nSQL: {sql}" for q, sql in FEW_SHOT)
)

ANSWER_SYSTEM_PROMPT = (
    "Tu formules une reponse claire et concise en francais a partir d'un "
    "resultat de requete SQL sur des donnees d'assurance. Reponds "
    "directement en une ou deux phrases avec les chiffres exacts, sans "
    "markdown, sans repeter la requete SQL."
)


def _clean_sql(raw: str) -> str:
    sql = raw.strip()
    if sql.startswith("```"):
        sql = sql.strip("`")
        if sql.lower().startswith("sql"):
            sql = sql[3:]
    return sql.strip().strip(";").strip()


def generate_sql(question: str, history: list[dict]) -> str:
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for h in history[-4:]:
        messages.append({"role": "user", "content": h["question"]})
        messages.append({"role": "assistant", "content": h["sql"]})
    messages.append({"role": "user", "content": question})

    raw = llm_provider.get_client().complete(messages, temperature=0)
    return _clean_sql(raw)


def generate_answer(question: str, columns: list[str], rows: list[tuple]) -> str:
    if not rows:
        result_text = "(aucun resultat)"
    else:
        preview = rows[:20]
        result_text = ", ".join(columns) + "\n" + "\n".join(str(r) for r in preview)

    messages = [
        {"role": "system", "content": ANSWER_SYSTEM_PROMPT},
        {
            "role": "user",
            "content": f"Question : {question}\nColonnes : {columns}\n"
            f"Resultat ({len(rows)} ligne(s)) :\n{result_text}",
        },
    ]
    raw = llm_provider.get_client().complete(messages, temperature=0.3)
    return raw.strip()
