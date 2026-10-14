# Enterprise Customer Churn & CLV Intelligence Platform

A production-ready Enterprise Customer Churn and Customer Lifetime Value (CLV) Intelligence Platform. The platform empowers customer success teams, retention specialists, and business analysts to predict immediate churn risk, estimate remaining customer lifetime using survival analysis, explain drivers with SHAP (SHapley Additive exPlanations), and simulate retention interventions in real time via an interactive "What-If" simulator.

---

## Architecture Overview

```
                                      ┌──────────────────────────────────────────────┐
                                      │              React + Vite UI                 │
                                      │  (Tailwind CSS, Recharts, Lucide-React)     │
                                      └──────────────────────┬───────────────────────┘
                                                             │ REST / JSON (Axios)
                                                             ▼
                                      ┌──────────────────────────────────────────────┐
                                      │             FastAPI Backend Hub              │
                                      │         (app.py / CORS / Lifespan)           │
                                      └──────┬───────────────┬───────────────┬───────┘
                                             │               │               │
                     ┌───────────────────────┴────┐          │               └────────────────────────┐
                     ▼                            ▼          ▼                                        ▼
        ┌─────────────────────────┐   ┌───────────────────────────┐   ┌─────────────────────────┐   ┌──────────────────┐
        │   Classification Engine │   │      Survival Engine      │   │  Explainability Engine  │   │  CLV Calculator  │
        │      (XGBoost 3.2)      │   │   (Lifelines CoxPHFitter) │   │  (SHAP TreeExplainer)   │   │  (Dynamic Form)  │
        └────────────┬────────────┘   └─────────────┬─────────────┘   └────────────┬────────────┘   └────────┬─────────┘
                     │                              │                              │                         │
                     ▼                              ▼                              ▼                         ▼
            Immediate Churn Prob          Survival Horizon Curves           Local & Global Waterfall     Expected Lifetime &
            & Risk Tier (High/Med/Low)    (P(T > t + dt | T > t))           Risk vs Retention Factors    Dynamic Projected CLV
```

---

## Core Capabilities

### 1. High-Performance Churn Classification (XGBoost)
- **Model:** Tuned XGBoost Classifier with gradient-boosted decision trees.
- **Preprocessing:** Scikit-Learn `ColumnTransformer` with median imputation for numerical attributes, mode imputation for categorical attributes, `StandardScaler`, and `OneHotEncoder` (`handle_unknown='ignore'`).
- **Outputs:** Continuous Churn Probability ($0.0 \rightarrow 1.0$), Binary Churn Prediction ($0$ or $1$), and Risk Tier (`Low Risk < 0.35`, `Medium Risk 0.35 - 0.65`, `High Risk > 0.65`).
- **Evaluation:** Real-time computation of ROC-AUC ($0.83+$), F1-Score, Precision, Recall, Accuracy, and Confusion Matrix.

### 2. Right-Censored Survival Analysis (`lifelines` CoxPH)
- **Model:** Cox Proportional Hazards Model (`lifelines.CoxPHFitter`) with $L_2$ penalization ($0.1$) for matrix stability across correlated covariates.
- **Survival Horizon:** Generates conditional survival probabilities $S(t_0 + \Delta t \mid T > t_0) = \frac{S(t_0 + \Delta t)}{S(t_0)}$ over future horizons ($\Delta t \in [1, 36]$ months).
- **Expected Remaining Lifetime:** Integrates the future conditional survival function to forecast remaining tenure before churn.

### 3. Dynamic Customer Lifetime Value (CLV)
- **Formula:**
  $$\text{CLV} = \text{Monthly Charges} \times \text{Expected Remaining Tenure (Months)} \times (1 - \text{Churn Probability})$$
- Dynamically recalculates as customer usage, billing, or contract structures change.

### 4. Explainable AI with SHAP (TreeExplainer)
- **Global Importance:** Ranks top global churn drivers across the active portfolio using mean absolute SHAP values.
- **Local Feature Attribution:** Produces granular waterfall explanations for any individual customer account:
  - Base Value: Average portfolio risk baseline ($32.3\%$).
  - Positive Drivers (Red): Features elevating churn risk (e.g., Month-to-Month contract, high support ticket count, lack of tech support).
  - Protective Anchors (Green): Features defending against churn (e.g., 2-Year contract, automatic payment, tenure longevity).

### 5. Interactive "What-If" Retention Simulator
- Sliders and selectors allow retention specialists to test intervention scenarios on the fly:
  - *Scenario A:* Upgrade Month-to-Month contract to a 2-Year agreement $\rightarrow$ Churn risk drops from $89.8\%$ to $18.2\%$ ($-71.6\%$), increasing customer CLV by over $+\$2,000$.
  - *Scenario B:* Resolve support friction (reduce tickets from $4 \rightarrow 0$) and activate VIP Tech Support $\rightarrow$ Immediate reduction in hazard rate and survival extension.

---

## Tech Stack

### Backend
- **Python:** 3.11+
- **Web Framework:** FastAPI, Uvicorn, Starlette
- **Machine Learning:** XGBoost, Scikit-Learn
- **Survival Analysis:** Lifelines
- **Interpretability:** SHAP
- **Data Engineering:** Pandas, NumPy, Joblib
- **Validation & Config:** Pydantic v2, Python-Dotenv

### Frontend
- **Framework:** React 18, Vite
- **Styling:** Tailwind CSS, PostCSS, Autoprefixer
- **Visualizations:** Recharts (AreaChart, BarChart, PieChart, Donut, Custom Tooltips)
- **Icons:** Lucide-React
- **HTTP Client:** Axios

---

## Directory Structure

```text
Customer-Churn-CLV-Engine/
├── backend/
│   ├── app.py                     # FastAPI application & lifespan bootstrap
│   ├── config.py                  # Environment config, paths & thresholds
│   ├── requirements.txt           # Python dependencies
│   ├── .env.example               # Environment variables template
│   ├── uploads/                   # User-uploaded dataset storage
│   ├── saved_models/              # Persisted model binaries & metadata
│   │   ├── active_dataset.csv
│   │   ├── xgboost_churn_model.pkl
│   │   ├── cox_survival_model.pkl
│   │   ├── preprocessor.pkl
│   │   ├── evaluation_metrics.json
│   │   ├── shap_summary.json
│   │   └── survival_features.json
│   ├── routes/
│   │   ├── upload.py              # Dataset upload, reset, and persona presets
│   │   ├── predict.py             # Individual and batch scoring routes
│   │   ├── explain.py             # SHAP local and global explainers
│   │   └── analytics.py           # Executive KPIs, risk distributions & metrics
│   ├── ml/
│   │   ├── data_loader.py         # Telco dataset generator & schema summaries
│   │   ├── preprocessor.py        # Imputation, scaling, one-hot encoding pipeline
│   │   ├── train_classifier.py    # XGBoost classifier training pipeline
│   │   ├── train_survival.py      # Lifelines CoxPH survival pipeline
│   │   ├── clv_calculator.py      # Dynamic CLV & conditional survival logic
│   │   └── shap_explainer.py      # TreeExplainer waterfall & global rankings
│   └── utils/
│       ├── logger.py              # Structured logging utility
│       └── metrics.py             # Classification performance metrics
│
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── services/
│       │   └── api.js             # Axios API client
│       ├── components/
│       │   ├── Sidebar.jsx        # Navigation & engine status
│       │   ├── MetricsOverview.jsx # Executive KPI metric cards
│       │   ├── CustomerTable.jsx  # Paginated, filterable risk directory
│       │   ├── SurvivalChart.jsx  # Recharts 36-month survival curve
│       │   ├── ShapWaterfall.jsx  # Feature attribution waterfall
│       │   └── WhatIfSimulator.jsx# Real-time sliders & delta comparison
│       └── pages/
│           ├── Dashboard.jsx      # Executive dashboard view
│           ├── IndividualPrediction.jsx # Inspector & What-If Studio
│           └── ModelAnalytics.jsx # SHAP rankings, confusion matrix & upload
│
└── README.md
```

---

## Installation & Setup Instructions

### Prerequisites
- Python 3.11+
- Node.js 18+ and `npm`

### 1. Backend Setup

```bash
cd backend

# Create and activate virtual environment
python -m venv .venv

# On Windows (PowerShell):
.venv\Scripts\Activate.ps1
# On macOS / Linux:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Start FastAPI server
uvicorn app:app --reload --port 8000
```

> **Automatic Bootstrap:** On first startup, FastAPI will automatically generate the 1,200-record Telco dataset, fit the preprocessor pipeline, train the XGBoost classifier, train the Cox survival model, and cache the SHAP TreeExplainer. The engine is ready immediately!

### 2. Frontend Setup

```bash
cd frontend

# Install npm dependencies
npm install

# Start Vite development server
npm run dev
```

Open your browser at **`http://localhost:5173`**. The frontend automatically proxies API calls to `http://127.0.0.1:8000`.

---

## API Reference

### Health & System Status
- `GET /` — Check health status, model readiness, and dataset size.

### Dataset Management
- `POST /upload` — Upload customer CSV dataset (max 50 MB) with automatic validation.
- `POST /upload/reset-sample` — Reset active dataset to the standard Telco benchmark.
- `GET /dataset/summary` — Retrieve dataset statistics, missing values audit, and revenue figures.
- `GET /dataset/sample-customers` — Retrieve archetype customer personas for quick testing.

### Predictive Modeling & Simulations
- `POST /predict/individual` — Score single customer for churn probability, risk tier, 36-month survival curve, remaining lifetime, and dynamic CLV.
  ```json
  {
    "tenure": 12,
    "MonthlyCharges": 85.50,
    "TotalCharges": 1026.00,
    "Contract": "Month-to-month",
    "PaymentMethod": "Electronic check",
    "PaperlessBilling": "Yes",
    "TechSupport": "No"
  }
  ```
  *Response:*
  ```json
  {
    "churn_probability": 0.8982,
    "risk_tier": "High Risk",
    "expected_lifetime_months": 34.7,
    "estimated_clv": 301.88,
    "survival_curve": [
      {"month": 1, "future_tenure": 13, "probability": 0.9936},
      {"month": 6, "future_tenure": 18, "probability": 0.9230},
      {"month": 12, "future_tenure": 24, "probability": 0.8268}
    ]
  }
  ```
- `POST /predict/batch` — Batch score the active dataset with pagination, searching, and sorting.

### Explainable AI (SHAP)
- `POST /explain/individual` — Compute SHAP local waterfall feature attribution for an individual customer.
  ```json
  {
    "base_value": 0.3229,
    "predicted_probability": 0.8982,
    "feature_contributions": [
      {"feature": "Month-to-Month Contract", "impact": 0.28, "direction": "increases_risk"},
      {"feature": "Support Tickets", "impact": 0.16, "direction": "increases_risk"},
      {"feature": "Tenure (Months)", "impact": -0.09, "direction": "decreases_risk"}
    ]
  }
  ```
- `GET /explain/global` — Retrieve global feature importance rankings across the active portfolio.

### Executive Analytics & Model Retraining
- `GET /analytics` — Retrieve executive KPIs, risk tier breakdown, contract analysis, and model metrics.
- `POST /train` — Trigger full pipeline retraining (XGBoost + CoxPH + SHAP) and return updated evaluation metrics.

---

## Business Impact Summary

| Metric | Business Value | Platform Solution |
| :--- | :--- | :--- |
| **Annual Revenue at Risk** | Identifies accounts in danger of imminent churn before contract expiration. | Real-time calculation: $\$216,249.84$ identified in high-risk segment. |
| **Survival Curve Foreknowledge** | Eliminates blind spots on when customers will defect. | Cox Proportional Hazards predicts retention probability at 1, 6, 12, 24, and 36 months. |
| **Dynamic CLV Prioritization** | Prevents spending high retention budgets on low-value accounts. | Projects remaining CLV combining future survival probability with current billing rate. |
| **SHAP Intervention Guidance** | Gives account managers exact causal reasons for customer dissatisfaction. | Identifies specific levers (e.g. support friction, contract mismatch, pricing threshold). |
| **What-If ROI Modeling** | Simulates discount and contract renewal campaigns before committing resources. | Real-time delta comparison shows immediate risk drop and CLV gain. |
