from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, Enum, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.enums import Role


class Utilisateur(Base):
    __tablename__ = "utilisateurs"

    # BigInteger explicite : correspond au type reel de la base (BIGINT),
    # necessaire pour que les FK qui y pointent (sinistres.gestionnaire_id,
    # password_reset_otps.utilisateur_id) restent creables sur MySQL 8 strict.
    # with_variant(Integer, "sqlite") : voir Sinistre.id pour la raison.
    id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    password: Mapped[str] = mapped_column(String(255), nullable=False)
    nom: Mapped[str] = mapped_column(String(100), nullable=False)
    prenom: Mapped[str] = mapped_column(String(100), nullable=False)
    email: Mapped[str] = mapped_column(String(150), unique=True, nullable=False)
    telephone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    role: Mapped[Role] = mapped_column(Enum(Role), nullable=False, default=Role.GESTIONNAIRE)
    actif: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    a_vu_briefing: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    date_creation: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    sinistres: Mapped[list["Sinistre"]] = relationship(back_populates="gestionnaire")
