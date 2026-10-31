from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import DECIMAL, BigInteger, Date, DateTime, ForeignKey, Integer, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Reglement(Base):
    __tablename__ = "reglements"

    # BigInteger explicite : correspond au type reel de la base (BIGINT).
    # with_variant(Integer, "sqlite") : voir Sinistre.id pour la raison.
    id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True)
    sinistre_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("sinistres.id", ondelete="CASCADE"), nullable=False
    )
    montant_reglement: Mapped[Decimal] = mapped_column(DECIMAL(15, 3), nullable=False)
    date_reglement: Mapped[date] = mapped_column(Date, nullable=False)
    date_creation: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    sinistre: Mapped["Sinistre"] = relationship(back_populates="reglements")
