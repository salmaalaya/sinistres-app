import logging
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.config import settings
from app.core.database import SessionLocal
from app.crud.utilisateur import ensure_default_admin
from app.routers import (
    alertes,
    anomalies,
    assistant,
    auth,
    briefing,
    calendrier,
    dashboard,
    delais,
    ocr,
    financier,
    notifications,
    predictions,
    previsions,
    process_mining,
    public,
    qualite,
    scores,
    sinistres,
)
from app.services import notifications_scheduler

def _ensure_console_logging(logger_name: str) -> None:
    # Uvicorn's default root logger has no handler and sits at WARNING, so a
    # plain logging.info() from an app.* logger vanishes silently otherwise.
    logger = logging.getLogger(logger_name)
    logger.setLevel(logging.INFO)
    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s: %(message)s"))
        logger.addHandler(handler)


for _name in ("app.otp", "app.email", "app.notifications"):
    _ensure_console_logging(_name)


@asynccontextmanager
async def lifespan(app: FastAPI):
    db = SessionLocal()
    try:
        ensure_default_admin(db)
    finally:
        db.close()
    notifications_scheduler.start()
    yield
    notifications_scheduler.shutdown()


app = FastAPI(title="Sinistres BIAT API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": exc.status_code,
            "message": exc.detail,
        },
        headers=getattr(exc, "headers", None) or {},
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    field_errors: dict[str, str] = {}
    for err in exc.errors():
        loc = err.get("loc", ())
        field = str(loc[-1]) if loc else "unknown"
        field_errors[field] = err.get("msg", "Valeur invalide")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "status": status.HTTP_422_UNPROCESSABLE_ENTITY,
            "message": "Donnees invalides",
            "fieldErrors": field_errors,
        },
    )


app.include_router(auth.router)
app.include_router(briefing.router)
app.include_router(sinistres.router)
app.include_router(dashboard.router)
app.include_router(delais.router)
app.include_router(alertes.router)
app.include_router(anomalies.router)
app.include_router(predictions.router)
app.include_router(scores.router)
app.include_router(process_mining.router)
app.include_router(financier.router)
app.include_router(previsions.router)
app.include_router(assistant.router)
app.include_router(ocr.router)
app.include_router(calendrier.router)
app.include_router(qualite.router)
app.include_router(public.router)
app.include_router(notifications.router)


@app.get("/api/health")
def health():
    return {"status": "ok"}
