from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import get_current_user
from app.schemas.predictions import (
    ComparaisonModeles,
    DureePredictionRequest,
    DureePredictionResponse,
    MontantPredictionRequest,
    MontantPredictionResponse,
)
from app.services import ml_duree, ml_montant

router = APIRouter(
    prefix="/api/predictions", tags=["predictions"], dependencies=[Depends(get_current_user)]
)


@router.get("/duree/metrics", response_model=ComparaisonModeles)
def duree_metrics(db: Session = Depends(get_db)):
    comparaison, _ = ml_duree.get_or_train(db)
    return comparaison


@router.post("/duree/predict", response_model=DureePredictionResponse)
def duree_predict(payload: DureePredictionRequest, db: Session = Depends(get_db)):
    return ml_duree.predict(db, payload)


@router.get("/montant/metrics", response_model=ComparaisonModeles)
def montant_metrics(db: Session = Depends(get_db)):
    comparaison, _ = ml_montant.get_or_train(db)
    return comparaison


@router.post("/montant/predict", response_model=MontantPredictionResponse)
def montant_predict(payload: MontantPredictionRequest, db: Session = Depends(get_db)):
    return ml_montant.predict(db, payload)
