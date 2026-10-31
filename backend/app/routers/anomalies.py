from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.crud import anomalies as anomalies_crud
from app.schemas.anomalies import AnomaliesPage

router = APIRouter(prefix="/api/anomalies", tags=["anomalies"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=AnomaliesPage)
def get_anomalies(
    page: int = Query(0, ge=0),
    size: int = Query(20, ge=1, le=200),
    contamination: float = Query(anomalies_crud.DEFAULT_CONTAMINATION, gt=0.0, lt=0.5),
    db: Session = Depends(get_db),
):
    items, total_elements, total_pages, nombre_analyses = anomalies_crud.detect_anomalies(
        db, contamination=contamination, page=page, size=size
    )
    return AnomaliesPage(
        content=items,
        total_elements=total_elements,
        total_pages=total_pages,
        number=page,
        size=size,
        contamination=contamination,
        nombre_dossiers_analyses=nombre_analyses,
    )
