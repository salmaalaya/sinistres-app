from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.crud import dashboard as dashboard_crud
from app.crud import health_score as health_score_crud
from app.crud import insight as insight_crud
from app.schemas.dashboard import DashboardKpis
from app.schemas.health import HealthScoreResponse
from app.schemas.insight import InsightResponse
from app.services.pdf_export import build_dashboard_pdf

router = APIRouter(
    prefix="/api/dashboard", tags=["dashboard"], dependencies=[Depends(get_current_user)]
)


@router.get("/kpis", response_model=DashboardKpis)
def get_kpis(db: Session = Depends(get_db)):
    return dashboard_crud.get_kpis(db)


@router.get("/health-score", response_model=HealthScoreResponse)
def get_health_score(db: Session = Depends(get_db)):
    return health_score_crud.get_health_score(db)


@router.get("/insight", response_model=InsightResponse)
def get_insight(db: Session = Depends(get_db)):
    return InsightResponse(texte=insight_crud.get_insight_du_jour(db))


@router.get("/export-pdf")
def export_dashboard_pdf(db: Session = Depends(get_db)):
    kpis = dashboard_crud.get_kpis(db)
    pdf_bytes = build_dashboard_pdf(kpis)
    headers = {"Content-Disposition": 'attachment; filename="tableau_de_bord.pdf"'}
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)
