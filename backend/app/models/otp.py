from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class PasswordResetOtp(Base):
    __tablename__ = "password_reset_otps"

    id: Mapped[int] = mapped_column(primary_key=True)
    # BigInteger : doit correspondre au type reel de utilisateurs.id (BIGINT
    # dans la base historique, voir app/models/utilisateur.py) - un simple
    # Mapped[int] sans annotation explicite genererait un INTEGER cote
    # SQLAlchemy et casserait la creation de la contrainte FK sur MySQL 8
    # strict (constate en simulant un environnement CI propre).
    utilisateur_id: Mapped[int] = mapped_column(BigInteger, ForeignKey("utilisateurs.id"), nullable=False)
    code_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    used: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
