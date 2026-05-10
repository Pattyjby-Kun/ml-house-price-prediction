"""
House Price Prediction - ML Pipeline
=====================================
Dataset  : California Housing (sklearn built-in) — ใช้แทน Kaggle เพื่อรันได้ทันที
           * ถ้ามี Kaggle dataset ให้เปลี่ยนส่วน [SECTION 1] ได้เลย
Model    : XGBoost + Optuna Hyperparameter Tuning
Output   : model.pkl, scaler.pkl, feature_importance.png, evaluation_report.txt
"""

import os
import json
import pickle
import warnings
import numpy as np
import pandas as pd
import shap
import optuna
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

from sklearn.datasets import fetch_california_housing
from sklearn.model_selection import train_test_split, cross_val_score, KFold
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from xgboost import XGBRegressor

warnings.filterwarnings("ignore")
optuna.logging.set_verbosity(optuna.logging.WARNING)

OUTPUT_DIR = "ml_output"
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ─────────────────────────────────────────────
# SECTION 1: LOAD DATA
# ─────────────────────────────────────────────
def load_data() -> pd.DataFrame:
    """
    สร้าง synthetic dataset จำลองข้อมูลบ้านไทย (3,000 rows)
    ถ้ามีไฟล์ CSV จริงให้แทนที่ด้วย:
        df = pd.read_csv("your_data.csv")
    """
    print("📦 Generating synthetic Thai house dataset...")
    np.random.seed(42)
    n = 3000

    area          = np.random.normal(120, 40, n).clip(30, 500)        # พื้นที่ ตร.ม.
    bedrooms      = np.random.choice([1,2,3,4,5], n, p=[.05,.25,.45,.20,.05])
    bathrooms     = np.random.choice([1,2,3,4],   n, p=[.20,.45,.25,.10])
    house_age     = np.random.randint(0, 30, n).astype(float)
    distance_bts  = np.random.exponential(3, n).clip(0.1, 20)         # กม.
    floor         = np.random.randint(1, 40, n).astype(float)
    parking       = np.random.choice([0, 1, 2], n, p=[.15,.55,.30])
    # ทำเล (encode เป็น 0-4 ตามราคา)
    location_idx  = np.random.choice([0,1,2,3,4], n, p=[.10,.20,.35,.25,.10])

    # สร้างราคาจาก feature จริงๆ + noise
    price = (
          area           * 25_000
        + bedrooms       * 200_000
        + bathrooms      * 150_000
        - house_age      * 50_000
        - distance_bts   * 300_000
        + floor          * 10_000
        + parking        * 250_000
        + location_idx   * 500_000
        + np.random.normal(0, 300_000, n)
    ).clip(500_000, 30_000_000)   # 500K – 30M บาท

    df = pd.DataFrame({
        "area": area,
        "bedrooms": bedrooms,
        "bathrooms": bathrooms,
        "house_age": house_age,
        "distance_bts": distance_bts,
        "floor": floor,
        "parking": parking,
        "location_idx": location_idx,
        "price": price,
    })
    print(f"   Rows: {len(df):,}  |  Columns: {df.shape[1]}")
    return df


# ─────────────────────────────────────────────
# SECTION 2: FEATURE ENGINEERING
# ─────────────────────────────────────────────
def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    print("\n🔧 Engineering features...")

    # อัตราส่วนใหม่
    df["area_per_bedroom"]    = df["area"]      / df["bedrooms"].clip(lower=1)
    df["bath_per_bed"]        = df["bathrooms"] / df["bedrooms"].clip(lower=1)
    df["price_zone_score"]    = df["location_idx"] * (1 / df["distance_bts"].clip(lower=0.1))

    # log transform สำหรับ skewed features
    df["log_distance_bts"] = np.log1p(df["distance_bts"])
    df["log_area"]         = np.log1p(df["area"])

    # ตัด outlier ราคา (> 99th percentile)
    upper = df["price"].quantile(0.99)
    df = df[df["price"] <= upper].reset_index(drop=True)

    print(f"   Features after engineering: {df.shape[1] - 1}")
    return df


# ─────────────────────────────────────────────
# SECTION 3: PREPROCESSING
# ─────────────────────────────────────────────
def preprocess(df: pd.DataFrame):
    print("\n⚙️  Preprocessing...")

    FEATURE_COLS = [c for c in df.columns if c != "price"]
    TARGET_COL   = "price"

    X = df[FEATURE_COLS]
    y = df[TARGET_COL]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    scaler = StandardScaler()
    X_train_sc = scaler.fit_transform(X_train)
    X_test_sc  = scaler.transform(X_test)

    # บันทึก scaler
    with open(f"{OUTPUT_DIR}/scaler.pkl", "wb") as f:
        pickle.dump(scaler, f)
    with open(f"{OUTPUT_DIR}/feature_names.json", "w") as f:
        json.dump(FEATURE_COLS, f)

    print(f"   Train: {len(X_train):,}  |  Test: {len(X_test):,}")
    return X_train_sc, X_test_sc, y_train.values, y_test.values, FEATURE_COLS, scaler


# ─────────────────────────────────────────────
# SECTION 4: HYPERPARAMETER TUNING (Optuna)
# ─────────────────────────────────────────────
def tune_xgboost(X_train, y_train, n_trials: int = 40) -> dict:
    print(f"\n🔍 Tuning XGBoost with Optuna ({n_trials} trials)...")

    def objective(trial):
        params = {
            "n_estimators":      trial.suggest_int("n_estimators", 200, 1000),
            "max_depth":         trial.suggest_int("max_depth", 3, 10),
            "learning_rate":     trial.suggest_float("learning_rate", 0.01, 0.3, log=True),
            "subsample":         trial.suggest_float("subsample", 0.6, 1.0),
            "colsample_bytree":  trial.suggest_float("colsample_bytree", 0.6, 1.0),
            "min_child_weight":  trial.suggest_int("min_child_weight", 1, 10),
            "reg_alpha":         trial.suggest_float("reg_alpha", 1e-8, 10.0, log=True),
            "reg_lambda":        trial.suggest_float("reg_lambda", 1e-8, 10.0, log=True),
            "random_state": 42,
            "tree_method": "hist",
        }
        model = XGBRegressor(**params)
        kf = KFold(n_splits=5, shuffle=True, random_state=42)
        scores = cross_val_score(model, X_train, y_train, cv=kf,
                                 scoring="neg_root_mean_squared_error", n_jobs=-1)
        return scores.mean()  # Optuna maximizes → neg RMSE

    study = optuna.create_study(direction="maximize")
    study.optimize(objective, n_trials=n_trials, show_progress_bar=False)

    best = study.best_params
    print(f"   Best CV RMSE: ${-study.best_value:,.0f}")
    print(f"   Best params : {best}")
    return best


# ─────────────────────────────────────────────
# SECTION 5: TRAIN FINAL MODEL
# ─────────────────────────────────────────────
def train_model(X_train, y_train, best_params: dict) -> XGBRegressor:
    print("\n🚀 Training final model...")
    model = XGBRegressor(**best_params, random_state=42, tree_method="hist")
    model.fit(
        X_train, y_train,
        eval_set=[(X_train, y_train)],
        verbose=False,
    )
    with open(f"{OUTPUT_DIR}/model.pkl", "wb") as f:
        pickle.dump(model, f)
    print("   Model saved → ml_output/model.pkl")
    return model


# ─────────────────────────────────────────────
# SECTION 6: EVALUATE
# ─────────────────────────────────────────────
def evaluate(model, X_test, y_test, feature_names) -> dict:
    print("\n📊 Evaluating model...")
    y_pred = model.predict(X_test)

    mae  = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2   = r2_score(y_test, y_pred)
    mape = np.mean(np.abs((y_test - y_pred) / y_test)) * 100

    metrics = {"MAE": mae, "RMSE": rmse, "R2": r2, "MAPE": mape}

    print(f"   MAE  : ${mae:>12,.0f}  (ผิดพลาดเฉลี่ย)")
    print(f"   RMSE : ${rmse:>12,.0f}")
    print(f"   R²   : {r2:>13.4f}  (1.0 = perfect)")
    print(f"   MAPE : {mape:>12.2f}%")

    # ── Prediction vs Actual plot ──────────────
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))
    fig.suptitle("House Price Prediction — Model Evaluation", fontsize=14, fontweight="bold")

    ax = axes[0]
    ax.scatter(y_test, y_pred, alpha=0.3, s=8, color="#2196F3")
    lim = [min(y_test.min(), y_pred.min()), max(y_test.max(), y_pred.max())]
    ax.plot(lim, lim, "r--", linewidth=1.5, label="Perfect prediction")
    ax.set_xlabel("Actual Price ($)")
    ax.set_ylabel("Predicted Price ($)")
    ax.set_title(f"Actual vs Predicted  (R² = {r2:.4f})")
    ax.legend()

    # ── Residual plot ──────────────────────────
    residuals = y_test - y_pred
    ax2 = axes[1]
    ax2.scatter(y_pred, residuals, alpha=0.3, s=8, color="#FF5722")
    ax2.axhline(0, color="black", linewidth=1.5, linestyle="--")
    ax2.set_xlabel("Predicted Price ($)")
    ax2.set_ylabel("Residual ($)")
    ax2.set_title("Residual Plot")

    plt.tight_layout()
    plt.savefig(f"{OUTPUT_DIR}/evaluation_plot.png", dpi=150, bbox_inches="tight")
    plt.close()
    print("   Plot saved  → ml_output/evaluation_plot.png")

    # ── บันทึก report ──────────────────────────
    report = (
        "=== Model Evaluation Report ===\n"
        f"MAE  : ${mae:,.0f}\n"
        f"RMSE : ${rmse:,.0f}\n"
        f"R²   : {r2:.4f}\n"
        f"MAPE : {mape:.2f}%\n"
    )
    with open(f"{OUTPUT_DIR}/evaluation_report.txt", "w", encoding="utf-8") as f:
        f.write(report)

    return metrics


# ─────────────────────────────────────────────
# SECTION 7: SHAP EXPLAINABILITY
# ─────────────────────────────────────────────
def explain_model(model, X_test, feature_names):
    print("\n🔎 Generating SHAP feature importance...")
    sample = X_test[:300]
    explainer   = shap.TreeExplainer(model)
    shap_values = explainer.shap_values(sample)

    # ใช้ mean absolute SHAP manually เพื่อหลีกเลี่ยง shap plot issues
    mean_shap = np.abs(shap_values).mean(axis=0)
    sorted_idx = np.argsort(mean_shap)

    fig, ax = plt.subplots(figsize=(10, 6))
    bars = ax.barh(
        [feature_names[i] for i in sorted_idx],
        mean_shap[sorted_idx],
        color="#2196F3"
    )
    ax.set_xlabel("Mean |SHAP Value| (impact on price)")
    ax.set_title("Feature Importance (SHAP Values)", fontsize=13, fontweight="bold")
    plt.tight_layout()
    plt.savefig(f"{OUTPUT_DIR}/shap_importance.png", dpi=150, bbox_inches="tight")
    plt.close()
    print("   SHAP plot saved → ml_output/shap_importance.png")


# ─────────────────────────────────────────────
# SECTION 8: PREDICT FUNCTION (สำหรับ API)
# ─────────────────────────────────────────────
def predict_price(input_dict: dict) -> dict:
    """
    ใช้ฟังก์ชันนี้ใน FastAPI:
        result = predict_price({"MedInc": 5.0, "HouseAge": 10, ...})
    """
    with open(f"{OUTPUT_DIR}/model.pkl", "rb") as f:
        model = pickle.load(f)
    with open(f"{OUTPUT_DIR}/scaler.pkl", "rb") as f:
        scaler = pickle.load(f)
    with open(f"{OUTPUT_DIR}/feature_names.json") as f:
        feature_names = json.load(f)

    df_input = pd.DataFrame([input_dict])[feature_names]
    X_scaled = scaler.transform(df_input)
    price = model.predict(X_scaled)[0]

    return {
        "predicted_price": round(float(price), 2),
        "currency": "USD",
        "model": "XGBoost",
    }


# ─────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 55)
    print("  🏠 House Price AI — XGBoost Training Pipeline")
    print("=" * 55)

    df             = load_data()
    df             = engineer_features(df)
    X_tr, X_te, y_tr, y_te, feat_names, scaler = preprocess(df)
    best_params    = tune_xgboost(X_tr, y_tr, n_trials=40)
    model          = train_model(X_tr, y_tr, best_params)
    metrics        = evaluate(model, X_te, y_te, feat_names)
    explain_model(model, X_te, feat_names)

    print("\n✅ Pipeline complete! Output files:")
    for f in os.listdir(OUTPUT_DIR):
        print(f"   ml_output/{f}")
    print("\n🎯 Ready to plug into FastAPI backend!")
