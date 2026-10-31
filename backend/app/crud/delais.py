import statistics

from sqlalchemy.orm import Session, selectinload

from app.models.sinistre import Sinistre
from app.schemas.delais import DelaiStat, DelaisStatsResponse, SinistreDelai, TrancheHistogramme

SEUIL_CRITIQUE_CLOTURE_JOURS = 90

TRANCHES = [
    ("0-30j", 0, 30),
    ("31-60j", 31, 60),
    ("61-90j", 61, 90),
    ("91-120j", 91, 120),
    (">120j", 121, None),
]

SORT_KEYS = {
    "sinistreOuverture": lambda d: d.sinistre_ouverture_jours,
    "ouvertureOrdonnancement": lambda d: d.ouverture_ordonnancement_jours,
    "ordonnancementReglement": lambda d: d.ordonnancement_reglement_jours,
    "ouvertureCloture": lambda d: d.ouverture_cloture_jours,
}


def _stat(values: list[float]) -> DelaiStat:
    if not values:
        return DelaiStat(moyenne=None, mediane=None, minimum=None, maximum=None, nombre_dossiers=0)
    return DelaiStat(
        moyenne=round(statistics.mean(values), 1),
        mediane=round(statistics.median(values), 1),
        minimum=round(min(values), 1),
        maximum=round(max(values), 1),
        nombre_dossiers=len(values),
    )


def _compute_dossier_delais(sinistres: list[Sinistre]) -> list[SinistreDelai]:
    items = []
    for s in sinistres:
        sinistre_ouverture = (s.date_ouverture - s.date_sinistre).days
        ouverture_ordonnancement = (s.date_ordonnancement - s.date_ouverture).days
        ouverture_cloture = (
            (s.date_cloture_sinistre - s.date_ouverture).days if s.date_cloture_sinistre else None
        )
        reg_delays = [(r.date_reglement - s.date_ordonnancement).days for r in s.reglements]
        ordonnancement_reglement = round(sum(reg_delays) / len(reg_delays), 1) if reg_delays else None

        items.append(
            SinistreDelai(
                id=s.id,
                code_sinistre=s.code_sinistre,
                n_sinistre=s.n_sinistre,
                statut=s.statut,
                sinistre_ouverture_jours=sinistre_ouverture,
                ouverture_ordonnancement_jours=ouverture_ordonnancement,
                ordonnancement_reglement_jours=ordonnancement_reglement,
                ouverture_cloture_jours=ouverture_cloture,
            )
        )
    return items


def get_stats(db: Session) -> DelaisStatsResponse:
    sinistres = db.query(Sinistre).options(selectinload(Sinistre.reglements)).all()
    dossiers = _compute_dossier_delais(sinistres)

    return DelaisStatsResponse(
        sinistre_ouverture=_stat([d.sinistre_ouverture_jours for d in dossiers]),
        ouverture_ordonnancement=_stat([d.ouverture_ordonnancement_jours for d in dossiers]),
        ordonnancement_reglement=_stat(
            [d.ordonnancement_reglement_jours for d in dossiers if d.ordonnancement_reglement_jours is not None]
        ),
        ouverture_cloture=_stat(
            [d.ouverture_cloture_jours for d in dossiers if d.ouverture_cloture_jours is not None]
        ),
        seuil_critique_cloture_jours=SEUIL_CRITIQUE_CLOTURE_JOURS,
    )


def get_dossiers_delais(
    db: Session, *, sort_by: str = "ouvertureCloture", page: int = 0, size: int = 20
) -> tuple[list[SinistreDelai], int, int]:
    sinistres = db.query(Sinistre).options(selectinload(Sinistre.reglements)).all()
    dossiers = _compute_dossier_delais(sinistres)

    keyfn = SORT_KEYS.get(sort_by, SORT_KEYS["ouvertureCloture"])
    dossiers.sort(key=lambda d: (keyfn(d) is not None, keyfn(d) or -1), reverse=True)

    total_elements = len(dossiers)
    total_pages = -(-total_elements // size) if total_elements else 0
    start = page * size
    page_items = dossiers[start : start + size]
    return page_items, total_elements, total_pages


def get_histogramme_cloture(db: Session) -> list[TrancheHistogramme]:
    sinistres = db.query(Sinistre).options(selectinload(Sinistre.reglements)).all()
    dossiers = _compute_dossier_delais(sinistres)
    valeurs = [d.ouverture_cloture_jours for d in dossiers if d.ouverture_cloture_jours is not None]

    resultat = []
    for label, borne_min, borne_max in TRANCHES:
        if borne_max is None:
            count = sum(1 for v in valeurs if v >= borne_min)
        else:
            count = sum(1 for v in valeurs if borne_min <= v <= borne_max)
        resultat.append(TrancheHistogramme(tranche=label, nombre_dossiers=count))
    return resultat
