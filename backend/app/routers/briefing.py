from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.crud import briefing as briefing_crud
from app.models.utilisateur import Utilisateur
from app.schemas.briefing import BriefingResponse

router = APIRouter(prefix="/api/briefing", tags=["briefing"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=BriefingResponse)
def get_briefing(db: Session = Depends(get_db), current_user: Utilisateur = Depends(get_current_user)):
    return briefing_crud.get_briefing_stats(db, current_user)


@router.post("/vu")
def marquer_vu(db: Session = Depends(get_db), current_user: Utilisateur = Depends(get_current_user)):
    current_user.a_vu_briefing = True
    db.commit()
    return {"ok": True}
