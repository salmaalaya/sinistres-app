from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.crud import financier as financier_crud
from app.schemas.financier import DashboardFinancier
from app.services.pdf_export import build_financier_pdf

router = APIRouter(
    prefix="/api/dashboard/financier", tags=["financier"], dependencies=[Depends(get_current_user)]
)


@router.get("", response_model=DashboardFinancier)
def get_financier(db: Session = Depends(get_db)):
    return financier_crud.get_dashboard_financier(db)


@router.get("/export-pdf")
def export_financier_pdf(db: Session = Depends(get_db)):
    data = financier_crud.get_dashboard_financier(db)
    pdf_bytes = build_financier_pdf(data)
    headers = {"Content-Disposition": 'attachment; filename="financier.pdf"'}
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)
