from sqlalchemy import func

from app.models.reglement import Reglement
from app.models.sinistre import Sinistre
from app.schemas.financier import (
    DashboardFinancier,
    EvolutionMensuelle,
    MontantRepartitionItem,
    TopReglement,
)

TOP_REGLEMENTS_LIMIT = 10


def get_dashboard_financier(db) -> DashboardFinancier:
    mois_expr = func.date_format(Reglement.date_reglement, "%Y-%m")
    rows = (
        db.query(mois_expr.label("mois"), func.sum(Reglement.montant_reglement), func.count(Reglement.id))
        .group_by("mois")
        .order_by("mois")
        .all()
    )
    evolution = [
        EvolutionMensuelle(mois=mois, montant_total=total, nombre_reglements=count)
        for mois, total, count in rows
    ]

    nature_rows = (
        db.query(Sinistre.nature_sin, func.sum(Reglement.montant_reglement))
        .join(Reglement, Reglement.sinistre_id == Sinistre.id)
        .group_by(Sinistre.nature_sin)
        .order_by(Sinistre.nature_sin)
        .all()
    )
    repartition_nature = [MontantRepartitionItem(label=label, montant=total) for label, total in nature_rows]

    processus_rows = (
        db.query(Sinistre.processus, func.sum(Reglement.montant_reglement))
        .join(Reglement, Reglement.sinistre_id == Sinistre.id)
        .group_by(Sinistre.processus)
        .order_by(Sinistre.processus)
        .all()
    )
    repartition_processus = [
        MontantRepartitionItem(label=label, montant=total) for label, total in processus_rows
    ]

    top_rows = (
        db.query(Reglement, Sinistre)
        .join(Sinistre, Sinistre.id == Reglement.sinistre_id)
        .order_by(Reglement.montant_reglement.desc())
        .limit(TOP_REGLEMENTS_LIMIT)
        .all()
    )
    top_reglements = [
        TopReglement(
            sinistre_id=s.id,
            code_sinistre=s.code_sinistre,
            n_sinistre=s.n_sinistre,
            montant=r.montant_reglement,
            date_reglement=r.date_reglement,
        )
        for r, s in top_rows
    ]

    return DashboardFinancier(
        evolution_mensuelle=evolution,
        repartition_montant_nature=repartition_nature,
        repartition_montant_processus=repartition_processus,
        top_reglements=top_reglements,
    )
