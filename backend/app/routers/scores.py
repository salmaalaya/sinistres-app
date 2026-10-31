from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.crud import scores as scores_crud
from app.schemas.delais import GestionnaireScore
from app.schemas.scores import ScoresDistribution, ScoresPage

router = APIRouter(prefix="/api/scores", tags=["scores"], dependencies=[Depends(get_current_user)])


@router.get("/dossiers", response_model=ScoresPage)
def get_scores(
    page: int = Query(0, ge=0),
    size: int = Query(20, ge=1, le=200),
    sort_desc: bool = Query(False, alias="sortDesc"),
    db: Session = Depends(get_db),
):
    items, total_elements, total_pages = scores_crud.get_scores_page(
        db, page=page, size=size, sort_desc=sort_desc
    )
    return ScoresPage(content=items, total_elements=total_elements, total_pages=total_pages, number=page, size=size)


@router.get("/stats", response_model=ScoresDistribution)
def get_scores_stats(db: Session = Depends(get_db)):
    return scores_crud.get_distribution(db)


@router.get("/gestionnaires", response_model=list[GestionnaireScore])
def get_classement_gestionnaires(db: Session = Depends(get_db)):
    return scores_crud.get_classement_gestionnaires(db)
