"""Notifications email proactives sur dossier critique.

Reprend la regle "critique" de la page Alertes (voir app/crud/alertes.py ::
count_critiques : dossier non cloture et ouvert depuis plus de
DEFAULT_SEUIL_JOURS jours), groupe les dossiers par destinataire (le
gestionnaire assigne, ou a defaut tous les administrateurs actifs - dans ce
jeu de donnees gestionnaire_id n'est quasiment jamais renseigne), envoie au
plus un recap par destinataire et par execution, et n'renvoie pas un meme
dossier a un meme destinataire avant 7 jours (table notifications_envoyees).
"""

import logging
from datetime import date, datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.crud.alertes import DEFAULT_SEUIL_JOURS
from app.models.enums import Role
from app.models.notification import NotificationEnvoyee
from app.models.sinistre import Sinistre
from app.models.utilisateur import Utilisateur
from app.services import email as email_service

logger = logging.getLogger("app.notifications")

TYPE_DOSSIER_CRITIQUE = "dossier_critique"
DEDUP_WINDOW_DAYS = 7


def _reference_date(db: Session) -> date:
    """Meme logique que crud.alertes.get_reference_date : ce jeu de donnees
    est un instantane fige, donc l'age d'un dossier se calcule par rapport a
    la derniere date observee dans les donnees, pas date.today()."""
    max_ouverture = db.query(func.max(Sinistre.date_ouverture)).scalar()
    max_cloture = db.query(func.max(Sinistre.date_cloture_sinistre)).scalar()
    candidates = [d for d in (max_ouverture, max_cloture) if d is not None]
    return max(candidates) if candidates else date.today()


def get_dossiers_critiques(db: Session, seuil_jours: int = DEFAULT_SEUIL_JOURS) -> list[Sinistre]:
    reference = _reference_date(db)
    cutoff = reference - timedelta(days=seuil_jours)
    return (
        db.query(Sinistre)
        .options(selectinload(Sinistre.gestionnaire))
        .filter(Sinistre.date_cloture_sinistre.is_(None), Sinistre.date_ouverture < cutoff)
        .all()
    )


def _recently_notified_sinistre_ids(db: Session, now: datetime) -> set[int]:
    cutoff = now - timedelta(days=DEDUP_WINDOW_DAYS)
    rows = (
        db.query(NotificationEnvoyee.sinistre_id)
        .filter(
            NotificationEnvoyee.type_notification == TYPE_DOSSIER_CRITIQUE,
            NotificationEnvoyee.date_envoi >= cutoff,
        )
        .all()
    )
    return {r[0] for r in rows}


def _group_by_recipient(db: Session, dossiers: list[Sinistre]) -> dict[str, list[Sinistre]]:
    admin_emails = [
        u.email
        for u in db.query(Utilisateur).filter(Utilisateur.role == Role.ADMIN, Utilisateur.actif.is_(True))
        if u.email
    ]

    groups: dict[str, list[Sinistre]] = {}
    for dossier in dossiers:
        if dossier.gestionnaire is not None and dossier.gestionnaire.email:
            recipients = [dossier.gestionnaire.email]
        else:
            recipients = admin_emails
        for recipient in recipients:
            groups.setdefault(recipient, []).append(dossier)
    return groups


def run_notification_job(db: Session, seuil_jours: int = DEFAULT_SEUIL_JOURS) -> dict:
    """Execute une passe de notification. Retourne un resume (utilise par le
    scheduler quotidien et par l'endpoint de declenchement manuel)."""
    now = datetime.utcnow()
    reference = _reference_date(db)

    dossiers = get_dossiers_critiques(db, seuil_jours)
    already_notified = _recently_notified_sinistre_ids(db, now)
    a_notifier = [d for d in dossiers if d.id not in already_notified]

    groups = _group_by_recipient(db, a_notifier)

    summary = {"dossiers_critiques": len(dossiers), "recipients_emailed": 0, "recipients_failed": 0}

    for recipient, dossiers_recipient in groups.items():
        rows = [
            {
                "code_sinistre": d.code_sinistre,
                "n_sinistre": d.n_sinistre,
                "jours_ouverture": (reference - d.date_ouverture).days,
            }
            for d in dossiers_recipient
        ]
        try:
            sent = email_service.send_critical_dossiers_email(recipient, rows)
        except Exception:
            logger.exception("Echec inattendu lors de l'envoi de la notification a %s.", recipient)
            sent = False

        if not sent:
            summary["recipients_failed"] += 1
            continue

        summary["recipients_emailed"] += 1
        for d in dossiers_recipient:
            db.add(
                NotificationEnvoyee(
                    sinistre_id=d.id, type_notification=TYPE_DOSSIER_CRITIQUE, date_envoi=now
                )
            )
    db.commit()

    return summary
