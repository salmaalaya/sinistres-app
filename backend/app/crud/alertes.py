from datetime import date, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.models.sinistre import Sinistre
from app.schemas.alertes import AlerteMotif, DossierAlerte

DEFAULT_SEUIL_JOURS = 90
REGLES_DISPONIBLES = ["delai_depasse", "sans_reglement", "en_attente_quittance", "non_cloture"]
REGLES_PAR_DEFAUT = ["delai_depasse", "sans_reglement", "en_attente_quittance"]


def get_reference_date(db: Session) -> date:
    """Date de reference pour les calculs 'jours ecoules'.

    Ce jeu de donnees est un instantane fige (couverture jan 2021 - juil 2022,
    voir CAHIER_DES_CHARGES.md) : utiliser date.today() ferait exploser les
    delais (des dizaines d'annees). On prend donc la derniere date observee
    dans les donnees comme proxy de "maintenant" pour ce portefeuille.
    """
    max_ouverture = db.query(func.max(Sinistre.date_ouverture)).scalar()
    max_cloture = db.query(func.max(Sinistre.date_cloture_sinistre)).scalar()
    candidates = [d for d in (max_ouverture, max_cloture) if d is not None]
    return max(candidates) if candidates else date.today()


def count_critiques(db: Session, seuil_jours: int = DEFAULT_SEUIL_JOURS) -> int:
    reference = get_reference_date(db)
    cutoff = reference - timedelta(days=seuil_jours)
    return (
        db.query(func.count(Sinistre.id))
        .filter(Sinistre.date_cloture_sinistre.is_(None), Sinistre.date_ouverture < cutoff)
        .scalar()
        or 0
    )


def _motifs_pour_dossier(s: Sinistre, jours_ouverture: int, seuil_jours: int, regles: list[str]) -> list[AlerteMotif]:
    motifs = []
    if "delai_depasse" in regles and jours_ouverture > seuil_jours:
        motifs.append(
            AlerteMotif(
                code="delai_depasse",
                texte=f"Delai de traitement depasse : {jours_ouverture} jours (seuil {seuil_jours}j)",
            )
        )
    if "sans_reglement" in regles and not s.reglements:
        motifs.append(AlerteMotif(code="sans_reglement", texte="Aucun reglement enregistre"))
    if "en_attente_quittance" in regles and s.date_retour_quittance_signe is None:
        motifs.append(AlerteMotif(code="en_attente_quittance", texte="En attente de quittance signee"))
    if "non_cloture" in regles:
        motifs.append(AlerteMotif(code="non_cloture", texte="Dossier non cloture"))
    return motifs


def get_alertes(
    db: Session,
    *,
    seuil_jours: int = DEFAULT_SEUIL_JOURS,
    regles: list[str] | None = None,
    page: int = 0,
    size: int = 20,
) -> tuple[list[DossierAlerte], int, int]:
    regles = [r for r in (regles or REGLES_PAR_DEFAUT) if r in REGLES_DISPONIBLES] or REGLES_PAR_DEFAUT
    reference = get_reference_date(db)

    sinistres = (
        db.query(Sinistre)
        .options(selectinload(Sinistre.reglements))
        .filter(Sinistre.date_cloture_sinistre.is_(None))
        .all()
    )

    dossiers = []
    for s in sinistres:
        jours_ouverture = (reference - s.date_ouverture).days
        motifs = _motifs_pour_dossier(s, jours_ouverture, seuil_jours, regles)
        if motifs:
            dossiers.append(
                DossierAlerte(
                    id=s.id,
                    code_sinistre=s.code_sinistre,
                    n_sinistre=s.n_sinistre,
                    statut=s.statut,
                    date_ouverture=s.date_ouverture,
                    jours_ouverture=jours_ouverture,
                    motifs=motifs,
                )
            )

    dossiers.sort(key=lambda d: d.jours_ouverture, reverse=True)

    total_elements = len(dossiers)
    total_pages = -(-total_elements // size) if total_elements else 0
    start = page * size
    page_items = dossiers[start : start + size]
    return page_items, total_elements, total_pages
