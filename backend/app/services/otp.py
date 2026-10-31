import hashlib
import logging
import secrets
from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.otp import PasswordResetOtp
from app.models.utilisateur import Utilisateur

logger = logging.getLogger("app.otp")

OTP_LENGTH = 6
OTP_TTL_MINUTES = 10
MAX_ATTEMPTS = 5
RESET_TOKEN_TTL_MINUTES = 10


def _hash_code(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


def generate_and_store_otp(db: Session, user: Utilisateur) -> str:
    code = f"{secrets.randbelow(10**OTP_LENGTH):0{OTP_LENGTH}d}"
    otp = PasswordResetOtp(
        utilisateur_id=user.id,
        code_hash=_hash_code(code),
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=OTP_TTL_MINUTES),
        attempts=0,
        used=False,
    )
    db.add(otp)
    db.commit()
    # Mode simulation : le code n'est jamais renvoye dans la reponse API,
    # il est uniquement journalise cote serveur (equivalent d'un envoi SMS/e-mail reel).
    logger.info("Code OTP simule pour %s : %s (expire dans %s min)", user.username, code, OTP_TTL_MINUTES)
    return code


def mask_email(email: str) -> str:
    local, _, domain = email.partition("@")
    if len(local) <= 2:
        masked_local = local[0] + "*" * max(len(local) - 1, 1)
    else:
        masked_local = local[0] + "*" * (len(local) - 2) + local[-1]
    return f"{masked_local}@{domain}"


def mask_telephone(telephone: str) -> str:
    digits = telephone[-2:] if len(telephone) >= 2 else telephone
    return "*" * max(len(telephone) - 2, 0) + digits


def find_user_by_identifiant(db: Session, identifiant: str) -> Utilisateur | None:
    return (
        db.query(Utilisateur)
        .filter((Utilisateur.email == identifiant) | (Utilisateur.telephone == identifiant))
        .first()
    )


def verify_otp(db: Session, user: Utilisateur, code: str) -> PasswordResetOtp | None:
    otp = (
        db.query(PasswordResetOtp)
        .filter(PasswordResetOtp.utilisateur_id == user.id, PasswordResetOtp.used.is_(False))
        .order_by(PasswordResetOtp.created_at.desc())
        .first()
    )
    if otp is None:
        return None
    if otp.attempts >= MAX_ATTEMPTS:
        return None
    now = datetime.now(timezone.utc)
    expires_at = otp.expires_at if otp.expires_at.tzinfo else otp.expires_at.replace(tzinfo=timezone.utc)
    if expires_at < now:
        return None
    if otp.code_hash != _hash_code(code):
        otp.attempts += 1
        db.commit()
        return None
    otp.used = True
    db.commit()
    return otp


def create_reset_token(username: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=RESET_TOKEN_TTL_MINUTES)
    payload = {"sub": username, "type": "pwd_reset", "exp": expire}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_reset_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except JWTError:
        return None
    if payload.get("type") != "pwd_reset":
        return None
    return payload.get("sub")
