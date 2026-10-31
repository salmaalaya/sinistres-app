from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

from app.models.enums import Role


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    token: str
    username: str
    role: Role
    a_vu_briefing: bool


class OtpBase(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class ForgotPasswordRequest(OtpBase):
    identifiant: str


class ForgotPasswordResponse(OtpBase):
    message: str
    destination_masquee: str | None = None


class VerifyOtpRequest(OtpBase):
    identifiant: str
    code: str


class VerifyOtpResponse(OtpBase):
    reset_token: str


class ResetPasswordRequest(OtpBase):
    reset_token: str
    new_password: str = Field(min_length=8)


class ResetPasswordResponse(OtpBase):
    message: str
