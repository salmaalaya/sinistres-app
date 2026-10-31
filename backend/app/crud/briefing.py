from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.crud.alertes import DEFAULT_SEUIL_JOURS, count_critiques, get_reference_date
from app.crud.anomalies import detect_anomalies
from app.models.reglement import Reglement
from app.models.sinistre import Sinistre
from app.models.utilisateur import Utilisateur
from app.schemas.briefing import BriefingResponse

APPROCHE_FENETRE_JOURS = 15


def get_briefing_stats(db: Session, user: Utilisateur) -> BriefingResponse:
    reference = get_reference_date(db)
    seuil = DEFAULT_SEUIL_JOURS

    dossiers_actifs = (
        db.query(func.count(Sinistre.id)).filter(Sinistre.date_cloture_sinistre.is_(None)).scalar() or 0
    )
    dossiers_critiques = count_critiques(db, seuil)

    # Dossiers ouverts, pas encore critiques, mais dans la fenetre d'alerte
    # amont (seuil - 15 jours a seuil - 1 jour) : "approchent" sans depasser.
    dossiers_approchant = (
        db.query(Sinistre)
        .filter(Sinistre.date_cloture_sinistre.is_(None))
        .all()
    )
    approchant_count = sum(
        1
        for s in dossiers_approchant
        if seuil - APPROCHE_FENETRE_JOURS <= (reference - s.date_ouverture).days < seuil
    )

    exposition = (
        db.query(func.coalesce(func.sum(Reglement.montant_reglement), 0))
        .join(Sinistre, Sinistre.id == Reglement.sinistre_id)
        .filter(Sinistre.date_cloture_sinistre.is_(None))
        .scalar()
        or Decimal(0)
    )

    anomalies = detect_anomalies(db, page=0, size=1)[1]

    champs_incomplets = (
        db.query(func.count(Sinistre.id))
        .filter(Sinistre.date_cloture_sinistre.is_(None), Sinistre.date_retour_quittance_signe.is_(None))
        .scalar()
        or 0
    )

    return BriefingResponse(
        prenom=user.prenom,
        dossiers_actifs=dossiers_actifs,
        dossiers_critiques=dossiers_critiques,
        dossiers_approchant_seuil=approchant_count,
        exposition_totale=exposition,
        anomalies_detectees=anomalies,
        champs_incomplets=champs_incomplets,
        seuil_jours=seuil,
    )
