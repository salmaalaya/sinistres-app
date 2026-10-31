from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.crud import delais as delais_crud
from app.schemas.delais import DelaisStatsResponse, SinistresDelaisPage, TrancheHistogramme
from app.services.pdf_export import build_delais_pdf

router = APIRouter(prefix="/api/delais", tags=["delais"], dependencies=[Depends(get_current_user)])


@router.get("/stats", response_model=DelaisStatsResponse)
def get_delais_stats(db: Session = Depends(get_db)):
    return delais_crud.get_stats(db)


@router.get("/dossiers", response_model=SinistresDelaisPage)
def get_delais_dossiers(
    page: int = Query(0, ge=0),
    size: int = Query(20, ge=1, le=200),
    sort_by: str = Query("ouvertureCloture", alias="sortBy"),
    db: Session = Depends(get_db),
):
    items, total_elements, total_pages = delais_crud.get_dossiers_delais(
        db, sort_by=sort_by, page=page, size=size
    )
    return SinistresDelaisPage(
        content=items, total_elements=total_elements, total_pages=total_pages, number=page, size=size
    )


@router.get("/histogramme-cloture", response_model=list[TrancheHistogramme])
def get_histogramme_cloture(db: Session = Depends(get_db)):
    return delais_crud.get_histogramme_cloture(db)


@router.get("/export-pdf")
def export_delais_pdf(db: Session = Depends(get_db)):
    stats = delais_crud.get_stats(db)
    histogramme = delais_crud.get_histogramme_cloture(db)
    pdf_bytes = build_delais_pdf(stats, histogramme)
    headers = {"Content-Disposition": 'attachment; filename="delais_performance.pdf"'}
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)
