from datetime import date, datetime

from sqlalchemy import BigInteger, Date, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Sinistre(Base):
    __tablename__ = "sinistres"

    # BigInteger explicite : correspond au type reel de la base (BIGINT),
    # necessaire pour que les FK qui y pointent (reglements.sinistre_id,
    # notifications_envoyees.sinistre_id) restent creables sur MySQL 8 strict.
    # with_variant(Integer, "sqlite") : sous SQLite (suite de tests), une PK
    # doit etre exactement INTEGER pour beneficier de l'alias rowid
    # autoincrement - sinon les inserts sans id explicite echouent.
    id: Mapped[int] = mapped_column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True)
    code_sinistre: Mapped[int] = mapped_column(unique=True, nullable=False)
    n_sinistre: Mapped[str] = mapped_column(String(20), nullable=False)
    date_sinistre: Mapped[date] = mapped_column(Date, nullable=False)
    date_ouverture: Mapped[date] = mapped_column(Date, nullable=False)
    date_cloture_sinistre: Mapped[date | None] = mapped_column(Date, nullable=True)
    nature_sin: Mapped[str] = mapped_column(String(5), nullable=False)
    type_sin: Mapped[str] = mapped_column(String(5), nullable=False)
    date_retour_quittance_signe: Mapped[date | None] = mapped_column(Date, nullable=True)
    date_ordonnancement: Mapped[date] = mapped_column(Date, nullable=False)
    processus: Mapped[str] = mapped_column(String(50), nullable=False, default="Processus Standard")
    gestionnaire_id: Mapped[int | None] = mapped_column(
        BigInteger, ForeignKey("utilisateurs.id", ondelete="SET NULL"), nullable=True
    )
    date_creation: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
    date_modification: Mapped[datetime] = mapped_column(
        DateTime, server_default=func.now(), onupdate=func.now()
    )

    gestionnaire: Mapped["Utilisateur | None"] = relationship(back_populates="sinistres")
    reglements: Mapped[list["Reglement"]] = relationship(
        back_populates="sinistre", cascade="all, delete-orphan"
    )

    @property
    def statut(self) -> str:
        return "OUVERT" if self.date_cloture_sinistre is None else "CLOTURE"

    @property
    def montant_total_regle(self):
        return sum((r.montant_reglement for r in self.reglements), start=0)

    @property
    def gestionnaire_nom_complet(self) -> str | None:
        if self.gestionnaire is None:
            return None
        return f"{self.gestionnaire.prenom} {self.gestionnaire.nom}"
