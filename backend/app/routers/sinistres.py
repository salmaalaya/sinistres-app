from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user, require_roles
from app.crud import sinistre as sinistre_crud
from app.models.enums import Role
from app.models.utilisateur import Utilisateur
from app.schemas.sinistre import PageResponse, SinistreCreate, SinistreResponse, SinistreUpdate
from app.services.pdf_export import build_sinistre_pdf

router = APIRouter(
    prefix="/api/sinistres", tags=["sinistres"], dependencies=[Depends(get_current_user)]
)


@router.get("", response_model=PageResponse)
def list_sinistres(
    page: int = Query(0, ge=0),
    size: int = Query(15, ge=1, le=200),
    nature: str | None = Query(None),
    type_: str | None = Query(None, alias="type"),
    processus: str | None = Query(None),
    statut: str | None = Query(None),
    date_ouverture_debut: date | None = Query(None, alias="dateOuvertureDebut"),
    date_ouverture_fin: date | None = Query(None, alias="dateOuvertureFin"),
    montant_min: Decimal | None = Query(None, alias="montantMin"),
    montant_max: Decimal | None = Query(None, alias="montantMax"),
    db: Session = Depends(get_db),
):
    items, total_elements, total_pages = sinistre_crud.list_sinistres(
        db,
        nature=nature,
        type_=type_,
        processus=processus,
        statut=statut,
        date_ouverture_debut=date_ouverture_debut,
        date_ouverture_fin=date_ouverture_fin,
        montant_min=montant_min,
        montant_max=montant_max,
        page=page,
        size=size,
    )
    return PageResponse(
        content=items, total_elements=total_elements, total_pages=total_pages, number=page, size=size
    )


@router.get("/{sinistre_id}", response_model=SinistreResponse)
def get_sinistre(sinistre_id: int, db: Session = Depends(get_db)):
    sinistre = sinistre_crud.get_by_id(db, sinistre_id)
    if sinistre is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sinistre introuvable")
    return sinistre


@router.post("", response_model=SinistreResponse, status_code=status.HTTP_201_CREATED)
def create_sinistre(
    payload: SinistreCreate,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_roles(Role.ADMIN, Role.GESTIONNAIRE)),
):
    try:
        return sinistre_crud.create(db, payload)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Le code sinistre {payload.code_sinistre} existe deja",
        )


@router.put("/{sinistre_id}", response_model=SinistreResponse)
def update_sinistre(
    sinistre_id: int,
    payload: SinistreUpdate,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_roles(Role.ADMIN, Role.GESTIONNAIRE)),
):
    sinistre = sinistre_crud.get_by_id(db, sinistre_id)
    if sinistre is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sinistre introuvable")
    try:
        return sinistre_crud.update(db, sinistre, payload)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Le code sinistre {payload.code_sinistre} existe deja",
        )


@router.get("/{sinistre_id}/export-pdf")
def export_sinistre_pdf(sinistre_id: int, db: Session = Depends(get_db)):
    sinistre = sinistre_crud.get_by_id(db, sinistre_id)
    if sinistre is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sinistre introuvable")
    pdf_bytes = build_sinistre_pdf(sinistre)
    headers = {"Content-Disposition": f'attachment; filename="sinistre_{sinistre.code_sinistre}.pdf"'}
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)


@router.delete("/{sinistre_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sinistre(
    sinistre_id: int,
    db: Session = Depends(get_db),
    _: Utilisateur = Depends(require_roles(Role.ADMIN)),
):
    sinistre = sinistre_crud.get_by_id(db, sinistre_id)
    if sinistre is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Sinistre introuvable")
    sinistre_crud.delete(db, sinistre)
