from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.previsions import PrevisionsResponse
from app.services.previsions import get_previsions

router = APIRouter(prefix="/api/previsions", tags=["previsions"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=PrevisionsResponse)
def previsions(db: Session = Depends(get_db)):
    return get_previsions(db)
