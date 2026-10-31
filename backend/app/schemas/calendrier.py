from datetime import date

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class JourActivite(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    date: date
    count: int


class JourLePlusCharge(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    date: date
    count: int


class CalendrierKpis(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    jour_le_plus_charge: JourLePlusCharge | None
    moyenne_journaliere: float
    jours_sans_activite: int
    jours_actifs: int
    total_evenements: int


class CalendrierResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    jours: list[JourActivite]
    kpis: CalendrierKpis
