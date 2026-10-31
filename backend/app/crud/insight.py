"""Insight automatique du jour (INTERACTIONS_DYNAMIQUES_ADDENDUM.md, point 5).

Calcule plusieurs comparaisons reelles sur les donnees et ne retient que celle
dont l'ecart relatif est le plus marquant. Ne renvoie jamais de phrase
generique : si aucune comparaison n'a de signal notable, renvoie None.
Mis en cache en memoire process (voir app/services/process_mining.py pour le
meme pattern) - le jeu de donnees est un instantane fige, pas besoin de
recalculer a chaque requete.
"""

from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.models.reglement import Reglement
from app.models.sinistre import Sinistre

EXPRESS = "Processus Express"
STANDARD = "Processus Standard"

MIN_ECHANTILLON = 10
SEUIL_SIGNAL = 0.05  # ecart relatif minimal pour etre juge "notable"

MOIS_FR = {
    "01": "janvier", "02": "fevrier", "03": "mars", "04": "avril",
    "05": "mai", "06": "juin", "07": "juillet", "08": "aout",
    "09": "septembre", "10": "octobre", "11": "novembre", "12": "decembre",
}

_cache: dict = {}


def _mois_label(annee_mois: str) -> str:
    annee, mois = annee_mois.split("-")
    return f"{MOIS_FR.get(mois, mois)} {annee}"


def _comparaison_express_standard(db: Session):
    rows = (
        db.query(
            Sinistre.processus,
            func.avg(func.datediff(Sinistre.date_cloture_sinistre, Sinistre.date_ouverture)),
            func.count(Sinistre.id),
        )
        .filter(Sinistre.date_cloture_sinistre.isnot(None))
        .filter(Sinistre.processus.in_([EXPRESS, STANDARD]))
        .group_by(Sinistre.processus)
        .all()
    )
    delais = {p: (float(avg), count) for p, avg, count in rows if avg is not None}
    if EXPRESS not in delais or STANDARD not in delais:
        return None
    (express_avg, express_n), (standard_avg, standard_n) = delais[EXPRESS], delais[STANDARD]
    if express_n < MIN_ECHANTILLON or standard_n < MIN_ECHANTILLON:
        return None

    plus_rapide, plus_lent = (EXPRESS, STANDARD) if express_avg < standard_avg else (STANDARD, EXPRESS)
    rapide_avg, lent_avg = min(express_avg, standard_avg), max(express_avg, standard_avg)
    ecart = (lent_avg - rapide_avg) / lent_avg if lent_avg else 0

    texte = (
        f"Les dossiers en {plus_rapide.lower()} se cloturent en moyenne "
        f"{rapide_avg:.0f} jours, contre {lent_avg:.0f} jours pour le {plus_lent.lower()}."
    )
    return texte, ecart


def _comparaison_nature_montant(db: Session):
    rows = (
        db.query(Sinistre.nature_sin, func.avg(Reglement.montant_reglement), func.count(Reglement.id))
        .join(Reglement, Reglement.sinistre_id == Sinistre.id)
        .group_by(Sinistre.nature_sin)
        .all()
    )
    valides = [(nat, float(avg), n) for nat, avg, n in rows if n >= MIN_ECHANTILLON]
    if len(valides) < 2:
        return None

    valides.sort(key=lambda x: x[1], reverse=True)
    top_nature, top_avg, _ = valides[0]
    autres_avg = sum(avg for _, avg, _ in valides[1:]) / len(valides[1:])
    if autres_avg <= 0:
        return None
    ecart = (top_avg - autres_avg) / autres_avg

    texte = (
        f"Les sinistres de nature {top_nature} ont le montant de reglement moyen le plus eleve : "
        f"{top_avg:,.0f} DT, contre {autres_avg:,.0f} DT en moyenne pour les autres natures."
    ).replace(",", " ")
    return texte, ecart


def _comparaison_mois_clotures(db: Session):
    mois_expr = func.date_format(Sinistre.date_cloture_sinistre, "%Y-%m")
    rows = (
        db.query(mois_expr.label("mois"), func.count(Sinistre.id))
        .filter(Sinistre.date_cloture_sinistre.isnot(None))
        .group_by("mois")
        .all()
    )
    if len(rows) < 2:
        return None

    counts = [c for _, c in rows]
    moyenne = sum(counts) / len(counts)
    if moyenne <= 0:
        return None
    top_mois, top_count = max(rows, key=lambda r: r[1])
    ecart = (top_count - moyenne) / moyenne

    texte = (
        f"{_mois_label(top_mois).capitalize()} a enregistre le plus de clotures : "
        f"{top_count} dossiers, contre {moyenne:.0f} en moyenne par mois."
    )
    return texte, ecart


def _comparaison_processus_taux_cloture(db: Session):
    rows = (
        db.query(
            Sinistre.processus,
            func.count(Sinistre.id),
            func.sum(case((Sinistre.date_cloture_sinistre.isnot(None), 1), else_=0)),
        )
        .group_by(Sinistre.processus)
        .all()
    )
    taux = [(p, (clotures / total * 100) if total else 0, total) for p, total, clotures in rows]
    valides = [(p, t, n) for p, t, n in taux if n >= MIN_ECHANTILLON]
    if len(valides) < 2:
        return None

    valides.sort(key=lambda x: x[1], reverse=True)
    top_processus, top_taux, _ = valides[0]
    autres_taux = sum(t for _, t, _ in valides[1:]) / len(valides[1:])
    if autres_taux <= 0:
        return None
    ecart = (top_taux - autres_taux) / autres_taux

    texte = (
        f"Le {top_processus.lower()} affiche le meilleur taux de cloture : {top_taux:.0f}%, "
        f"contre {autres_taux:.0f}% en moyenne pour les autres processus."
    )
    return texte, ecart


def get_insight_du_jour(db: Session) -> str | None:
    if "texte" in _cache:
        return _cache["texte"]

    candidats = [
        _comparaison_express_standard(db),
        _comparaison_nature_montant(db),
        _comparaison_mois_clotures(db),
        _comparaison_processus_taux_cloture(db),
    ]
    candidats = [c for c in candidats if c is not None and c[1] >= SEUIL_SIGNAL]

    texte = max(candidats, key=lambda c: c[1])[0] if candidats else None
    _cache["texte"] = texte
    return texte
