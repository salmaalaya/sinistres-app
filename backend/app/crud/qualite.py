from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.import_log import ImportLog
from app.models.reglement import Reglement
from app.models.sinistre import Sinistre
from app.schemas.qualite import CompletudeChamp, DernierImport, QualiteDonnees

CHAMPS_SINISTRE = {
    "n_sinistre": "N Sinistre",
    "date_sinistre": "Date du sinistre",
    "date_ouverture": "Date d'ouverture",
    "date_cloture_sinistre": "Date de cloture",
    "nature_sin": "Nature",
    "type_sin": "Type",
    "date_retour_quittance_signe": "Retour quittance signee",
    "date_ordonnancement": "Date d'ordonnancement",
    "processus": "Processus",
}


def get_dernier_import(db: Session) -> DernierImport | None:
    row = db.query(ImportLog).order_by(ImportLog.date_import.desc()).first()
    if row is None:
        return None
    return DernierImport(
        nom_fichier=row.nom_fichier,
        date_import=row.date_import,
        lignes_traitees=row.lignes_traitees,
        lignes_dedupliquees=row.lignes_dedupliquees,
        lignes_reglements=row.lignes_reglements,
        processus_defaults=row.processus_defaults,
        montants_corriges=row.montants_corriges,
    )


def get_completude(db: Session) -> list[CompletudeChamp]:
    total = db.query(func.count(Sinistre.id)).scalar() or 0
    if total == 0:
        return []

    completude = []
    for col_name, label in CHAMPS_SINISTRE.items():
        col = getattr(Sinistre, col_name)
        non_null = db.query(func.count(col)).filter(col.isnot(None)).scalar() or 0
        completude.append(CompletudeChamp(champ=label, pct_complet=round(non_null / total * 100, 1)))

    total_reglements = db.query(func.count(Reglement.id)).scalar() or 0
    if total_reglements > 0:
        non_null_date = (
            db.query(func.count(Reglement.date_reglement)).filter(Reglement.date_reglement.isnot(None)).scalar() or 0
        )
        completude.append(
            CompletudeChamp(champ="Date de reglement", pct_complet=round(non_null_date / total_reglements * 100, 1))
        )
        non_null_montant = (
            db.query(func.count(Reglement.montant_reglement))
            .filter(Reglement.montant_reglement.isnot(None))
            .scalar()
            or 0
        )
        completude.append(
            CompletudeChamp(champ="Montant du reglement", pct_complet=round(non_null_montant / total_reglements * 100, 1))
        )

    return completude


def get_qualite(db: Session) -> QualiteDonnees:
    total_sinistres = db.query(func.count(Sinistre.id)).scalar() or 0
    total_reglements = db.query(func.count(Reglement.id)).scalar() or 0
    return QualiteDonnees(
        dernier_import=get_dernier_import(db),
        completude=get_completude(db),
        total_sinistres=total_sinistres,
        total_reglements=total_reglements,
    )
