from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class ChampsExtraits(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    n_sinistre: str | None
    date_sinistre: str | None
    nature_sin: str | None
    montant_reclame: str | None
    description: str | None


class OcrResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    nom_fichier: str
    champs: ChampsExtraits
    taux_extraction: int
