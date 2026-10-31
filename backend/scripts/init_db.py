"""Cree les tables MySQL a partir des modeles SQLAlchemy si elles n'existent pas.

Usage :
    .venv/Scripts/python.exe scripts/init_db.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.database import Base, engine
from app.models import ImportLog, PasswordResetOtp, Reglement, Sinistre, Utilisateur  # noqa: F401  (enregistre les mappers)


def main():
    Base.metadata.create_all(bind=engine)
    print("Tables verifiees/creees :", list(Base.metadata.tables.keys()))


if __name__ == "__main__":
    main()
