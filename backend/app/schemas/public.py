from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class PublicStats(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    total_dossiers: int
    pct_cloture: float
    montant_total_regle: float
