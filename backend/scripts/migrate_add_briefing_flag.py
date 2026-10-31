"""Ajoute la colonne utilisateurs.a_vu_briefing si elle n'existe pas deja
(premiere experience "Briefing" post-connexion, voir WelcomePage.tsx).

Usage :
    .venv/Scripts/python.exe scripts/migrate_add_briefing_flag.py
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
                "WHERE table_schema = DATABASE() AND table_name = 'utilisateurs' AND column_name = 'a_vu_briefing'"
            )
        ).scalar()
        if existing:
            print("Colonne a_vu_briefing deja presente, rien a faire.")
            return
        conn.execute(
            text("ALTER TABLE utilisateurs ADD COLUMN a_vu_briefing TINYINT(1) NOT NULL DEFAULT 0")
        )
        conn.commit()
        print("Colonne a_vu_briefing ajoutee a utilisateurs.")


if __name__ == "__main__":
    main()
