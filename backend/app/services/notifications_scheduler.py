"""Planification du job quotidien de notification des dossiers critiques.

Demarre/arrete avec le lifespan FastAPI (voir app/main.py). Une erreur dans
une execution du job est journalisee (voir run_notification_job / email.py)
mais ne doit jamais faire planter le scheduler ni l'application."""

import logging

from apscheduler.schedulers.background import BackgroundScheduler

from app.core.config import settings
from app.core.database import SessionLocal
from app.services.notifications import run_notification_job

logger = logging.getLogger("app.notifications")

_scheduler: BackgroundScheduler | None = None


def _run_job() -> None:
    db = SessionLocal()
    try:
        summary = run_notification_job(db)
        logger.info("Job de notification dossiers critiques termine : %s", summary)
    except Exception:
        logger.exception("Le job de notification dossiers critiques a echoue.")
    finally:
        db.close()


def start() -> BackgroundScheduler:
    global _scheduler
    if _scheduler is not None:
        return _scheduler

    heure, minute = (settings.notifications_heure.split(":") + ["0"])[:2]
    _scheduler = BackgroundScheduler(timezone="Europe/Paris")
    _scheduler.add_job(
        _run_job,
        trigger="cron",
        hour=int(heure),
        minute=int(minute),
        id="notifications_dossiers_critiques",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info("Scheduler de notifications demarre (quotidien a %s).", settings.notifications_heure)
    return _scheduler


def shutdown() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
