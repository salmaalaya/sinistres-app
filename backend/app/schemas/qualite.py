from datetime import datetime

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class DernierImport(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    nom_fichier: str
    date_import: datetime
    lignes_traitees: int
    lignes_dedupliquees: int
    lignes_reglements: int
    processus_defaults: int
    montants_corriges: int


class CompletudeChamp(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    champ: str
    pct_complet: float


class QualiteDonnees(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    dernier_import: DernierImport | None
    completude: list[CompletudeChamp]
    total_sinistres: int
    total_reglements: int
