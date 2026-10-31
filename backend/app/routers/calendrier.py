from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.crud import calendrier as calendrier_crud
from app.schemas.calendrier import CalendrierResponse

router = APIRouter(prefix="/api/calendrier", tags=["calendrier"], dependencies=[Depends(get_current_user)])


@router.get("/annees", response_model=list[int])
def get_annees(db: Session = Depends(get_db)):
    return calendrier_crud.get_annees_disponibles(db)


@router.get("/heatmap", response_model=CalendrierResponse)
def get_heatmap(
    type: str = Query("ouvertures", pattern="^(ouvertures|clotures)$"),
    annee: int = Query(...),
    db: Session = Depends(get_db),
):
    return calendrier_crud.get_heatmap(db, type, annee)
