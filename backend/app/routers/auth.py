from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.crud.utilisateur import get_by_username
from app.schemas.auth import (
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    LoginResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
    VerifyOtpRequest,
    VerifyOtpResponse,
)
from app.services import email as email_service
from app.services import otp as otp_service

router = APIRouter(prefix="/api/auth", tags=["auth"])

GENERIC_FORGOT_MESSAGE = "Si un compte correspond a cet identifiant, un code de verification a ete envoye."


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = get_by_username(db, payload.username)
    if user is None or not user.actif or not verify_password(payload.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Nom d'utilisateur ou mot de passe incorrect",
        )
    token = create_access_token(username=user.username, role=user.role.value)
    return LoginResponse(token=token, username=user.username, role=user.role, a_vu_briefing=user.a_vu_briefing)


@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = otp_service.find_user_by_identifiant(db, payload.identifiant)
    if user is None or not user.actif:
        # Reponse generique : ne pas reveler si l'identifiant existe ou non.
        return ForgotPasswordResponse(message=GENERIC_FORGOT_MESSAGE)

    code = otp_service.generate_and_store_otp(db, user)
    is_email_identifiant = bool(user.email) and payload.identifiant == user.email
    destination = otp_service.mask_email(user.email) if is_email_identifiant else None
    if destination is None and user.telephone and payload.identifiant == user.telephone:
        destination = otp_service.mask_telephone(user.telephone)

    if is_email_identifiant:
        # Envoi reel par e-mail (SMTP) si configure ; sinon le code reste
        # journalise cote serveur par generate_and_store_otp (mode simulation).
        email_service.send_otp_email(user.email, code, otp_service.OTP_TTL_MINUTES)

    return ForgotPasswordResponse(message=GENERIC_FORGOT_MESSAGE, destination_masquee=destination)


@router.post("/verify-otp", response_model=VerifyOtpResponse)
def verify_otp(payload: VerifyOtpRequest, db: Session = Depends(get_db)):
    user = otp_service.find_user_by_identifiant(db, payload.identifiant)
    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Code invalide ou expire")

    otp = otp_service.verify_otp(db, user, payload.code)
    if otp is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Code invalide ou expire")

    reset_token = otp_service.create_reset_token(user.username)
    return VerifyOtpResponse(reset_token=reset_token)


@router.post("/reset-password", response_model=ResetPasswordResponse)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    username = otp_service.decode_reset_token(payload.reset_token)
    if username is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Jeton de reinitialisation invalide ou expire")

    user = get_by_username(db, username)
    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Jeton de reinitialisation invalide ou expire")

    user.password = hash_password(payload.new_password)
    db.commit()
    return ResetPasswordResponse(message="Mot de passe mis a jour avec succes.")
