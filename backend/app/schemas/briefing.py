from decimal import Decimal

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class BriefingResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    prenom: str
    dossiers_actifs: int
    dossiers_critiques: int
    dossiers_approchant_seuil: int
    exposition_totale: Decimal
    anomalies_detectees: int
    champs_incomplets: int
    seuil_jours: int
