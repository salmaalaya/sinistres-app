import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.inspection import permutation_importance
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from xgboost import XGBRegressor

from app.schemas.predictions import ComparaisonModeles, FacteurExplicatif, ModeleMetrics


def _candidate_models() -> dict:
    return {
        "RandomForest": RandomForestRegressor(n_estimators=200, random_state=42),
        "XGBoost": XGBRegressor(n_estimators=200, random_state=42, verbosity=0),
        "GradientBoosting": GradientBoostingRegressor(random_state=42),
    }


def _preprocessor(categorical_cols: list[str]) -> ColumnTransformer:
    return ColumnTransformer(
        [("cat", OneHotEncoder(handle_unknown="ignore"), categorical_cols)],
        remainder="passthrough",
    )


def compare_and_train(
    df: pd.DataFrame, categorical_cols: list[str], numeric_cols: list[str], target_col: str
) -> tuple[ComparaisonModeles, Pipeline]:
    """Compare RF / XGBoost / GBR sur un split train/test, puis reentraine le
    meilleur (au sens MAE) sur l'integralite des donnees pour servir les
    predictions en production."""
    feature_cols = categorical_cols + numeric_cols
    X = df[feature_cols]
    y = df[target_col]

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    resultats: dict[str, ModeleMetrics] = {}
    best_name = None
    best_mae = float("inf")

    for name, model in _candidate_models().items():
        pipeline = Pipeline([("prep", _preprocessor(categorical_cols)), ("model", model)])
        pipeline.fit(X_train, y_train)
        preds = pipeline.predict(X_test)

        mae = mean_absolute_error(y_test, preds)
        rmse = mean_squared_error(y_test, preds) ** 0.5
        r2 = r2_score(y_test, preds)
        resultats[name] = ModeleMetrics(mae=round(mae, 2), rmse=round(rmse, 2), r2=round(r2, 3))

        if mae < best_mae:
            best_mae, best_name = mae, name

    best_model_class = _candidate_models()[best_name].__class__
    best_model_params = _candidate_models()[best_name].get_params()
    full_pipeline = Pipeline(
        [("prep", _preprocessor(categorical_cols)), ("model", best_model_class(**best_model_params))]
    )
    full_pipeline.fit(X, y)

    comparaison = ComparaisonModeles(
        resultats=resultats, meilleur_modele=best_name, nombre_dossiers_entrainement=len(df)
    )
    return comparaison, full_pipeline


def compute_importances(
    pipeline: Pipeline, X: pd.DataFrame, y: pd.Series, feature_labels: dict[str, str]
) -> list[FacteurExplicatif]:
    """Approximation simple (permutation importance) de l'influence de chaque
    variable sur la precision du modele : melanger une colonne et mesurer de
    combien la performance se degrade. Ce sont des facteurs explicatifs
    (correlations apprises par le modele), pas des causes certaines."""
    result = permutation_importance(
        pipeline, X, y, n_repeats=8, random_state=42, scoring="neg_mean_absolute_error"
    )
    raw = {col: max(val, 0.0) for col, val in zip(X.columns, result.importances_mean)}
    total = sum(raw.values()) or 1.0
    items = [
        FacteurExplicatif(feature=feature_labels.get(col, col), importance_pct=round(val / total * 100, 1))
        for col, val in raw.items()
    ]
    items.sort(key=lambda f: f.importance_pct, reverse=True)
    return items
