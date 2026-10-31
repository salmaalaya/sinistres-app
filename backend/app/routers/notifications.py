from fastapi import APIRouter, Depends

from app.core.database import get_db
from app.core.security import require_roles
from app.models.enums import Role
from app.services.notifications import run_notification_job

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


@router.post("/run")
def run_now(db=Depends(get_db), _=Depends(require_roles(Role.ADMIN))):
    """Declenche manuellement le job de notification des dossiers critiques
    (le meme que le scheduler quotidien) - utile pour verifier/operer sans
    attendre l'heure planifiee."""
    return run_notification_job(db)
