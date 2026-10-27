"""
Campus SmartQueue 2.0 - FastAPI Server & Microservice Endpoints
Implements Slide 14 REST Endpoints:
- GET /api/places
- GET /api/crowd?place_id=&slot_id=
- GET /api/forecast?place_id=&date=
- GET /api/best-time?place_id=
- POST /api/subscribe

Plus interactive web application APIs:
- GET /api/status (Campus live overview with Erlang C queue metrics)
- POST /api/simulate-tick (Advance campus simulation time)
- POST /api/queue-simulator (Interactive Erlang C calculator)
- GET /api/analytics (Model MAE scorecard, KMeans clusters, Z-score surge alerts)
"""

import os
import random
import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, Query, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.db import get_connection
from app.models import forecaster, ErlangCQueue
from app.clean import compute_crowd_index, apply_privacy_suppression

app = FastAPI(
    title="Campus SmartQueue 2.0 API",
    description="Intelligent campus crowd forecasting and Erlang C queue management system",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simulation state: tracks virtual campus clock
simulation_state = {
    "weekday": 0,          # 0 = Monday
    "slot_index": 9,       # Slot 9 = 12:30 - 13:00 (Peak Lunch hour demo)
    "is_auto_playing": False
}

TIME_SLOT_DEFS = [
    ("08:00", "08:30"), ("08:30", "09:00"),
    ("09:00", "09:30"), ("09:30", "10:00"),
    ("10:00", "10:30"), ("10:30", "11:00"),
    ("11:00", "11:30"), ("11:30", "12:00"),
    ("12:00", "12:30"), ("12:30", "13:00"),
    ("13:00", "13:30"), ("13:30", "14:00"),
    ("14:00", "14:30"), ("14:30", "15:00"),
    ("15:00", "15:30"), ("15:30", "16:00"),
    ("16:00", "16:30"), ("16:30", "17:00"),
    ("17:00", "17:30"), ("17:30", "18:00")
]

WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

class SubscribeRequest(BaseModel):
    place_id: int
    threshold_level: str
    user_identifier: str

class QueueSimRequest(BaseModel):
    arrival_rate: float
    service_rate: float
    counters: int

@app.on_event("startup")
def startup_event():
    # In Vercel serverless environment, skip heavy training on cold start to prevent function timeouts
    if os.environ.get("VERCEL"):
        print("Vercel serverless environment detected: startup model training skipped for instant response.")
        return
    try:
        forecaster.train_and_evaluate()
    except Exception as e:
        print("Model initialization note:", e)

# ----------------- Slide 14 REST Endpoints -----------------

@app.get("/api/places")
def get_places():
    """Slide 14: GET /places - Places with capacity and data source."""
    conn = get_connection()
    cursor = conn.cursor()
    rows = cursor.execute("""
        SELECT place_id, name, category, capacity, data_source, service_rate_per_min, default_counters 
        FROM places 
        ORDER BY place_id
    """).fetchall()
    conn.close()

    places = []
    for r in rows:
        places.append({
            "place_id": r["place_id"],
            "name": r["name"],
            "category": r["category"],
            "capacity": r["capacity"],
            "data_source": r["data_source"],
            "service_rate_per_min": r["service_rate_per_min"],
            "default_counters": r["default_counters"]
        })
    return {"places": places}

@app.get("/api/crowd")
def get_crowd(
    place_id: Optional[int] = Query(None, description="Place ID"),
    slot_id: Optional[int] = Query(None, description="Slot ID")
):
    """Slide 14: GET /crowd?place=&slot= - Current crowd index and level."""
    curr_slot = (simulation_state["weekday"] * 20) + (simulation_state["slot_index"] + 1)
    target_slot = slot_id if slot_id else curr_slot

    conn = get_connection()
    cursor = conn.cursor()

    if place_id:
        query = """
        SELECT ci.*, p.name as place_name, p.capacity, p.service_rate_per_min, p.default_counters,
               s.time_label, s.start_time, s.weekday
        FROM crowd_index ci
        JOIN places p ON ci.place_id = p.place_id
        JOIN slots s ON ci.slot_id = s.slot_id
        WHERE ci.place_id = ? AND ci.slot_id = ?
        ORDER BY ci.week_start DESC
        LIMIT 1
        """
        row = cursor.execute(query, (place_id, target_slot)).fetchone()
        conn.close()

        if not row:
            raise HTTPException(status_code=404, detail="Crowd data not found for given place and slot")

        safe_count = apply_privacy_suppression(row["count"], threshold=10)
        index_val = float(row["crowd_index"])
        arrival_rate = (index_val * row["capacity"] * 0.35) / 30.0
        queue_info = ErlangCQueue.calculate(
            arrival_rate, row["service_rate_per_min"], row["default_counters"]
        )
        is_spike, z_val = forecaster.check_zscore_spike(place_id, target_slot, index_val)

        return {
            "place_id": row["place_id"],
            "place_name": row["place_name"],
            "slot_id": row["slot_id"],
            "time_label": row["time_label"],
            "weekday": WEEKDAY_NAMES[row["weekday"]],
            "crowd_index": index_val,
            "occupancy_percentage": int(round(index_val * 100)),
            "level": row["level"],
            "count_display": safe_count if safe_count is not None else "< 10 (Suppressed for Privacy)",
            "queue_metrics": queue_info,
            "anomaly": {
                "is_spike": is_spike,
                "z_score": z_val
            }
        }
    else:
        query = """
        SELECT ci.*, p.name as place_name, p.capacity, p.service_rate_per_min, p.default_counters,
               s.time_label, s.start_time, s.weekday
        FROM crowd_index ci
        JOIN places p ON ci.place_id = p.place_id
        JOIN slots s ON ci.slot_id = s.slot_id
        WHERE ci.slot_id = ? AND ci.week_start = (SELECT max(week_start) FROM crowd_index)
        ORDER BY ci.place_id
        """
        rows = cursor.execute(query, (target_slot,)).fetchall()
        conn.close()

        results = []
        for r in rows:
            index_val = float(r["crowd_index"])
            arr_rate = (index_val * r["capacity"] * 0.35) / 30.0
            q_metrics = ErlangCQueue.calculate(arr_rate, r["service_rate_per_min"], r["default_counters"])
            is_spike, z_val = forecaster.check_zscore_spike(r["place_id"], target_slot, index_val)

            results.append({
                "place_id": r["place_id"],
                "place_name": r["place_name"],
                "crowd_index": index_val,
                "occupancy_percentage": int(round(index_val * 100)),
                "level": r["level"],
                "queue_metrics": q_metrics,
                "anomaly": {"is_spike": is_spike, "z_score": z_val}
            })
        return {"slot_id": target_slot, "facilities": results}

@app.get("/api/forecast")
def get_forecast(
    place_id: int = Query(..., description="Place ID"),
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format")
):
    """Slide 14: GET /forecast?place=&date= - Predicted level for each slot of the day."""
    wday = simulation_state["weekday"]
    conn = get_connection()
    cursor = conn.cursor()

    query = """
    SELECT f.slot_id, s.start_time, s.end_time, s.time_label, f.predicted_index, f.model,
           ci.crowd_index as actual_index
    FROM slots s
    JOIN forecasts f ON s.slot_id = f.slot_id AND f.place_id = ?
    LEFT JOIN crowd_index ci ON s.slot_id = ci.slot_id AND ci.place_id = ?
    WHERE s.weekday = ?
    GROUP BY s.slot_id
    ORDER BY s.slot_id ASC
    """
    rows = cursor.execute(query, (place_id, place_id, wday)).fetchall()
    p_row = cursor.execute("SELECT name, capacity FROM places WHERE place_id = ?", (place_id,)).fetchone()
    conn.close()

    if not p_row:
        raise HTTPException(status_code=404, detail="Place not found")

    forecast_curve = []
    for r in rows:
        pred_val = float(r["predicted_index"])
        actual_val = float(r["actual_index"]) if r["actual_index"] is not None else pred_val
        level = "Low" if pred_val < 0.40 else ("Medium" if pred_val <= 0.75 else "High")
        forecast_curve.append({
            "slot_id": r["slot_id"],
            "time_label": r["time_label"],
            "start_time": r["start_time"],
            "predicted_index": pred_val,
            "predicted_occupancy": int(round(pred_val * p_row["capacity"])),
            "actual_index": actual_val,
            "level": level,
            "model": r["model"]
        })

    return {
        "place_id": place_id,
        "place_name": p_row["name"],
        "weekday": WEEKDAY_NAMES[wday],
        "capacity": p_row["capacity"],
        "active_model": forecaster.active_model_name,
        "hourly_forecast": forecast_curve
    }

@app.get("/api/best-time")
def get_best_time(place_id: int = Query(..., description="Place ID")):
    """Slide 14: GET /best-time?place= - Quietest upcoming slots."""
    wday = simulation_state["weekday"]
    recommendations = forecaster.get_best_time_recommendations(place_id, wday)
    return {
        "place_id": place_id,
        "weekday": WEEKDAY_NAMES[wday],
        "recommendations": recommendations,
        "best_slot": recommendations[0] if recommendations else None
    }

@app.post("/api/subscribe")
def subscribe(req: SubscribeRequest):
    """Slide 14: POST /subscribe - Save a Web Push subscription."""
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO subscriptions (place_id, threshold_level, user_identifier, created_at)
    VALUES (?, ?, ?, ?)
    """, (req.place_id, req.threshold_level, req.user_identifier, datetime.datetime.now().isoformat()))
    conn.commit()
    conn.close()

    return {
        "success": True,
        "message": f"Successfully subscribed to alerts when Place #{req.place_id} reaches {req.threshold_level}.",
        "subscription": req.dict()
    }

# ----------------- Extended Interactive APIs -----------------

@app.get("/api/status")
def get_campus_status():
    """Live full campus status with current clock time and real-time counter states."""
    wday = simulation_state["weekday"]
    s_idx = simulation_state["slot_index"]
    start_t, end_t = TIME_SLOT_DEFS[s_idx]
    slot_id = (wday * 20) + (s_idx + 1)

    conn = get_connection()
    cursor = conn.cursor()

    query = """
    SELECT p.place_id, p.name, p.category, p.capacity, p.data_source,
           p.service_rate_per_min, p.default_counters,
           ci.count, ci.coverage, ci.crowd_index, ci.level
    FROM places p
    LEFT JOIN crowd_index ci ON p.place_id = ci.place_id 
        AND ci.slot_id = ?
        AND ci.week_start = (SELECT max(week_start) FROM crowd_index)
    ORDER BY p.place_id
    """
    rows = cursor.execute(query, (slot_id,)).fetchall()
    conn.close()

    facilities = []
    active_spikes = []

    for r in rows:
        index_val = float(r["crowd_index"]) if r["crowd_index"] is not None else 0.3
        level = r["level"] if r["level"] else ("Low" if index_val < 0.40 else "Medium")
        cap = int(r["capacity"])
        est_people = int(round(index_val * cap))
        
        arr_rate = (index_val * cap * 0.35) / 30.0
        queue_info = ErlangCQueue.calculate(
            arr_rate, float(r["service_rate_per_min"]), int(r["default_counters"])
        )

        is_spike, z_val = forecaster.check_zscore_spike(r["place_id"], slot_id, index_val)
        if is_spike:
            active_spikes.append({
                "place_name": r["name"],
                "z_score": z_val,
                "current_level": level,
                "message": f"Unusual rush detected at {r['name']} (z = {z_val:.1f}σ above normal)"
            })

        facilities.append({
            "place_id": r["place_id"],
            "name": r["name"],
            "category": r["category"],
            "capacity": cap,
            "estimated_people": est_people,
            "crowd_index": index_val,
            "occupancy_percentage": int(round(index_val * 100)),
            "level": level,
            "data_source": r["data_source"],
            "service_rate": r["service_rate_per_min"],
            "counters": r["default_counters"],
            "queue_metrics": queue_info,
            "is_spike": is_spike,
            "z_score": z_val
        })

    return {
        "clock": {
            "weekday_index": wday,
            "weekday_name": WEEKDAY_NAMES[wday],
            "time_label": f"{start_t} - {end_t}",
            "start_time": start_t,
            "end_time": end_t,
            "slot_id": slot_id,
            "slot_index": s_idx
        },
        "facilities": facilities,
        "active_spikes": active_spikes,
        "active_model": forecaster.active_model_name
    }

@app.post("/api/simulate-tick")
def simulate_tick(
    step: int = Query(1, description="Number of 30-min slots to advance"),
    weekday: Optional[int] = Query(None, description="Set specific weekday (0-5)"),
    slot_index: Optional[int] = Query(None, description="Set specific slot index (0-19)")
):
    """Advances or sets the campus simulation clock."""
    if weekday is not None and 0 <= weekday <= 5:
        simulation_state["weekday"] = weekday
    
    if slot_index is not None and 0 <= slot_index < len(TIME_SLOT_DEFS):
        simulation_state["slot_index"] = slot_index
    else:
        new_idx = simulation_state["slot_index"] + step
        if new_idx >= len(TIME_SLOT_DEFS):
            simulation_state["slot_index"] = 0
            simulation_state["weekday"] = (simulation_state["weekday"] + 1) % 6
        elif new_idx < 0:
            simulation_state["slot_index"] = len(TIME_SLOT_DEFS) - 1
            simulation_state["weekday"] = (simulation_state["weekday"] - 1) % 6
        else:
            simulation_state["slot_index"] = new_idx

    return get_campus_status()

@app.post("/api/queue-simulator")
def queue_simulator(req: QueueSimRequest):
    """Interactive Erlang C Sandbox calculator."""
    return ErlangCQueue.calculate(
        lambda_rate=req.arrival_rate,
        mu_rate=req.service_rate,
        c=req.counters
    )

@app.get("/api/analytics")
def get_analytics():
    """Model benchmarking (Baseline MAE vs LightGBM MAE), KMeans clusters and privacy stats."""
    conn = get_connection()
    cursor = conn.cursor()
    total_records = cursor.execute("SELECT count(*) as c FROM crowd_index").fetchone()["c"]
    total_responses = cursor.execute("SELECT count(*) as c FROM responses").fetchone()["c"]
    total_subs = cursor.execute("SELECT count(*) as c FROM subscriptions").fetchone()["c"]
    conn.close()

    return {
        "model_evaluation": {
            "baseline_mae": forecaster.baseline_mae,
            "lightgbm_mae": forecaster.lgb_mae,
            "active_model": forecaster.active_model_name,
            "decision_rule": "LightGBM MAE <= Baseline MAE ? Serve LightGBM : Serve Baseline (Slide 13)",
            "selected_served_model": forecaster.active_model_name
        },
        "kmeans_clusters": forecaster.cluster_summaries,
        "dataset_stats": {
            "total_crowd_index_records": total_records,
            "total_privacy_hashed_events": total_responses,
            "active_subscriptions": total_subs,
            "privacy_method": "SHA-256 Salted Hashing + <10 Count Anonymity Suppression"
        }
    }

class TokenRequest(BaseModel):
    place_id: int
    student_roll: Optional[str] = "25AI113"
    department: Optional[str] = "AI&DS"

@app.post("/api/take-token")
def take_virtual_token(req: TokenRequest):
    """Generates a virtual queue token with live call time estimation."""
    conn = get_connection()
    cursor = conn.cursor()
    p_row = cursor.execute("SELECT name, default_counters, service_rate_per_min FROM places WHERE place_id = ?", (req.place_id,)).fetchone()
    conn.close()

    if not p_row:
        raise HTTPException(status_code=404, detail="Facility not found")

    prefix = "A" if req.place_id == 1 else ("S" if req.place_id == 2 else ("C" if req.place_id == 3 else ("X" if req.place_id == 4 else "L")))
    token_num = random.randint(101, 199)
    token_code = f"{prefix}-{token_num}"
    
    # Estimate wait based on queue
    wday = simulation_state["weekday"]
    s_idx = simulation_state["slot_index"]
    slot_id = (wday * 20) + (s_idx + 1)
    
    crowd_info = get_crowd(place_id=req.place_id, slot_id=slot_id)
    queue_len = crowd_info["queue_metrics"]["queue_length"]
    wait_mins = crowd_info["queue_metrics"]["wait_time_minutes"]

    call_time = datetime.datetime.now() + datetime.timedelta(minutes=wait_mins)

    return {
        "success": True,
        "token_code": token_code,
        "place_name": p_row["name"],
        "department": req.department,
        "ahead_in_queue": max(1, queue_len),
        "estimated_wait_minutes": wait_mins,
        "estimated_call_time": call_time.strftime("%I:%M %p"),
        "active_counters": p_row["default_counters"]
    }

@app.get("/api/weekly-heatmap")
def get_weekly_heatmap(place_id: int = Query(..., description="Place ID")):
    """Returns a full 6x20 matrix of historical crowd levels for weekly planning."""
    conn = get_connection()
    cursor = conn.cursor()
    query = """
    SELECT s.weekday, s.slot_id, s.start_time, s.end_time, s.time_label,
           round(avg(ci.crowd_index), 2) as avg_index
    FROM slots s
    JOIN crowd_index ci ON s.slot_id = ci.slot_id AND ci.place_id = ?
    GROUP BY s.weekday, s.slot_id
    ORDER BY s.weekday, s.slot_id
    """
    rows = cursor.execute(query, (place_id,)).fetchall()
    conn.close()

    heatmap = {}
    for r in rows:
        w_name = WEEKDAY_NAMES[r["weekday"]]
        if w_name not in heatmap:
            heatmap[w_name] = []
        
        val = float(r["avg_index"])
        level = "Low" if val < 0.40 else ("Medium" if val <= 0.75 else "High")
        heatmap[w_name].append({
            "slot_id": r["slot_id"],
            "start_time": r["start_time"],
            "time_label": r["time_label"],
            "crowd_index": val,
            "percentage": int(round(val * 100)),
            "level": level
        })
    return {"place_id": place_id, "heatmap": heatmap}

@app.get("/api/departments")
def get_departments():
    """Lists AISSMS COE engineering departments."""
    return {
        "college": "AISSMS College of Engineering, Pune",
        "code": "EN6278",
        "departments": [
            {"code": "AI_DS", "name": "Artificial Intelligence & Data Science"},
            {"code": "COMP", "name": "Computer Engineering"},
            {"code": "ROBO", "name": "Robotics & Automation"},
            {"code": "MECH", "name": "Mechanical Engineering"},
            {"code": "ETC", "name": "Electronics & Telecommunication"},
            {"code": "CIVIL", "name": "Civil Engineering"},
            {"code": "CHEM", "name": "Chemical Engineering"}
        ]
    }

# ----------------- Static Frontend Mount -----------------
candidate_static_dirs = [
    Path(__file__).resolve().parent.parent / "static",
    Path.cwd() / "static",
    Path.cwd() / "CampusSmartQueue" / "static",
    Path("/var/task/static"),
    Path("/var/task/CampusSmartQueue/static")
]
FRONTEND_DIR = None
for cand in candidate_static_dirs:
    if cand.exists() and (cand / "index.html").exists():
        FRONTEND_DIR = cand
        break
if FRONTEND_DIR is None:
    FRONTEND_DIR = Path(__file__).resolve().parent.parent / "static"

if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

@app.get("/", response_class=HTMLResponse)
def serve_index():
    index_file = FRONTEND_DIR / "index.html"
    if index_file.exists():
        return FileResponse(str(index_file))
    return HTMLResponse("<h1>Campus SmartQueue Frontend Loading...</h1>")
