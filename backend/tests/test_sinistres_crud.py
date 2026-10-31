"""CRUD de base sur /api/sinistres et filtres de listage."""

from datetime import date


def _payload(code: int, **overrides) -> dict:
    base = {
        "codeSinistre": code,
        "nSinistre": f"N{code}",
        "dateSinistre": str(date(2022, 1, 1)),
        "dateOuverture": str(date(2022, 1, 2)),
        "dateClotureSinistre": None,
        "natureSin": "F",
        "typeSin": "R",
        "dateOrdonnancement": str(date(2022, 1, 3)),
        "processus": "Processus Standard",
    }
    base.update(overrides)
    return base


def test_create_sinistre(client, admin_headers):
    resp = client.post("/api/sinistres", json=_payload(930001), headers=admin_headers)
    assert resp.status_code == 201
    body = resp.json()
    assert body["codeSinistre"] == 930001
    assert body["statut"] == "OUVERT"


def test_read_sinistre(client, admin_headers):
    created = client.post("/api/sinistres", json=_payload(930002), headers=admin_headers).json()
    resp = client.get(f"/api/sinistres/{created['id']}", headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["codeSinistre"] == 930002


def test_read_missing_sinistre_returns_404(client, admin_headers):
    resp = client.get("/api/sinistres/999999", headers=admin_headers)
    assert resp.status_code == 404


def test_update_sinistre(client, admin_headers):
    created = client.post("/api/sinistres", json=_payload(930003), headers=admin_headers).json()

    updated_payload = _payload(930003, nSinistre="N-updated", dateClotureSinistre=str(date(2022, 5, 1)))
    resp = client.put(f"/api/sinistres/{created['id']}", json=updated_payload, headers=admin_headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["nSinistre"] == "N-updated"
    assert body["statut"] == "CLOTURE"


def test_delete_sinistre(client, admin_headers):
    created = client.post("/api/sinistres", json=_payload(930004), headers=admin_headers).json()

    resp = client.delete(f"/api/sinistres/{created['id']}", headers=admin_headers)
    assert resp.status_code == 204
    assert client.get(f"/api/sinistres/{created['id']}", headers=admin_headers).status_code == 404


def test_gestionnaire_can_create_and_update(client, gestionnaire_headers):
    created = client.post("/api/sinistres", json=_payload(930005), headers=gestionnaire_headers)
    assert created.status_code == 201

    updated = client.put(
        f"/api/sinistres/{created.json()['id']}",
        json=_payload(930005, nSinistre="N-gest"),
        headers=gestionnaire_headers,
    )
    assert updated.status_code == 200


def test_list_filters_by_nature(client, admin_headers):
    client.post("/api/sinistres", json=_payload(930010, natureSin="F"), headers=admin_headers)
    client.post("/api/sinistres", json=_payload(930011, natureSin="D"), headers=admin_headers)

    resp = client.get("/api/sinistres", params={"nature": "F", "size": 200}, headers=admin_headers)
    assert resp.status_code == 200
    codes = [item["codeSinistre"] for item in resp.json()["content"]]
    assert 930010 in codes
    assert 930011 not in codes


def test_list_filters_by_type(client, admin_headers):
    client.post("/api/sinistres", json=_payload(930020, typeSin="R"), headers=admin_headers)
    client.post("/api/sinistres", json=_payload(930021, typeSin="C"), headers=admin_headers)

    resp = client.get("/api/sinistres", params={"type": "C", "size": 200}, headers=admin_headers)
    codes = [item["codeSinistre"] for item in resp.json()["content"]]
    assert 930021 in codes
    assert 930020 not in codes


def test_list_filters_by_statut(client, admin_headers):
    client.post("/api/sinistres", json=_payload(930030), headers=admin_headers)
    client.post(
        "/api/sinistres",
        json=_payload(930031, dateClotureSinistre=str(date(2022, 6, 1))),
        headers=admin_headers,
    )

    ouverts = client.get(
        "/api/sinistres", params={"statut": "OUVERT", "size": 200}, headers=admin_headers
    ).json()["content"]
    codes_ouverts = [item["codeSinistre"] for item in ouverts]
    assert 930030 in codes_ouverts
    assert 930031 not in codes_ouverts

    clotures = client.get(
        "/api/sinistres", params={"statut": "CLOTURE", "size": 200}, headers=admin_headers
    ).json()["content"]
    codes_clotures = [item["codeSinistre"] for item in clotures]
    assert 930031 in codes_clotures
    assert 930030 not in codes_clotures


def test_list_filters_by_date_range(client, admin_headers):
    client.post(
        "/api/sinistres",
        json=_payload(930040, dateOuverture=str(date(2022, 1, 15))),
        headers=admin_headers,
    )
    client.post(
        "/api/sinistres",
        json=_payload(930041, dateOuverture=str(date(2022, 6, 15))),
        headers=admin_headers,
    )

    resp = client.get(
        "/api/sinistres",
        params={
            "dateOuvertureDebut": str(date(2022, 1, 1)),
            "dateOuvertureFin": str(date(2022, 2, 1)),
            "size": 200,
        },
        headers=admin_headers,
    )
    codes = [item["codeSinistre"] for item in resp.json()["content"]]
    assert 930040 in codes
    assert 930041 not in codes
