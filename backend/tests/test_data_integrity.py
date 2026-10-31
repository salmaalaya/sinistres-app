"""Integrite des donnees.

- Le statut Ouvert/Cloture est toujours derive de date_cloture_sinistre,
  jamais stocke en colonne propre (voir app/models/sinistre.py::statut).
- La creation d'un code_sinistre en doublon est rejetee (contrainte unique).
- Les montants de reglement sont stockes en valeur absolue, y compris quand
  une valeur negative est fournie par le fichier source : cette regle est
  appliquee uniquement au moment de l'import (scripts/import_data.py), il
  n'existe aucun endpoint API pour creer un reglement - donc verifiee ici au
  niveau de la fonction d'import elle-meme, pas via l'API.
"""

from datetime import date
from decimal import Decimal

import pandas as pd
import pytest

from app.models.sinistre import Sinistre


def _make_sinistre(code: int, cloture: date | None = None) -> Sinistre:
    return Sinistre(
        code_sinistre=code,
        n_sinistre=f"N{code}",
        date_sinistre=date(2022, 1, 1),
        date_ouverture=date(2022, 1, 2),
        date_cloture_sinistre=cloture,
        nature_sin="F",
        type_sin="R",
        date_ordonnancement=date(2022, 1, 3),
    )


def test_statut_is_derived_not_stored_ouvert(db_session):
    s = _make_sinistre(910001, cloture=None)
    db_session.add(s)
    db_session.commit()
    db_session.refresh(s)

    assert "statut" not in Sinistre.__table__.columns
    assert s.statut == "OUVERT"


def test_statut_is_derived_not_stored_cloture(db_session):
    s = _make_sinistre(910002, cloture=date(2022, 6, 1))
    db_session.add(s)
    db_session.commit()
    db_session.refresh(s)

    assert s.statut == "CLOTURE"


def test_statut_flips_when_date_cloture_changes(db_session):
    s = _make_sinistre(910003, cloture=None)
    db_session.add(s)
    db_session.commit()
    assert s.statut == "OUVERT"

    s.date_cloture_sinistre = date(2022, 7, 1)
    db_session.commit()
    assert s.statut == "CLOTURE"

    s.date_cloture_sinistre = None
    db_session.commit()
    assert s.statut == "OUVERT"


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


def test_duplicate_code_sinistre_is_rejected(client, admin_headers):
    payload = _create_sinistre_payload(920001)

    first = client.post("/api/sinistres", json=payload, headers=admin_headers)
    assert first.status_code == 201

    second = client.post("/api/sinistres", json=payload, headers=admin_headers)
    assert second.status_code == 400
    assert "existe deja" in second.json()["message"]


def test_import_stores_reglement_montant_as_absolute_value(tmp_path):
    """import_data.load_excel() applique .abs() sur MONTANT_REGLEMENT avant
    tout stockage - c'est le seul point d'entree qui cree des reglements,
    il n'y a pas d'endpoint API dedie (voir app/schemas/reglement.py, qui
    n'expose qu'un ReglementResponse en lecture). Test contre la vraie
    fonction d'import, pas une reimplementation, via un fichier xlsx reel
    ecrit sur disque."""
    import sys
    from pathlib import Path

    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from scripts import import_data

    raw = pd.DataFrame(
        {
            "CODE_SINISTRE": [1, 2],
            "N_SINISTRE": ["N1", "N2"],
            "DATE_SINISTRE": ["01/01/2022", "01/01/2022"],
            "DATE_OUVERTURE": ["02/01/2022", "02/01/2022"],
            "DATE_CLOTURE_SINISTRE": [None, None],
            "NATURE_SIN": ["F", "F"],
            "TYPE_SIN": ["R", "R"],
            "DATE_RETOUR_QUITTANCE_SIGNE": [None, None],
            "DATE_ORDONNANCEMENT": ["03/01/2022", "03/01/2022"],
            "PROCESSUS": [None, "Processus Standard"],
            "MONTANT_REGLEMENT": [-1234.5, 500.0],
            "DATE_REGLEMENT": ["01/02/2022", "01/02/2022"],
        }
    )
    xlsx_path = tmp_path / "etat_test.xlsx"
    raw.to_excel(xlsx_path, index=False)

    df, processus_defaults, montants_corriges = import_data.load_excel(str(xlsx_path))

    assert montants_corriges == 1  # une seule ligne source etait negative
    assert (df["MONTANT_REGLEMENT"] >= 0).all()
    assert df.loc[df["CODE_SINISTRE"] == 1, "MONTANT_REGLEMENT"].iloc[0] == pytest.approx(1234.5)
    assert Decimal(str(df.loc[df["CODE_SINISTRE"] == 1, "MONTANT_REGLEMENT"].iloc[0])) > 0
