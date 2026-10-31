from sqlalchemy import func
from sqlalchemy.orm import Session

from app.crud import dashboard as dashboard_crud
from app.crud import delais as delais_crud
from app.crud.alertes import count_critiques
from app.models.sinistre import Sinistre
from app.schemas.health import HealthScoreComposantes, HealthScoreResponse

# Ponderations du score de sante du portefeuille (INTERACTIONS_DYNAMIQUES_ADDENDUM.md,
# point 3) : constantes de module plutot qu'un champ Settings, en coherence avec les
# autres ponderations metier deja existantes (voir app/crud/scores.py POIDS_*).
POIDS_CLOTURE = 0.25
POIDS_DELAIS = 0.25
POIDS_ANOMALIES = 0.25
POIDS_CRITIQUES = 0.25


def _nombre_ouverts(db: Session) -> int:
    return db.query(func.count(Sinistre.id)).filter(Sinistre.date_cloture_sinistre.is_(None)).scalar() or 0


def _clamp(value: float) -> float:
    return max(0.0, min(100.0, value))


def get_health_score(db: Session) -> HealthScoreResponse:
    ouverts = _nombre_ouverts(db)

    kpis = dashboard_crud.get_kpis(db)
    score_cloture = kpis.pct_cloture

    delais_moyens = delais_crud.get_stats(db).ouverture_cloture.moyenne
    if delais_moyens is None:
        score_delais = 100.0
    else:
        score_delais = _clamp(100 - (delais_moyens / delais_crud.SEUIL_CRITIQUE_CLOTURE_JOURS) * 50)

    if ouverts:
        score_anomalies = _clamp(100 - (kpis.nombre_anomalies / ouverts * 100))
        score_critiques = _clamp(100 - (kpis.dossiers_critiques / ouverts * 100))
    else:
        score_anomalies = 100.0
        score_critiques = 100.0

    score = (
        score_cloture * POIDS_CLOTURE
        + score_delais * POIDS_DELAIS
        + score_anomalies * POIDS_ANOMALIES
        + score_critiques * POIDS_CRITIQUES
    )

    return HealthScoreResponse(
        score=round(_clamp(score), 1),
        composantes=HealthScoreComposantes(
            cloture=round(score_cloture, 1),
            delais=round(score_delais, 1),
            anomalies=round(score_anomalies, 1),
            critiques=round(score_critiques, 1),
        ),
    )
