from decimal import Decimal

from sqlalchemy import func
from sqlalchemy.orm import Session, selectinload

from app.crud.alertes import count_critiques
from app.crud.anomalies import detect_anomalies
from app.models.reglement import Reglement
from app.models.sinistre import Sinistre
from app.schemas.dashboard import DashboardKpis, DelaisMoyens, RepartitionItem, SinistreRecent

EXPRESS_PROCESSUS = "Processus Express"
SEUIL_CRITIQUE_CLOTURE_JOURS = 90
NB_DOSSIERS_RECENTS = 5


def _repartition(db: Session, column) -> list[RepartitionItem]:
    rows = db.query(column, func.count(Sinistre.id)).group_by(column).order_by(column).all()
    return [RepartitionItem(label=str(label), value=count) for label, count in rows]


def _avg_datediff(db: Session, end_col, start_col, query=None) -> float | None:
    q = query if query is not None else db.query(Sinistre)
    value = q.with_entities(func.avg(func.datediff(end_col, start_col))).scalar()
    return round(float(value), 1) if value is not None else None


def _get_delais_moyens(db: Session) -> DelaisMoyens:
    sinistre_ouverture = _avg_datediff(db, Sinistre.date_ouverture, Sinistre.date_sinistre)
    ouverture_ordonnancement = _avg_datediff(db, Sinistre.date_ordonnancement, Sinistre.date_ouverture)
    ouverture_cloture = _avg_datediff(
        db,
        Sinistre.date_cloture_sinistre,
        Sinistre.date_ouverture,
        db.query(Sinistre).filter(Sinistre.date_cloture_sinistre.isnot(None)),
    )

    ordonnancement_reglement = (
        db.query(func.avg(func.datediff(Reglement.date_reglement, Sinistre.date_ordonnancement)))
        .join(Sinistre, Sinistre.id == Reglement.sinistre_id)
        .scalar()
    )

    return DelaisMoyens(
        sinistre_ouverture_jours=sinistre_ouverture,
        ouverture_ordonnancement_jours=ouverture_ordonnancement,
        ordonnancement_reglement_jours=(
            round(float(ordonnancement_reglement), 1) if ordonnancement_reglement is not None else None
        ),
        ouverture_cloture_jours=ouverture_cloture,
        seuil_critique_cloture_jours=SEUIL_CRITIQUE_CLOTURE_JOURS,
    )


def _get_dossiers_recents(db: Session) -> list[SinistreRecent]:
    rows = (
        db.query(Sinistre)
        .options(selectinload(Sinistre.reglements))
        .order_by(Sinistre.date_ouverture.desc())
        .limit(NB_DOSSIERS_RECENTS)
        .all()
    )
    return [
        SinistreRecent(
            id=s.id,
            code_sinistre=s.code_sinistre,
            n_sinistre=s.n_sinistre,
            nature_sin=s.nature_sin,
            date_ouverture=s.date_ouverture.isoformat(),
            statut=s.statut,
            montant_total_regle=s.montant_total_regle,
        )
        for s in rows
    ]


def get_kpis(db: Session) -> DashboardKpis:
    total = db.query(func.count(Sinistre.id)).scalar() or 0
    ouverts = (
        db.query(func.count(Sinistre.id)).filter(Sinistre.date_cloture_sinistre.is_(None)).scalar() or 0
    )
    clotures = total - ouverts
    pct_cloture = (clotures / total * 100) if total else 0.0

    montant_total = db.query(func.coalesce(func.sum(Reglement.montant_reglement), 0)).scalar() or Decimal(0)
    montant_moyen = (Decimal(montant_total) / total) if total else Decimal(0)

    express = (
        db.query(func.count(Sinistre.id)).filter(Sinistre.processus == EXPRESS_PROCESSUS).scalar() or 0
    )

    return DashboardKpis(
        total_sinistres=total,
        dossiers_ouverts=ouverts,
        dossiers_clotures=clotures,
        pct_cloture=round(pct_cloture, 1),
        montant_total_regle=montant_total,
        montant_moyen_regle=round(montant_moyen, 3),
        nombre_dossiers_express=express,
        dossiers_critiques=count_critiques(db),
        nombre_anomalies=detect_anomalies(db, page=0, size=1)[1],
        delais_moyens=_get_delais_moyens(db),
        repartition_nature=_repartition(db, Sinistre.nature_sin),
        repartition_type=_repartition(db, Sinistre.type_sin),
        repartition_processus=_repartition(db, Sinistre.processus),
        dossiers_recents=_get_dossiers_recents(db),
    )
