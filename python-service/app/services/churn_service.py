import os
import sqlite3
from datetime import datetime

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

FEATURE_COLS = [
    "total_pedidos",
    "receita_total",
    "ticket_medio",
    "taxa_cancelamento",
    "total_cancelados",
    "dias_desde_ultimo_pedido",
    "pedidos_por_mes",
]


def _find_db() -> str | None:
    candidates = [
        os.getenv("DB_PATH", ""),
        os.path.join(os.path.dirname(__file__), "../../../backend/logiflow.db"),
        os.path.join(os.path.dirname(__file__), "../../../../backend/logiflow.db"),
        "./logiflow.db",
        "../backend/logiflow.db",
    ]
    for p in candidates:
        if p and os.path.exists(p):
            return os.path.abspath(p)
    return None


def _parse_dt(value) -> datetime | None:
    if not value or pd.isna(value):
        return None
    s = str(value).split(".")[0].replace("Z", "").replace("T", " ")
    try:
        return datetime.fromisoformat(s)
    except ValueError:
        return None


def _extract_features() -> pd.DataFrame:
    db_path = _find_db()
    if not db_path:
        return pd.DataFrame()

    conn = sqlite3.connect(db_path)
    query = """
        SELECT
            c.id              AS cliente_id,
            c.nome,
            c.email,
            c.cidade,
            c.estado,
            COUNT(DISTINCT p.id)                                           AS total_pedidos,
            COALESCE(SUM(pi.quantidade * pi.precoUnitario), 0)             AS receita_total,
            COUNT(DISTINCT CASE WHEN p.status = 'Cancelado' THEN p.id END) AS total_cancelados,
            MAX(p.criadoEm)  AS ultimo_pedido,
            MIN(p.criadoEm)  AS primeiro_pedido
        FROM clientes c
        LEFT JOIN pedidos      p  ON p.clienteId = c.id
        LEFT JOIN pedido_itens pi ON pi.pedidoId  = p.id
        GROUP BY c.id, c.nome, c.email, c.cidade, c.estado
    """
    df = pd.read_sql_query(query, conn)
    conn.close()

    now = datetime.now()

    df["taxa_cancelamento"] = df.apply(
        lambda r: r["total_cancelados"] / r["total_pedidos"] if r["total_pedidos"] > 0 else 0.0,
        axis=1,
    )
    df["ticket_medio"] = df.apply(
        lambda r: r["receita_total"] / r["total_pedidos"] if r["total_pedidos"] > 0 else 0.0,
        axis=1,
    )

    def dias_desde(val):
        dt = _parse_dt(val)
        return (now - dt).days if dt else 999

    def meses_ativo(row):
        dt = _parse_dt(row["primeiro_pedido"])
        if not dt:
            return 1.0
        return max(1.0, (now - dt).days / 30.0)

    df["dias_desde_ultimo_pedido"] = df["ultimo_pedido"].apply(dias_desde)
    df["pedidos_por_mes"] = df.apply(
        lambda r: r["total_pedidos"] / meses_ativo(r), axis=1
    )

    return df


def _generate_synthetic(n: int = 600) -> tuple[pd.DataFrame, pd.Series]:
    rng = np.random.default_rng(42)

    # Active (60 %)
    n_a = int(n * 0.60)
    active = pd.DataFrame({
        "total_pedidos":             rng.integers(3, 30, n_a),
        "receita_total":             rng.uniform(500, 50_000, n_a),
        "ticket_medio":              rng.uniform(100, 2_000, n_a),
        "taxa_cancelamento":         rng.uniform(0.0, 0.20, n_a),
        "total_cancelados":          rng.integers(0, 3, n_a),
        "dias_desde_ultimo_pedido":  rng.integers(1, 45, n_a),
        "pedidos_por_mes":           rng.uniform(0.5, 4.0, n_a),
    })

    # At-risk (20 %)
    n_r = int(n * 0.20)
    at_risk = pd.DataFrame({
        "total_pedidos":             rng.integers(1, 10, n_r),
        "receita_total":             rng.uniform(100, 5_000, n_r),
        "ticket_medio":              rng.uniform(50, 500, n_r),
        "taxa_cancelamento":         rng.uniform(0.20, 0.45, n_r),
        "total_cancelados":          rng.integers(1, 5, n_r),
        "dias_desde_ultimo_pedido":  rng.integers(30, 90, n_r),
        "pedidos_por_mes":           rng.uniform(0.1, 1.0, n_r),
    })

    # Churned (20 %)
    n_c = n - n_a - n_r
    churned = pd.DataFrame({
        "total_pedidos":             rng.integers(1, 8, n_c),
        "receita_total":             rng.uniform(50, 3_000, n_c),
        "ticket_medio":              rng.uniform(50, 400, n_c),
        "taxa_cancelamento":         rng.uniform(0.40, 1.0, n_c),
        "total_cancelados":          rng.integers(2, 8, n_c),
        "dias_desde_ultimo_pedido":  rng.integers(60, 365, n_c),
        "pedidos_por_mes":           rng.uniform(0.01, 0.5, n_c),
    })

    X = pd.concat([active, at_risk, churned], ignore_index=True)
    # Label: churned if cancellation rate > 40 % OR last purchase > 90 days ago
    y = ((X["taxa_cancelamento"] > 0.40) | (X["dias_desde_ultimo_pedido"] > 90)).astype(int)
    return X, y


def _clip_outliers(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    for col in FEATURE_COLS:
        if col not in out.columns:
            continue
        q1, q3 = out[col].quantile(0.25), out[col].quantile(0.75)
        iqr = q3 - q1
        if iqr > 0:
            out[col] = out[col].clip(q1 - 1.5 * iqr, q3 + 1.5 * iqr)
    return out


class ChurnService:
    def __init__(self):
        self._model: RandomForestClassifier | None = None
        self._scaler: StandardScaler | None = None
        self._trained = False
        self.metrics: dict = {}

    # ------------------------------------------------------------------
    # Training
    # ------------------------------------------------------------------

    def train(self) -> dict:
        X_syn, y_syn = _generate_synthetic(600)

        # Augment with real data when available
        real = _extract_features()
        if not real.empty and real["total_pedidos"].sum() > 0:
            X_real = real[FEATURE_COLS].fillna(0)
            y_real = (
                (real["taxa_cancelamento"] > 0.40) | (real["dias_desde_ultimo_pedido"] > 90)
            ).astype(int)
            X_syn = pd.concat([X_syn, X_real], ignore_index=True)
            y_syn = pd.concat([y_syn, y_real], ignore_index=True)

        # Remove duplicates
        combined = X_syn.copy()
        combined["__y__"] = y_syn.values
        combined = combined.drop_duplicates()
        y_syn = combined.pop("__y__")
        X_syn = combined

        # Clip outliers (IQR)
        X_syn = _clip_outliers(X_syn)

        X_tr, X_te, y_tr, y_te = train_test_split(
            X_syn, y_syn, test_size=0.20, random_state=42, stratify=y_syn
        )

        # Z-Score normalisation
        self._scaler = StandardScaler()
        X_tr_s = self._scaler.fit_transform(X_tr)
        X_te_s = self._scaler.transform(X_te)

        # Random Forest
        self._model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_leaf=3,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1,
        )
        self._model.fit(X_tr_s, y_tr)

        y_pred = self._model.predict(X_te_s)
        report = classification_report(y_te, y_pred, output_dict=True, zero_division=0)

        importances = dict(zip(FEATURE_COLS, self._model.feature_importances_.tolist()))

        self.metrics = {
            "acuracia": round(float(report["accuracy"]), 4),
            "precisao_churn": round(float(report.get("1", {}).get("precision", 0)), 4),
            "recall_churn": round(float(report.get("1", {}).get("recall", 0)), 4),
            "f1_churn": round(float(report.get("1", {}).get("f1-score", 0)), 4),
            "n_amostras_treino": int(len(X_syn)),
            "importancia_features": importances,
        }
        self._trained = True
        return self.metrics

    # ------------------------------------------------------------------
    # Prediction
    # ------------------------------------------------------------------

    def _ensure_trained(self):
        if not self._trained:
            self.train()

    def predict_all(self) -> list[dict]:
        self._ensure_trained()

        df = _extract_features()
        if df.empty:
            return []

        X = df[FEATURE_COLS].fillna(0)
        X_clipped = _clip_outliers(X)
        X_scaled = self._scaler.transform(X_clipped)  # type: ignore[union-attr]

        proba = self._model.predict_proba(X_scaled)  # type: ignore[union-attr]
        # Column index for class "1" (churned)
        classes = list(self._model.classes_)
        churn_idx = classes.index(1) if 1 in classes else 1
        churn_proba = proba[:, churn_idx]

        results = []
        for i, row in df.iterrows():
            cp = float(churn_proba[i])

            if cp >= 0.70:
                risco = "Alto"
            elif cp >= 0.40:
                risco = "Médio"
            else:
                risco = "Baixo"

            freq = min(1.0, float(row["pedidos_por_mes"]) / 4.0)
            scoring = round((1.0 - cp) * 0.70 + freq * 0.30, 4)

            dias = int(row["dias_desde_ultimo_pedido"])

            results.append({
                "cliente_id": row["cliente_id"],
                "nome": row["nome"],
                "email": row["email"],
                "cidade": row["cidade"],
                "estado": row["estado"],
                "total_pedidos": int(row["total_pedidos"]),
                "receita_total": round(float(row["receita_total"]), 2),
                "ticket_medio": round(float(row["ticket_medio"]), 2),
                "taxa_cancelamento": round(float(row["taxa_cancelamento"]), 4),
                "total_cancelados": int(row["total_cancelados"]),
                "dias_desde_ultimo_pedido": dias if dias < 999 else None,
                "pedidos_por_mes": round(float(row["pedidos_por_mes"]), 4),
                "probabilidade_churn": round(cp, 4),
                "risco_churn": risco,
                "scoring_compra": scoring,
            })

        return sorted(results, key=lambda x: x["probabilidade_churn"], reverse=True)

    def get_summary(self) -> dict:
        self._ensure_trained()
        preds = self.predict_all()

        if not preds:
            return {
                "total": 0,
                "alto_risco": 0,
                "medio_risco": 0,
                "baixo_risco": 0,
                "churn_medio": 0.0,
                "metricas_modelo": self.metrics,
            }

        return {
            "total": len(preds),
            "alto_risco": sum(1 for p in preds if p["risco_churn"] == "Alto"),
            "medio_risco": sum(1 for p in preds if p["risco_churn"] == "Médio"),
            "baixo_risco": sum(1 for p in preds if p["risco_churn"] == "Baixo"),
            "churn_medio": round(
                sum(p["probabilidade_churn"] for p in preds) / len(preds), 4
            ),
            "metricas_modelo": self.metrics,
        }


# Singleton – loaded once at startup, reused across requests
churn_service = ChurnService()