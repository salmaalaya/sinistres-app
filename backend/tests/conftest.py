"""Configuration pytest partagee.

Tous les tests HTTP tournent contre une base SQLite en memoire, jamais contre
la base MySQL/MariaDB de developpement : `app.core.database.engine` et
`SessionLocal` sont patches AVANT l'import de `app.main`, de sorte que le
lifespan (`ensure_default_admin`) et chaque `Depends(get_db)` utilisent tous
la meme base de test. Les tables sont recreees a chaque session pytest et
videes apres chaque test pour l'isolation.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core import database as database_module

test_engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# Doit se faire avant `import app.main` : main.py fait
# `from app.core.database import SessionLocal` au niveau module, donc le nom
# est fige dans le namespace de main.py au moment de l'import.
database_module.engine = test_engine
database_module.SessionLocal = TestSessionLocal

import app.models  # noqa: E402  (enregistre tous les mappers sur Base avant create_all)
from app.core.database import Base  # noqa: E402

Base.metadata.create_all(bind=test_engine)

import app.main as main_module  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.models.enums import Role  # noqa: E402
from app.models.utilisateur import Utilisateur  # noqa: E402


@pytest.fixture(autouse=True)
def _clean_tables():
    yield
    with test_engine.begin() as conn:
        for table in reversed(Base.metadata.sorted_tables):
            conn.execute(table.delete())


@pytest.fixture()
def db_session():
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client():
    with TestClient(main_module.app) as c:
        yield c


@pytest.fixture()
def admin_user(db_session):
    user = Utilisateur(
        username="admin_test",
        password=hash_password("Admin@123"),
        nom="Test",
        prenom="Admin",
        email="admin_test@example.com",
        role=Role.ADMIN,
        actif=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture()
def gestionnaire_user(db_session):
    user = Utilisateur(
        username="gest_test",
        password=hash_password("Gest@123"),
        nom="Test",
        prenom="Gest",
        email="gest_test@example.com",
        role=Role.GESTIONNAIRE,
        actif=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def _auth_headers(client: TestClient, username: str, password: str) -> dict:
    resp = client.post("/api/auth/login", json={"username": username, "password": password})
    assert resp.status_code == 200, resp.text
    token = resp.json()["token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture()
def admin_headers(client, admin_user):
    return _auth_headers(client, "admin_test", "Admin@123")


@pytest.fixture()
def gestionnaire_headers(client, gestionnaire_user):
    return _auth_headers(client, "gest_test", "Gest@123")
