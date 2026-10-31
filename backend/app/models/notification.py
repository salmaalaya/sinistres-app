from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class NotificationEnvoyee(Base):
    """Trace des notifications email deja envoyees, pour eviter les doublons
    (voir app/services/notifications.py : au plus un rappel tous les 7 jours
    par dossier critique)."""

    __tablename__ = "notifications_envoyees"

    id: Mapped[int] = mapped_column(primary_key=True)
    # BigInteger : doit correspondre au type reel de sinistres.id (BIGINT).
    sinistre_id: Mapped[int] = mapped_column(
        BigInteger, ForeignKey("sinistres.id", ondelete="CASCADE"), nullable=False
    )
    type_notification: Mapped[str] = mapped_column(String(50), nullable=False)
    date_envoi: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())
