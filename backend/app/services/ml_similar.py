import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.neighbors import NearestNeighbors
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sqlalchemy.orm import Session

from app.models.sinistre import Sinistre
from app.schemas.predictions import DossierSimilaire

CATEGORICAL_COLS = ["nature_sin", "type_sin", "processus"]
ALL_NUMERIC_COLS = ["montant_total_regle", "duree_jours"]

_cache: dict = {}


def _build_dataframe(db: Session) -> pd.DataFrame:
    # Uniquement des dossiers reellement clotures : on ne compare jamais un
    # dossier ouvert (duree/montant final encore inconnus) a une nouvelle estimation.
    sinistres = db.query(Sinistre).filter(Sinistre.date_cloture_sinistre.isnot(None)).all()
    rows = [
        {
            "id": s.id,
            "code_sinistre": s.code_sinistre,
            "n_sinistre": s.n_sinistre,
            "nature_sin": s.nature_sin,
            "type_sin": s.type_sin,
            "processus": s.processus,
            "montant_total_regle": float(s.montant_total_regle),
            "duree_jours": (s.date_cloture_sinistre - s.date_ouverture).days,
            "date_cloture_sinistre": s.date_cloture_sinistre,
        }
        for s in sinistres
    ]
    return pd.DataFrame(rows)


def _get_index(db: Session, numeric_cols: tuple[str, ...]):
    cache_key = f"index:{numeric_cols}"
    if cache_key not in _cache:
        df = _build_dataframe(db)
        preprocessor = ColumnTransformer(
            [
                ("cat", OneHotEncoder(handle_unknown="ignore"), CATEGORICAL_COLS),
                ("num", StandardScaler(), list(numeric_cols)),
            ]
        )
        features = preprocessor.fit_transform(df[CATEGORICAL_COLS + list(numeric_cols)])
        nn = NearestNeighbors(n_neighbors=min(5, len(df)))
        nn.fit(features)
        _cache[cache_key] = (df, preprocessor, nn)
    return _cache[cache_key]


def find_similar(
    db: Session,
    nature_sin: str,
    type_sin: str,
    processus: str,
    montant_total_regle: float,
    duree_jours: float | None = None,
    k: int = 5,
) -> list[DossierSimilaire]:
    numeric_cols = ALL_NUMERIC_COLS if duree_jours is not None else ("montant_total_regle",)
    df, preprocessor, nn = _get_index(db, numeric_cols)
    if df.empty:
        return []

    query_row = {
        "nature_sin": nature_sin,
        "type_sin": type_sin,
        "processus": processus,
        "montant_total_regle": montant_total_regle,
    }
    if duree_jours is not None:
        query_row["duree_jours"] = duree_jours
    query = pd.DataFrame([query_row])
    query_vec = preprocessor.transform(query)
    distances, indices = nn.kneighbors(query_vec, n_neighbors=min(k, len(df)))

    results = []
    for dist, idx in zip(distances[0], indices[0]):
        row = df.iloc[idx]
        similarite = round(100 / (1 + dist), 1)
        results.append(
            DossierSimilaire(
                id=int(row["id"]),
                code_sinistre=int(row["code_sinistre"]),
                n_sinistre=row["n_sinistre"],
                nature_sin=row["nature_sin"],
                type_sin=row["type_sin"],
                processus=row["processus"],
                montant_total_regle=row["montant_total_regle"],
                duree_jours=int(row["duree_jours"]),
                date_cloture_sinistre=row["date_cloture_sinistre"],
                similarite_pct=similarite,
            )
        )
    return results
