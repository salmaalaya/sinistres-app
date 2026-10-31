import statistics

from sqlalchemy.orm import Session, selectinload

from app.crud.alertes import get_reference_date
from app.models.sinistre import Sinistre
from app.schemas.delais import GestionnaireScore
from app.schemas.scores import ScoreDossier, ScoresDistribution

# Ponderation : la cloture (issue finale du dossier) pese le plus, suivie du
# delai de reglement, puis de la rapidite d'ouverture du dossier.
POIDS_RAPIDITE = 0.25
POIDS_REGLEMENT = 0.35
POIDS_CLOTURE = 0.40


def _percentile(sorted_vals: list[float], pct: float) -> float:
    if not sorted_vals:
        return 0.0
    idx = min(len(sorted_vals) - 1, max(0, round(pct / 100 * (len(sorted_vals) - 1))))
    return sorted_vals[idx]


def _subscore(value: float, p10: float, p90: float) -> float:
    if p90 <= p10:
        return 100.0
    pct = (value - p10) / (p90 - p10)
    pct = min(max(pct, 0.0), 1.0)
    return round((1 - pct) * 100, 1)


def _classement(score: float) -> str:
    if score >= 85:
        return "Excellent"
    if score >= 65:
        return "Bon"
    if score >= 40:
        return "Moyen"
    return "Critique"


def _compute_scored_sinistres(db: Session) -> list[tuple[Sinistre, float]]:
    sinistres = (
        db.query(Sinistre)
        .options(selectinload(Sinistre.reglements), selectinload(Sinistre.gestionnaire))
        .all()
    )
    reference = get_reference_date(db)

    raw = []
    for s in sinistres:
        rapidite = (s.date_ouverture - s.date_sinistre).days
        reg_delays = [(r.date_reglement - s.date_ordonnancement).days for r in s.reglements]
        reglement = sum(reg_delays) / len(reg_delays) if reg_delays else 0.0
        cloture = (
            (s.date_cloture_sinistre - s.date_ouverture).days
            if s.date_cloture_sinistre
            else (reference - s.date_ouverture).days
        )
        raw.append((s, rapidite, reglement, cloture))

    rapidites = sorted(r[1] for r in raw)
    reglements = sorted(r[2] for r in raw)
    clotures = sorted(r[3] for r in raw)
    p10_r, p90_r = _percentile(rapidites, 10), _percentile(rapidites, 90)
    p10_g, p90_g = _percentile(reglements, 10), _percentile(reglements, 90)
    p10_c, p90_c = _percentile(clotures, 10), _percentile(clotures, 90)

    results = []
    for s, rapidite, reglement, cloture in raw:
        score = round(
            POIDS_RAPIDITE * _subscore(rapidite, p10_r, p90_r)
            + POIDS_REGLEMENT * _subscore(reglement, p10_g, p90_g)
            + POIDS_CLOTURE * _subscore(cloture, p10_c, p90_c),
            1,
        )
        results.append((s, score))
    return results


def _compute_all(db: Session) -> list[ScoreDossier]:
    return [
        ScoreDossier(
            id=s.id,
            code_sinistre=s.code_sinistre,
            n_sinistre=s.n_sinistre,
            statut=s.statut,
            score=score,
            classement=_classement(score),
        )
        for s, score in _compute_scored_sinistres(db)
    ]


def get_classement_gestionnaires(db: Session) -> list[GestionnaireScore]:
    """Classement des gestionnaires par score moyen des dossiers qui leur sont
    assignes. Renvoie une liste vide si aucun dossier n'a de gestionnaire
    assigne (le formulaire CRUD ne gere pas encore cette affectation) - c'est
    l'etat reel des donnees, pas une erreur a masquer."""
    scored = _compute_scored_sinistres(db)
    par_gestionnaire: dict[int, list[float]] = {}
    noms: dict[int, str] = {}

    for s, score in scored:
        if s.gestionnaire is None:
            continue
        par_gestionnaire.setdefault(s.gestionnaire_id, []).append(score)
        noms[s.gestionnaire_id] = f"{s.gestionnaire.prenom} {s.gestionnaire.nom}"

    classement = [
        GestionnaireScore(
            gestionnaire_id=gid,
            nom_complet=noms[gid],
            nombre_dossiers=len(scores),
            score_moyen=round(statistics.mean(scores), 1),
        )
        for gid, scores in par_gestionnaire.items()
    ]
    classement.sort(key=lambda g: g.score_moyen, reverse=True)
    return classement


def get_scores_page(
    db: Session, *, page: int = 0, size: int = 20, sort_desc: bool = False
) -> tuple[list[ScoreDossier], int, int]:
    results = _compute_all(db)
    results.sort(key=lambda r: r.score, reverse=sort_desc)
    total_elements = len(results)
    total_pages = -(-total_elements // size) if total_elements else 0
    start = page * size
    return results[start : start + size], total_elements, total_pages


def get_distribution(db: Session) -> ScoresDistribution:
    results = _compute_all(db)
    counts = {"Excellent": 0, "Bon": 0, "Moyen": 0, "Critique": 0}
    for r in results:
        counts[r.classement] += 1
    moyenne = round(statistics.mean(r.score for r in results), 1) if results else 0.0
    return ScoresDistribution(
        excellent=counts["Excellent"],
        bon=counts["Bon"],
        moyen=counts["Moyen"],
        critique=counts["Critique"],
        score_moyen=moyenne,
    )
