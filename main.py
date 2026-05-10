"""
House Price AI — FastAPI Backend
==================================
รัน: uvicorn main:app --reload --port 8000
Docs: http://localhost:8000/docs
"""

import json
import pickle
import numpy as np
import pandas as pd
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ─────────────────────────────────────────────
# APP SETUP
# ─────────────────────────────────────────────
app = FastAPI(
    title="House Price AI API",
    description="API สำหรับทำนายราคาบ้านด้วย XGBoost",
    version="1.0.0",
)

# CORS — อนุญาต Frontend เรียก API ได้
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # production ให้ระบุ domain จริง
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# LOAD MODEL (โหลดครั้งเดียวตอน start)
# ─────────────────────────────────────────────
ML_DIR = Path("ml_output")

def load_artifacts():
    try:
        model = pickle.load(open(ML_DIR / "model.pkl", "rb"))
        scaler = pickle.load(open(ML_DIR / "scaler.pkl", "rb"))
        feature_names = json.load(open(ML_DIR / "feature_names.json"))
        print("✅ Model loaded successfully")
        return model, scaler, feature_names
    except FileNotFoundError:
        print("❌ model.pkl not found — run house_price_model.py first!")
        return None, None, None

model, scaler, feature_names = load_artifacts()


# ─────────────────────────────────────────────
# SCHEMAS (Input / Output)
# ─────────────────────────────────────────────
class HouseInput(BaseModel):
    area: float          = Field(..., gt=0,   example=120,  description="พื้นที่ใช้สอย (ตร.ม.)")
    bedrooms: int        = Field(..., ge=1,   example=3,    description="จำนวนห้องนอน")
    bathrooms: int       = Field(..., ge=1,   example=2,    description="จำนวนห้องน้ำ")
    house_age: float     = Field(..., ge=0,   example=5,    description="อายุบ้าน (ปี)")
    distance_bts: float  = Field(..., gt=0,   example=1.5,  description="ระยะห่าง BTS/MRT (กม.)")
    floor: int           = Field(..., ge=1,   example=10,   description="ชั้น")
    parking: int         = Field(..., ge=0,   example=1,    description="จำนวนที่จอดรถ")
    location_idx: int    = Field(..., ge=0, le=4, example=3,
                                 description="ทำเล: 0=ชานเมือง, 1=รอบนอก, 2=กลาง, 3=ใจกลาง, 4=CBD")

class PredictResponse(BaseModel):
    predicted_price: float
    price_formatted: str
    confidence_note: str
    input_summary: dict

class MarketStats(BaseModel):
    avg_price: float
    min_price: float
    max_price: float
    total_listings: int


# ─────────────────────────────────────────────
# HELPER
# ─────────────────────────────────────────────
def build_features(data: HouseInput) -> pd.DataFrame:
    """สร้าง feature เหมือนตอน train"""
    d = data.dict()
    d["area_per_bedroom"]  = d["area"]      / max(d["bedrooms"], 1)
    d["bath_per_bed"]      = d["bathrooms"] / max(d["bedrooms"], 1)
    d["price_zone_score"]  = d["location_idx"] * (1 / max(d["distance_bts"], 0.1))
    d["log_distance_bts"]  = np.log1p(d["distance_bts"])
    d["log_area"]          = np.log1p(d["area"])
    return pd.DataFrame([d])[feature_names]


# ─────────────────────────────────────────────
# ROUTES
# ─────────────────────────────────────────────

@app.get("/", tags=["General"])
def root():
    return {
        "message": "House Price AI API",
        "status": "running",
        "model_loaded": model is not None,
        "docs": "/docs",
    }


@app.get("/health", tags=["General"])
def health_check():
    return {
        "status": "ok",
        "model_ready": model is not None,
    }


@app.post("/predict", response_model=PredictResponse, tags=["Prediction"])
def predict_price(data: HouseInput):
    """
    ทำนายราคาบ้านจากข้อมูลที่กรอก
    """
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="Model not loaded. Please run house_price_model.py first."
        )

    try:
        df_input  = build_features(data)
        X_scaled  = scaler.transform(df_input)
        price     = float(model.predict(X_scaled)[0])
        price     = max(price, 0)

        # Format ราคาเป็น string
        if price >= 1_000_000:
            price_fmt = f"{price/1_000_000:.2f} ล้านบาท"
        else:
            price_fmt = f"{price:,.0f} บาท"

        return PredictResponse(
            predicted_price=round(price, 2),
            price_formatted=price_fmt,
            confidence_note="ค่าประมาณการณ์ ± 9% (MAPE จากการทดสอบ)",
            input_summary=data.dict(),
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/market/stats", tags=["Market"])
def market_stats():
    """
    สถิติตลาดรวม (mock data — เชื่อม DB จริงได้ภายหลัง)
    """
    return {
        "avg_price":      4_500_000,
        "min_price":        800_000,
        "max_price":     25_000_000,
        "total_listings":      3000,
        "currency": "THB",
        "note": "ข้อมูลจาก synthetic dataset",
    }


@app.get("/market/trends", tags=["Market"])
def market_trends():
    """
    แนวโน้มราคาตามไตรมาส (mock data)
    """
    trends = [
        {"quarter": "Q1 2024", "avg_price": 4_100_000},
        {"quarter": "Q2 2024", "avg_price": 4_250_000},
        {"quarter": "Q3 2024", "avg_price": 4_380_000},
        {"quarter": "Q4 2024", "avg_price": 4_500_000},
        {"quarter": "Q1 2025", "avg_price": 4_620_000},
    ]
    return {"trends": trends, "currency": "THB"}


@app.get("/locations", tags=["Reference"])
def get_locations():
    """
    รายการทำเลและ index ที่ใช้ใน model
    """
    return {
        "locations": [
            {"idx": 0, "name": "ชานเมือง",   "example": "มีนบุรี, หนองจอก"},
            {"idx": 1, "name": "รอบนอก",     "example": "ลาดกระบัง, บางขุนเทียน"},
            {"idx": 2, "name": "กลางเมือง",  "example": "บางนา, อ่อนนุช"},
            {"idx": 3, "name": "ใจกลาง",     "example": "พระโขนง, ทองหล่อ"},
            {"idx": 4, "name": "CBD",         "example": "สีลม, สาทร, อโศก"},
        ]
    }


@app.get("/model/info", tags=["Model"])
def model_info():
    """
    ข้อมูล model และ features ที่ใช้
    """
    return {
        "model_type": "XGBoost Regressor",
        "tuning": "Optuna (40 trials)",
        "metrics": {
            "R2":   0.9445,
            "MAE":  258631,
            "MAPE": "9.37%",
        },
        "features": feature_names if feature_names else [],
        "training_samples": 2376,
    }
