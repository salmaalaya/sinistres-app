from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.crud import alertes as alertes_crud
from app.schemas.alertes import AlertesPage

router = APIRouter(prefix="/api/alertes", tags=["alertes"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=AlertesPage)
def get_alertes(
    page: int = Query(0, ge=0),
    size: int = Query(20, ge=1, le=200),
    seuil_jours: int = Query(alertes_crud.DEFAULT_SEUIL_JOURS, ge=1, alias="seuilJours"),
    regles: list[str] | None = Query(None),
    db: Session = Depends(get_db),
):
    items, total_elements, total_pages = alertes_crud.get_alertes(
        db, seuil_jours=seuil_jours, regles=regles, page=page, size=size
    )
    regles_actives = [r for r in (regles or alertes_crud.REGLES_PAR_DEFAUT) if r in alertes_crud.REGLES_DISPONIBLES]
    return AlertesPage(
        content=items,
        total_elements=total_elements,
        total_pages=total_pages,
        number=page,
        size=size,
        seuil_jours=seuil_jours,
        regles_actives=regles_actives or alertes_crud.REGLES_PAR_DEFAUT,
    )
