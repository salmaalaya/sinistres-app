from datetime import date
from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.models.reglement import Reglement
from app.models.sinistre import Sinistre
from app.schemas.sinistre import SinistreCreate, SinistreUpdate


def _base_query(db: Session):
    return db.query(Sinistre).options(
        selectinload(Sinistre.reglements), selectinload(Sinistre.gestionnaire)
    )


def get_by_id(db: Session, sinistre_id: int) -> Sinistre | None:
    return _base_query(db).filter(Sinistre.id == sinistre_id).first()


def list_sinistres(
    db: Session,
    *,
    nature: str | None = None,
    type_: str | None = None,
    processus: str | None = None,
    statut: str | None = None,
    date_ouverture_debut: date | None = None,
    date_ouverture_fin: date | None = None,
    montant_min: Decimal | None = None,
    montant_max: Decimal | None = None,
    page: int = 0,
    size: int = 15,
) -> tuple[list[Sinistre], int, int]:
    query = _base_query(db)

    if nature:
        query = query.filter(Sinistre.nature_sin == nature)
    if type_:
        query = query.filter(Sinistre.type_sin == type_)
    if processus:
        query = query.filter(Sinistre.processus.ilike(f"%{processus}%"))
    if statut == "OUVERT":
        query = query.filter(Sinistre.date_cloture_sinistre.is_(None))
    elif statut == "CLOTURE":
        query = query.filter(Sinistre.date_cloture_sinistre.isnot(None))
    if date_ouverture_debut:
        query = query.filter(Sinistre.date_ouverture >= date_ouverture_debut)
    if date_ouverture_fin:
        query = query.filter(Sinistre.date_ouverture <= date_ouverture_fin)

    if montant_min is not None or montant_max is not None:
        montant_subq = (
            db.query(
                Reglement.sinistre_id.label("sinistre_id"),
                func.sum(Reglement.montant_reglement).label("total"),
            )
            .group_by(Reglement.sinistre_id)
            .subquery()
        )
        query = query.join(montant_subq, montant_subq.c.sinistre_id == Sinistre.id)
        if montant_min is not None:
            query = query.filter(montant_subq.c.total >= montant_min)
        if montant_max is not None:
            query = query.filter(montant_subq.c.total <= montant_max)

    total_elements = query.count()
    total_pages = -(-total_elements // size) if total_elements else 0

    items = (
        query.order_by(Sinistre.date_ouverture.desc())
        .offset(page * size)
        .limit(size)
        .all()
    )
    return items, total_elements, total_pages


def create(db: Session, payload: SinistreCreate) -> Sinistre:
    sinistre = Sinistre(**payload.model_dump())
    db.add(sinistre)
    db.commit()
    db.refresh(sinistre)
    return sinistre


def update(db: Session, sinistre: Sinistre, payload: SinistreUpdate) -> Sinistre:
    for field, value in payload.model_dump().items():
        setattr(sinistre, field, value)
    db.commit()
    db.refresh(sinistre)
    return sinistre


def delete(db: Session, sinistre: Sinistre) -> None:
    db.delete(sinistre)
    db.commit()
