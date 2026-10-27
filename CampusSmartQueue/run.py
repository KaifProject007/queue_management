"""
Campus SmartQueue 2.0 - One-Click Application Launcher
1. Verifies/initializes the SQLite database and autonomous dataset
2. Trains Baseline and LightGBM models & Erlang C parameters
3. Launches the FastAPI ASGI microservice with Uvicorn
4. Serves the modern HTML5/CSS3/JavaScript web interface on http://127.0.0.1:8000
"""

import os
import sys
import webbrowser
from pathlib import Path

# Ensure project root is in python path
ROOT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT_DIR))

from app.db import DB_PATH, init_db
from app.data_engine import generate_multiweek_dataset
from app.models import forecaster

def main():
    print("=" * 65)
    print("      CAMPUS SMARTQUEUE 2.0 - INTELLIGENT QUEUE SYSTEM")
    print("   CEP Project · Kaif Sayyed, Faizan Shaikh, Sushant Borkar, Kalpesh Urade")
    print("=" * 65)

    # 1. Initialize DB if not present or empty
    if not DB_PATH.exists():
        print("\n[Phase 1] Initializing SQLite database and autonomous mobility dataset...")
        generate_multiweek_dataset(num_weeks=7)
    else:
        print(f"\n[Phase 1] Database found at: {DB_PATH}")

    # 2. Train and evaluate models
    print("\n[Phase 2] Training Baseline & LightGBM Regressor models...")
    ml_res = forecaster.train_and_evaluate()
    print(f" -> Baseline MAE: {ml_res['baseline_mae']}")
    print(f" -> LightGBM MAE: {ml_res['lightgbm_mae']}")
    print(f" -> Serving Active Model: {ml_res['active_model']}")

    # 3. Start server
    print("\n[Phase 3 & 4] Launching FastAPI Web Application on http://127.0.0.1:8000 ...")
    print(" -> Press Ctrl+C to stop server.\n")

    import uvicorn
    uvicorn.run("app.api:app", host="127.0.0.1", port=8000, reload=False)

if __name__ == "__main__":
    main()
