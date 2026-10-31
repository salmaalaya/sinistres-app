"""Authentification et autorisation."""

from datetime import date

from jose import jwt

from app.core.config import settings


def test_login_success_returns_valid_token(client, admin_user):
    resp = client.post("/api/auth/login", json={"username": "admin_test", "password": "Admin@123"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["username"] == "admin_test"
    assert body["role"] == "ADMIN"
    payload = jwt.decode(body["token"], settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    assert payload["sub"] == "admin_test"
    assert payload["role"] == "ADMIN"


def test_login_wrong_password_returns_401(client, admin_user):
    resp = client.post("/api/auth/login", json={"username": "admin_test", "password": "wrong"})
    assert resp.status_code == 401


def test_login_unknown_username_returns_401(client):
    resp = client.post("/api/auth/login", json={"username": "does-not-exist", "password": "x"})
    assert resp.status_code == 401


def test_login_inactive_user_returns_401(client, db_session, admin_user):
    admin_user.actif = False
    db_session.add(admin_user)
    db_session.commit()

    resp = client.post("/api/auth/login", json={"username": "admin_test", "password": "Admin@123"})
    assert resp.status_code == 401


def test_protected_route_without_token_is_rejected(client):
    resp = client.get("/api/sinistres")
    assert resp.status_code in (401, 403)


def test_protected_route_with_invalid_token_is_rejected(client):
    resp = client.get("/api/sinistres", headers={"Authorization": "Bearer not-a-real-token"})
    assert resp.status_code == 401


def test_protected_route_with_expired_token_is_rejected(client, admin_user):
    from datetime import datetime, timedelta, timezone

    expired_payload = {
        "sub": "admin_test",
        "role": "ADMIN",
        "exp": datetime.now(timezone.utc) - timedelta(minutes=1),
    }
    expired_token = jwt.encode(expired_payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)

    resp = client.get("/api/sinistres", headers={"Authorization": f"Bearer {expired_token}"})
    assert resp.status_code == 401


def _create_sinistre_payload(code: int) -> dict:
    return {
        "codeSinistre": code,
        "nSinistre": f"N{code}",
        "dateSinistre": str(date(2022, 1, 1)),
        "dateOuverture": str(date(2022, 1, 2)),
        "natureSin": "F",
        "typeSin": "R",
        "dateOrdonnancement": str(date(2022, 1, 3)),
        "processus": "Processus Standard",
    }


def test_gestionnaire_cannot_delete_sinistre(client, gestionnaire_headers, admin_headers):
    create_resp = client.post(
        "/api/sinistres", json=_create_sinistre_payload(900001), headers=admin_headers
    )
    assert create_resp.status_code == 201
    sinistre_id = create_resp.json()["id"]

    resp = client.delete(f"/api/sinistres/{sinistre_id}", headers=gestionnaire_headers)
    assert resp.status_code == 403


def test_admin_can_delete_sinistre(client, admin_headers):
    create_resp = client.post(
        "/api/sinistres", json=_create_sinistre_payload(900002), headers=admin_headers
    )
    assert create_resp.status_code == 201
    sinistre_id = create_resp.json()["id"]

    resp = client.delete(f"/api/sinistres/{sinistre_id}", headers=admin_headers)
    assert resp.status_code == 204

    get_resp = client.get(f"/api/sinistres/{sinistre_id}", headers=admin_headers)
    assert get_resp.status_code == 404
