"""
Campus SmartQueue 2.0 - Relational Database Layer
Implements the 5 normalized relational tables from Slide 12:
1. places (place_id, name, category, capacity, data_source, service_rate, default_counters)
2. slots (slot_id, weekday 0-5, start_time, end_time, time_label)
3. responses (response_id, roll_hash [salted SHA-256], place_id, slot_id, consent, submitted_at, coverage)
4. crowd_index (place_id, slot_id, week_start, count, coverage, crowd_index, level)
5. forecasts (place_id, slot_id, target_date, predicted_index, model, created_at)
6. subscriptions (id, place_id, threshold_level, user_identifier, created_at)
"""

import os
import shutil
import sqlite3
from pathlib import Path

import os
import shutil
import sqlite3
import csv
import tempfile
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Candidate locations for template database
CANDIDATE_TEMPLATES = [
    BASE_DIR / "data" / "smartqueue.db",
    Path.cwd() / "data" / "smartqueue.db",
    Path.cwd() / "CampusSmartQueue" / "data" / "smartqueue.db",
    Path("/var/task/data/smartqueue.db"),
    Path("/var/task/CampusSmartQueue/data/smartqueue.db")
]

def find_template_db() -> Path:
    for cand in CANDIDATE_TEMPLATES:
        if cand.exists() and cand.stat().st_size > 1000:
            return cand
    return BASE_DIR / "data" / "smartqueue.db"

TEMPLATE_DB = find_template_db()

# Serverless (Vercel) compatibility: use writable temporary directory
if os.environ.get("VERCEL"):
    DB_DIR = Path(tempfile.gettempdir())
    DB_PATH = DB_DIR / "smartqueue.db"
    DB_DIR.mkdir(parents=True, exist_ok=True)
    if not DB_PATH.exists() or DB_PATH.stat().st_size < 1000:
        if TEMPLATE_DB.exists() and TEMPLATE_DB.stat().st_size > 1000:
            try:
                shutil.copyfile(str(TEMPLATE_DB), str(DB_PATH))
            except Exception as e:
                print("Vercel DB copy note:", e)
else:
    DB_DIR = BASE_DIR / "data"
    DB_PATH = TEMPLATE_DB

DEFAULT_PLACES = [
    (1, "COE Admission Office", "Bldg 1 - COE Ground Floor", 85, "SmartQueue QR Tokens & Central ERP", 0.28, 4),
    (2, "COE Student Section & Exam", "Bldg 1 - COE Windows 1-4", 70, "Counter Tally & MahaDBT Portal Sync", 0.35, 3),
    (3, "AISSMS Central Canteen", "Quadrangle Dining Court", 250, "POS Billing Tally & Overhead Vision", 1.40, 4),
    (4, "Campus Xerox Centre [X]", "Bldg 2 - MBA Parking Level", 50, "Operator Tally & Print Spooler", 0.55, 3),
    (5, "Hostel Dining & Mess", "AISSMS Hostel Block", 300, "Turnstile RFID & Biometric Scans", 2.20, 5),
    (6, "COE Central Library", "Bldg 1 - COE 2nd & 3rd Floor", 180, "RFID Gate Turnstile & Koha LMS", 1.10, 3)
]

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

def ensure_tables_and_data(conn):
    cursor = conn.cursor()
    cursor.execute("SELECT count(*) FROM sqlite_master WHERE type='table' AND name='places'")
    if cursor.fetchone()[0] == 0:
        create_schema(conn)
        seed_fallback_data(conn)
    else:
        cursor.execute("SELECT count(*) FROM places")
        if cursor.fetchone()[0] == 0:
            seed_fallback_data(conn)

def create_schema(conn):
    cursor = conn.cursor()
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS places (
        place_id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        capacity INTEGER NOT NULL,
        data_source TEXT NOT NULL,
        service_rate_per_min REAL DEFAULT 0.5,
        default_counters INTEGER DEFAULT 2
    );
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS slots (
        slot_id INTEGER PRIMARY KEY,
        weekday INTEGER NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        time_label TEXT NOT NULL
    );
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS responses (
        response_id TEXT PRIMARY KEY,
        roll_hash TEXT NOT NULL,
        place_id INTEGER NOT NULL,
        slot_id INTEGER NOT NULL,
        consent INTEGER DEFAULT 1,
        submitted_at TEXT NOT NULL,
        coverage REAL DEFAULT 0.85,
        FOREIGN KEY (place_id) REFERENCES places(place_id),
        FOREIGN KEY (slot_id) REFERENCES slots(slot_id)
    );
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS crowd_index (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        place_id INTEGER NOT NULL,
        slot_id INTEGER NOT NULL,
        week_start TEXT NOT NULL,
        count INTEGER NOT NULL,
        coverage REAL NOT NULL,
        crowd_index REAL NOT NULL,
        level TEXT NOT NULL,
        FOREIGN KEY (place_id) REFERENCES places(place_id),
        FOREIGN KEY (slot_id) REFERENCES slots(slot_id),
        UNIQUE(place_id, slot_id, week_start)
    );
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS forecasts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        place_id INTEGER NOT NULL,
        slot_id INTEGER NOT NULL,
        target_date TEXT NOT NULL,
        predicted_index REAL NOT NULL,
        model TEXT NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (place_id) REFERENCES places(place_id),
        FOREIGN KEY (slot_id) REFERENCES slots(slot_id)
    );
    """)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        place_id INTEGER NOT NULL,
        threshold_level TEXT NOT NULL,
        user_identifier TEXT NOT NULL,
        created_at TEXT NOT NULL
    );
    """)
    conn.commit()

def seed_fallback_data(conn):
    cursor = conn.cursor()
    # Seed places
    cursor.executemany("""
    INSERT OR IGNORE INTO places (place_id, name, category, capacity, data_source, service_rate_per_min, default_counters)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, DEFAULT_PLACES)

    # Seed slots
    slots_data = []
    slot_id = 1
    for weekday in range(6):
        for start_t, end_t in TIME_SLOT_DEFS:
            slots_data.append((slot_id, weekday, start_t, end_t, f"{start_t} - {end_t}"))
            slot_id += 1
    cursor.executemany("""
    INSERT OR IGNORE INTO slots (slot_id, weekday, start_time, end_time, time_label)
    VALUES (?, ?, ?, ?, ?)
    """, slots_data)

    # Seed baseline crowd_index and forecasts
    crowd_records = []
    forecast_records = []
    week_start = "2026-10-19"
    import datetime
    now_str = datetime.datetime.now().isoformat()
    for pid, _, _, cap, _, _, _ in DEFAULT_PLACES:
        for s in range(1, 121):
            wday = (s - 1) // 20
            slot_in_day = (s - 1) % 20
            # Natural curve: lunch peak around slots 8-11 (12:00 - 14:00)
            dist_to_lunch = abs(slot_in_day - 9.5)
            base_curve = max(0.20, 0.88 - (dist_to_lunch * 0.08))
            if pid in [1, 2]: # Admin
                base_curve = max(0.25, 0.75 - (abs(slot_in_day - 6) * 0.07))
            elif pid == 3: # Canteen
                base_curve = 0.92 if slot_in_day in [8, 9, 10] else 0.35
            base_curve = round(min(0.95, max(0.12, base_curve)), 2)
            lvl = "Low" if base_curve < 0.40 else ("Medium" if base_curve <= 0.75 else "High")
            cnt = int(round(base_curve * cap * 0.85))

            crowd_records.append((pid, s, week_start, cnt, 0.85, base_curve, lvl))
            forecast_records.append((pid, s, week_start, base_curve, "LightGBM", now_str))

    cursor.executemany("""
    INSERT OR IGNORE INTO crowd_index (place_id, slot_id, week_start, count, coverage, crowd_index, level)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, crowd_records)

    cursor.executemany("""
    INSERT OR IGNORE INTO forecasts (place_id, slot_id, target_date, predicted_index, model, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
    """, forecast_records)

    conn.commit()

def get_connection():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    ensure_tables_and_data(conn)
    return conn

def init_db():
    conn = get_connection()
    create_schema(conn)
    conn.close()

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully at:", DB_PATH)
