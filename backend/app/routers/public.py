from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.reglement import Reglement
from app.models.sinistre import Sinistre
from app.schemas.public import PublicStats

router = APIRouter(prefix="/api/public", tags=["public"])


@router.get("/stats", response_model=PublicStats)
def get_public_stats(db: Session = Depends(get_db)):
    total = db.query(func.count(Sinistre.id)).scalar() or 0
    clotures = (
        db.query(func.count(Sinistre.id)).filter(Sinistre.date_cloture_sinistre.isnot(None)).scalar() or 0
    )
    pct_cloture = round(clotures / total * 100, 1) if total else 0.0
    montant_total = db.query(func.coalesce(func.sum(Reglement.montant_reglement), 0)).scalar() or Decimal(0)
    return PublicStats(
        total_dossiers=total, pct_cloture=pct_cloture, montant_total_regle=float(montant_total)
    )
