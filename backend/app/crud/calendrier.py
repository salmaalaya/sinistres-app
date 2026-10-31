from datetime import date, timedelta

from sqlalchemy import extract, func
from sqlalchemy.orm import Session

from app.models.sinistre import Sinistre
from app.schemas.calendrier import CalendrierKpis, CalendrierResponse, JourActivite, JourLePlusCharge


def get_annees_disponibles(db: Session) -> list[int]:
    ouvertures = db.query(extract("year", Sinistre.date_ouverture)).distinct()
    clotures = db.query(extract("year", Sinistre.date_cloture_sinistre)).filter(
        Sinistre.date_cloture_sinistre.isnot(None)
    ).distinct()
    annees = {int(y[0]) for y in ouvertures.all()} | {int(y[0]) for y in clotures.all()}
    return sorted(annees)


def get_heatmap(db: Session, type_evenement: str, annee: int) -> CalendrierResponse:
    col = Sinistre.date_ouverture if type_evenement == "ouvertures" else Sinistre.date_cloture_sinistre
    rows = (
        db.query(col.label("d"), func.count().label("n"))
        .filter(extract("year", col) == annee)
        .group_by(col)
        .all()
    )
    counts: dict[date, int] = {r.d: r.n for r in rows}

    start = date(annee, 1, 1)
    end = date(annee, 12, 31)
    total_days = (end - start).days + 1
    jours = [JourActivite(date=start + timedelta(days=i), count=counts.get(start + timedelta(days=i), 0)) for i in range(total_days)]

    total_evenements = sum(counts.values())
    jours_actifs = len(counts)
    moyenne = round(total_evenements / total_days, 2) if total_days else 0.0

    jour_le_plus_charge = None
    if counts:
        best_date, best_count = max(counts.items(), key=lambda kv: kv[1])
        jour_le_plus_charge = JourLePlusCharge(date=best_date, count=best_count)

    kpis = CalendrierKpis(
        jour_le_plus_charge=jour_le_plus_charge,
        moyenne_journaliere=moyenne,
        jours_sans_activite=total_days - jours_actifs,
        jours_actifs=jours_actifs,
        total_evenements=total_evenements,
    )
    return CalendrierResponse(jours=jours, kpis=kpis)
