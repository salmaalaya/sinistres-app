from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.process_mining import ProcessMiningResponse
from app.services.process_mining import get_process_mining

router = APIRouter(
    prefix="/api/process-mining", tags=["process-mining"], dependencies=[Depends(get_current_user)]
)


@router.get("", response_model=ProcessMiningResponse)
def process_mining(db: Session = Depends(get_db)):
    return get_process_mining(db)
