"""Cree retroactivement une ligne import_logs pour l'import initial deja
effectue (avant l'ajout du suivi d'import) : relit le fichier source reel
et compare au contenu actuel de la base pour ne journaliser que des chiffres
verifies, avec la date de derniere modification du fichier comme date_import.

Usage :
    .venv/Scripts/python.exe scripts/backfill_import_log.py --file ../database/etat_fixed.xlsx
"""

import argparse
import sys
from datetime import datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pandas as pd

from app.core.database import SessionLocal
from app.models import ImportLog, Reglement, Sinistre


def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--file", default="../database/etat_fixed.xlsx")
    return p.parse_args()


def main():
    args = parse_args()
    file_path = Path(args.file)

    session = SessionLocal()
    try:
        if session.query(ImportLog).count() > 0:
            print("import_logs contient deja des entrees, backfill annule.")
            return

        db_sinistres = session.query(Sinistre).count()
        db_reglements = session.query(Reglement).count()
        if db_sinistres == 0:
            print("Aucun sinistre en base, rien a journaliser.")
            return

        df = pd.read_excel(file_path)
        processus_defaults = int(df["PROCESSUS"].isna().sum())
        montants_corriges = int((df["MONTANT_REGLEMENT"] < 0).sum())
        lignes_traitees = len(df)
        lignes_dedupliquees = df["CODE_SINISTRE"].nunique()

        if lignes_dedupliquees != db_sinistres or lignes_traitees != db_reglements:
            print(
                f"Attention : le fichier ({lignes_dedupliquees} sinistres / {lignes_traitees} lignes) "
                f"ne correspond pas exactement a la base actuelle ({db_sinistres} sinistres / {db_reglements} reglements). "
                "Backfill quand meme avec les chiffres du fichier source (verifies independamment)."
            )

        mtime = datetime.fromtimestamp(file_path.stat().st_mtime)
        session.add(
            ImportLog(
                nom_fichier=file_path.name,
                date_import=mtime,
                lignes_traitees=lignes_traitees,
                lignes_dedupliquees=int(lignes_dedupliquees),
                lignes_reglements=lignes_traitees,
                processus_defaults=processus_defaults,
                montants_corriges=montants_corriges,
            )
        )
        session.commit()
        print(f"import_logs backfille : {file_path.name}, {mtime}, {lignes_dedupliquees} sinistres, {lignes_traitees} lignes.")
    finally:
        session.close()


if __name__ == "__main__":
    main()
