"""Import des donnees reelles etat.xlsx vers la base sinistres_db (SQLAlchemy).

Reprend la logique de deduplication de l'ancien script MySQL (database/import_data.py) :
  - Un CODE_SINISTRE peut apparaitre plusieurs fois dans le fichier source
    (un par reglement). On extrait donc :
      * les sinistres uniques (dedupliques sur CODE_SINISTRE)
      * les reglements (une ligne source = un reglement, montant en valeur
        absolue, rattache au sinistre via code_sinistre)
  - PROCESSUS manquant -> "Processus Standard"
  - Dates manquantes (NaT) -> NULL en base

Note : database/etat.xlsx n'est pas un vrai fichier binaire .xlsx (pas de
signature ZIP/PK) malgre son extension - utiliser database/etat_fixed.xlsx
(seul fichier lisible par openpyxl), d'ou le defaut ci-dessous.

Usage :
    .venv/Scripts/python.exe scripts/import_data.py --file ../database/etat_fixed.xlsx
"""

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pandas as pd

from app.core.database import SessionLocal
from app.models import ImportLog, Reglement, Sinistre

COLONNES_SINISTRE = [
    "CODE_SINISTRE", "N_SINISTRE", "DATE_SINISTRE", "DATE_OUVERTURE",
    "DATE_CLOTURE_SINISTRE", "NATURE_SIN", "TYPE_SIN",
    "DATE_RETOUR_QUITTANCE_SIGNE", "DATE_ORDONNANCEMENT", "PROCESSUS",
]


def parse_args():
    p = argparse.ArgumentParser(description="Import etat.xlsx vers MySQL via SQLAlchemy")
    p.add_argument("--file", default="../database/etat_fixed.xlsx")
    return p.parse_args()


def load_excel(path: str) -> tuple[pd.DataFrame, int, int]:
    df = pd.read_excel(path)
    processus_defaults = int(df["PROCESSUS"].isna().sum())
    montants_corriges = int((df["MONTANT_REGLEMENT"] < 0).sum())

    df["PROCESSUS"] = df["PROCESSUS"].fillna("Processus Standard")
    date_cols = [
        "DATE_SINISTRE", "DATE_OUVERTURE", "DATE_CLOTURE_SINISTRE",
        "DATE_RETOUR_QUITTANCE_SIGNE", "DATE_ORDONNANCEMENT", "DATE_REGLEMENT",
    ]
    for c in date_cols:
        # Source tunisienne : dates textuelles JJ/MM/AAAA, pas des cellules
        # Excel de type date -> dayfirst explicite (sinon pandas hesite/warn).
        df[c] = pd.to_datetime(df[c], errors="coerce", dayfirst=True)
    df["MONTANT_REGLEMENT"] = df["MONTANT_REGLEMENT"].abs()
    return df, processus_defaults, montants_corriges


def to_py_date(value):
    return None if pd.isna(value) else value.date()


def import_data(
    df: pd.DataFrame, nom_fichier: str, processus_defaults: int, montants_corriges: int
) -> None:
    session = SessionLocal()
    try:
        if session.query(Sinistre).count() > 0:
            print("La table sinistres contient deja des donnees, import annule.")
            return

        sinistres_df = df.drop_duplicates(subset="CODE_SINISTRE")[COLONNES_SINISTRE]
        code_to_obj: dict[int, Sinistre] = {}

        for _, row in sinistres_df.iterrows():
            sinistre = Sinistre(
                code_sinistre=int(row["CODE_SINISTRE"]),
                n_sinistre=row["N_SINISTRE"],
                date_sinistre=to_py_date(row["DATE_SINISTRE"]),
                date_ouverture=to_py_date(row["DATE_OUVERTURE"]),
                date_cloture_sinistre=to_py_date(row["DATE_CLOTURE_SINISTRE"]),
                nature_sin=row["NATURE_SIN"],
                type_sin=row["TYPE_SIN"],
                date_retour_quittance_signe=to_py_date(row["DATE_RETOUR_QUITTANCE_SIGNE"]),
                date_ordonnancement=to_py_date(row["DATE_ORDONNANCEMENT"]),
                processus=row["PROCESSUS"],
            )
            session.add(sinistre)
            code_to_obj[int(row["CODE_SINISTRE"])] = sinistre

        session.flush()  # attribue les id aux sinistres avant de creer les reglements

        n_reglements = 0
        for _, row in df.iterrows():
            sinistre = code_to_obj[int(row["CODE_SINISTRE"])]
            session.add(
                Reglement(
                    sinistre_id=sinistre.id,
                    montant_reglement=float(row["MONTANT_REGLEMENT"]),
                    date_reglement=to_py_date(row["DATE_REGLEMENT"]),
                )
            )
            n_reglements += 1

        session.add(
            ImportLog(
                nom_fichier=nom_fichier,
                lignes_traitees=len(df),
                lignes_dedupliquees=len(code_to_obj),
                lignes_reglements=n_reglements,
                processus_defaults=processus_defaults,
                montants_corriges=montants_corriges,
            )
        )
        session.commit()
        print(f"Sinistres inseres  : {len(code_to_obj)}")
        print(f"Reglements inseres : {n_reglements}")
    finally:
        session.close()


def main():
    args = parse_args()
    df, processus_defaults, montants_corriges = load_excel(args.file)
    import_data(df, Path(args.file).name, processus_defaults, montants_corriges)


if __name__ == "__main__":
    main()
