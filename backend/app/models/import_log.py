from datetime import datetime

from sqlalchemy import DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class ImportLog(Base):
    __tablename__ = "import_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    nom_fichier: Mapped[str] = mapped_column(String(255), nullable=False)
    date_import: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    lignes_traitees: Mapped[int] = mapped_column(Integer, nullable=False)
    lignes_dedupliquees: Mapped[int] = mapped_column(Integer, nullable=False)
    lignes_reglements: Mapped[int] = mapped_column(Integer, nullable=False)
    processus_defaults: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    montants_corriges: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
