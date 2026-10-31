from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.crud import qualite as qualite_crud
from app.schemas.qualite import QualiteDonnees

router = APIRouter(prefix="/api/qualite", tags=["qualite"], dependencies=[Depends(get_current_user)])


@router.get("", response_model=QualiteDonnees)
def get_qualite(db: Session = Depends(get_db)):
    return qualite_crud.get_qualite(db)
