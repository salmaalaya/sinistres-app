"""Ajoute la colonne utilisateurs.telephone si elle n'existe pas deja.

create_all() ne modifie jamais une table existante, seulement les tables
manquantes : cette colonne (necessaire pour le flux mot de passe oublie
par telephone) doit donc etre ajoutee explicitement.

Usage :
    .venv/Scripts/python.exe scripts/migrate_add_telephone.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import text

from app.core.database import engine


def main():
    with engine.connect() as conn:
        existing = conn.execute(
            text(
                "SELECT COUNT(*) FROM information_schema.columns "
                "WHERE table_schema = DATABASE() AND table_name = 'utilisateurs' AND column_name = 'telephone'"
            )
        ).scalar()
        if existing:
            print("Colonne telephone deja presente, rien a faire.")
            return
        conn.execute(text("ALTER TABLE utilisateurs ADD COLUMN telephone VARCHAR(30) NULL"))
        conn.commit()
        print("Colonne telephone ajoutee a utilisateurs.")


if __name__ == "__main__":
    main()
