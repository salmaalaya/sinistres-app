from datetime import date

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class AlerteMotif(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    code: str
    texte: str


class DossierAlerte(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: int
    code_sinistre: int
    n_sinistre: str
    statut: str
    date_ouverture: date
    jours_ouverture: int
    motifs: list[AlerteMotif]


class AlertesPage(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    content: list[DossierAlerte]
    total_elements: int
    total_pages: int
    number: int
    size: int
    seuil_jours: int
    regles_actives: list[str]
