from pydantic_settings import BaseSettings, PydanticBaseSettingsSource, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    database_url: str = "mysql+pymysql://root:@localhost:3306/sinistres_db"
    jwt_secret_key: str = "dev-only-secret"
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 480
    cors_origins: str = "http://localhost:5173"
    openai_api_key: str = ""
    gemini_api_key: str = ""
    llm_provider: str = "gemini"  # "gemini" ou "openai" - voir app/services/llm_provider.py
    assistant_db_url: str = ""
    assistant_model: str = "gpt-4o-mini"
    gemini_model: str = "gemini-3.6-flash"
    tesseract_cmd: str = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    tessdata_prefix: str = "tessdata"
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_address: str = ""
    frontend_url: str = "http://localhost:3000"
    notifications_heure: str = "08:00"  # HH:MM, voir app/services/notifications_scheduler.py

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls,
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ):
        # backend/.env doit toujours l'emporter sur les variables
        # d'environnement du systeme (l'ordre pydantic-settings par defaut
        # est l'inverse) : une variable Windows globale perimee - vu en
        # pratique avec un vieux OPENAI_API_KEY pose au niveau User/Machine -
        # ne doit jamais masquer silencieusement la config du projet.
        return init_settings, dotenv_settings, env_settings, file_secret_settings


settings = Settings()
