# 🏠 House Price AI — ML + FastAPI + React

ระบบวิเคราะห์และทำนายราคาบ้านด้วย AI สร้างด้วย XGBoost, FastAPI และ React

---

## 📸 Features

- 🤖 **AI Prediction** — ทำนายราคาบ้านด้วย XGBoost + Optuna Tuning (R² = 0.94)
- 📊 **Dashboard** — ภาพรวมตลาดและแนวโน้มราคา
- 🏠 **คู่มือหาบ้าน** — แนะนำขั้นตอนสำหรับผู้เริ่มต้น
- ⚡ **REST API** — FastAPI พร้อม Swagger UI

---

## 🛠️ Tech Stack

| Layer      | Technology                        |
|------------|-----------------------------------|
| ML Model   | XGBoost, scikit-learn, SHAP, Optuna |
| Backend    | FastAPI, Uvicorn, Python 3.10     |
| Frontend   | React 18, Vite                    |

---

## 🚀 วิธีรัน

### 1. Clone โปรเจค
```bash
git clone https://github.com/Pattyjby-Kun/ml-house-price-prediction.git
cd ml-house-price-prediction
```

### 2. ติดตั้ง Python dependencies
```bash
python -m venv myenv
myenv\Scripts\Activate.ps1      # Windows
pip install -r requirements.txt
```

### 3. Train ML Model
```bash
python house_price_model.py
```
จะสร้างโฟลเดอร์ `ml_output/` พร้อม `model.pkl`, `scaler.pkl`

### 4. รัน FastAPI Backend
```bash
uvicorn main:app --reload --port 8000
```
เปิด API Docs: http://localhost:8000/docs

### 5. รัน React Frontend
```bash
cd react-app
npm install
npm run dev
```
เปิดเว็บ: http://localhost:5173

---

## 📁 โครงสร้างโปรเจค

```
ml-house-price-prediction/
├── house_price_model.py     # ML Training Pipeline
├── main.py                  # FastAPI Backend
├── requirements.txt
├── ml_output/               # สร้างหลังรัน training (ไม่อยู่ใน git)
│   ├── model.pkl
│   ├── scaler.pkl
│   └── feature_names.json
└── react-app/               # React Frontend
    ├── src/
    │   ├── App.jsx
    │   ├── pages/
    │   │   ├── Predictor.jsx
    │   │   ├── Dashboard.jsx
    │   │   └── Recommend.jsx
    │   └── App.css
    └── package.json
```

---

## 🔗 API Endpoints

| Method | Endpoint         | คำอธิบาย              |
|--------|------------------|-----------------------|
| GET    | `/`              | Health check          |
| POST   | `/predict`       | ทำนายราคาบ้าน         |
| GET    | `/market/stats`  | สถิติตลาดรวม          |
| GET    | `/market/trends` | แนวโน้มราคา           |
| GET    | `/locations`     | รายการทำเล            |
| GET    | `/model/info`    | ข้อมูล AI Model       |

---

## 📊 Model Performance

| Metric | Value  |
|--------|--------|
| R²     | 0.9445 |
| MAE    | ฿258,631 |
| MAPE   | 9.37%  |

---

## 👤 Author

**Pattyjby-Kun** — [github.com/Pattyjby-Kun](https://github.com/Pattyjby-Kun)
