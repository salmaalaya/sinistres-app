from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.enums import Role
from app.models.utilisateur import Utilisateur

DEFAULT_ADMIN_USERNAME = "admin"
DEFAULT_ADMIN_PASSWORD = "Admin@123"


def get_by_username(db: Session, username: str) -> Utilisateur | None:
    return db.query(Utilisateur).filter(Utilisateur.username == username).first()


def ensure_default_admin(db: Session) -> None:
    if get_by_username(db, DEFAULT_ADMIN_USERNAME) is not None:
        return
    admin = Utilisateur(
        username=DEFAULT_ADMIN_USERNAME,
        password=hash_password(DEFAULT_ADMIN_PASSWORD),
        nom="Admin",
        prenom="BIAT",
        email="admin@biat.tn",
        role=Role.ADMIN,
        actif=True,
    )
    db.add(admin)
    db.commit()
