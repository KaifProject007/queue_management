"""
Campus SmartQueue 2.0 - Real-World AISSMS COE Telemetry & Data Engine
Tailored specifically for:
All India Shri Shivaji Memorial Society's College of Engineering (AISSMS COE), Pune
College Code: EN6278 · Affiliated to SPPU (Savitribai Phule Pune University)

Facilities Modelled:
1. Central Administrative & Admission Office (Main Heritage Building, Ground Floor)
2. Student Section & Scholarship Cell (MahaDBT & SPPU Exam Cell)
3. AISSMS Central Canteen & Cafeteria (Quadrangle Food Court)
4. Reprographic & Stationery Centre (Photocopy, Lab Manuals & Drawing Sheets)
5. Hostel Mess & Dining Hall (Hostel Block)
6. Dr. B. D. Patil Central Library & Reading Hall (Central Library Building)

Departments:
- Artificial Intelligence & Data Science (AI&DS)
- Computer Engineering
- Robotics & Automation
- Mechanical Engineering
- Electronics & Telecommunication (E&TC)
- Civil & Chemical Engineering
"""

import hashlib
import random
import uuid
import datetime
import numpy as np
import pandas as pd
from app.db import get_connection, init_db, DB_DIR

HASH_SALT = "AISSMS_COE_SecureSalt_2026"

AISSMS_PLACES = [
    {
        "place_id": 1,
        "name": "COE Admission Office",
        "category": "Bldg 1 - COE Ground Floor",
        "capacity": 85,
        "data_source": "SmartQueue QR Tokens & Central ERP",
        "service_rate": 0.28,     # ~3.5 mins per student
        "default_counters": 4,
        "base_curve": {
            "08:00": 0.05, "08:30": 0.12, "09:00": 0.30, "09:30": 0.50,
            "10:00": 0.75, "10:30": 0.88, "11:00": 0.92, "11:30": 0.85,
            "12:00": 0.70, "12:30": 0.45, "13:00": 0.40, "13:30": 0.65,
            "14:00": 0.80, "14:30": 0.75, "15:00": 0.60, "15:30": 0.40,
            "16:00": 0.25, "16:30": 0.12, "17:00": 0.05, "17:30": 0.02
        }
    },
    {
        "place_id": 2,
        "name": "COE Student Section & Exam",
        "category": "Bldg 1 - COE Windows 1-4",
        "capacity": 70,
        "data_source": "Counter Tally & MahaDBT Portal Sync",
        "service_rate": 0.35,     # ~2.8 mins per student
        "default_counters": 3,
        "base_curve": {
            "08:00": 0.04, "08:30": 0.10, "09:00": 0.25, "09:30": 0.45,
            "10:00": 0.65, "10:30": 0.80, "11:00": 0.88, "11:30": 0.92,
            "12:00": 0.85, "12:30": 0.65, "13:00": 0.45, "13:30": 0.75,
            "14:00": 0.82, "14:30": 0.70, "15:00": 0.50, "15:30": 0.35,
            "16:00": 0.20, "16:30": 0.08, "17:00": 0.03, "17:30": 0.01
        }
    },
    {
        "place_id": 3,
        "name": "AISSMS Central Canteen",
        "category": "Quadrangle Dining Court",
        "capacity": 250,
        "data_source": "POS Billing Tally & Overhead Vision",
        "service_rate": 1.40,     # ~42 seconds per cashier
        "default_counters": 4,
        "base_curve": {
            "08:00": 0.10, "08:30": 0.28, "09:00": 0.38, "09:30": 0.32,
            "10:00": 0.25, "10:30": 0.38, "11:00": 0.45, "11:30": 0.60,
            "12:00": 0.82, "12:30": 0.96, "13:00": 0.98, "13:30": 0.78,
            "14:00": 0.50, "14:30": 0.32, "15:00": 0.30, "15:30": 0.52,
            "16:00": 0.72, "16:30": 0.68, "17:00": 0.40, "17:30": 0.20
        }
    },
    {
        "place_id": 4,
        "name": "Campus Xerox Centre [X]",
        "category": "Bldg 2 - MBA Parking Level",
        "capacity": 50,
        "data_source": "Operator Tally & Print Spooler",
        "service_rate": 0.55,     # ~1.8 mins per student
        "default_counters": 3,
        "base_curve": {
            "08:00": 0.18, "08:30": 0.65, "09:00": 0.92, "09:30": 0.95,
            "10:00": 0.82, "10:30": 0.60, "11:00": 0.48, "11:30": 0.42,
            "12:00": 0.55, "12:30": 0.42, "13:00": 0.70, "13:30": 0.82,
            "14:00": 0.62, "14:30": 0.40, "15:00": 0.35, "15:30": 0.38,
            "16:00": 0.28, "16:30": 0.18, "17:00": 0.08, "17:30": 0.02
        }
    },
    {
        "place_id": 5,
        "name": "Hostel Dining & Mess",
        "category": "AISSMS Hostel Block",
        "capacity": 300,
        "data_source": "Turnstile RFID & Biometric Scans",
        "service_rate": 2.20,     # ~27 seconds per student
        "default_counters": 5,
        "base_curve": {
            "08:00": 0.70, "08:30": 0.88, "09:00": 0.65, "09:30": 0.20,
            "10:00": 0.05, "10:30": 0.02, "11:00": 0.05, "11:30": 0.25,
            "12:00": 0.80, "12:30": 0.96, "13:00": 0.94, "13:30": 0.82,
            "14:00": 0.40, "14:30": 0.12, "15:00": 0.05, "15:30": 0.08,
            "16:00": 0.18, "16:30": 0.35, "17:00": 0.60, "17:30": 0.45
        }
    },
    {
        "place_id": 6,
        "name": "COE Central Library",
        "category": "Bldg 1 - COE 2nd & 3rd Floor",
        "capacity": 180,
        "data_source": "RFID Gate Turnstile & Koha LMS",
        "service_rate": 1.10,     # ~55 seconds per student check-in
        "default_counters": 3,
        "base_curve": {
            "08:00": 0.12, "08:30": 0.22, "09:00": 0.35, "09:30": 0.45,
            "10:00": 0.58, "10:30": 0.65, "11:00": 0.70, "11:30": 0.72,
            "12:00": 0.62, "12:30": 0.45, "13:00": 0.42, "13:30": 0.60,
            "14:00": 0.75, "14:30": 0.85, "15:00": 0.90, "15:30": 0.88,
            "16:00": 0.80, "16:30": 0.68, "17:00": 0.52, "17:30": 0.35
        }
    }
]

DEPARTMENTS = [
    {"code": "AI_DS", "name": "Artificial Intelligence & Data Science", "students": 640},
    {"code": "COMP", "name": "Computer Engineering", "students": 720},
    {"code": "ROBO", "name": "Robotics & Automation", "students": 380},
    {"code": "MECH", "name": "Mechanical Engineering", "students": 680},
    {"code": "ETC", "name": "Electronics & Telecommunication", "students": 540},
    {"code": "CIVIL_CHEM", "name": "Civil & Chemical Engineering", "students": 540}
]

TIME_SLOTS = [
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

def hash_roll(roll_no: str, salt: str = HASH_SALT) -> str:
    return hashlib.sha256(f"{roll_no}_{salt}".encode("utf-8")).hexdigest()[:16]

def generate_slots(conn):
    cursor = conn.cursor()
    cursor.execute("DELETE FROM slots")
    slot_id = 1
    for weekday in range(6):
        for start_t, end_t in TIME_SLOTS:
            time_label = f"{start_t} - {end_t}"
            cursor.execute("""
            INSERT INTO slots (slot_id, weekday, start_time, end_time, time_label)
            VALUES (?, ?, ?, ?, ?)
            """, (slot_id, weekday, start_t, end_t, time_label))
            slot_id += 1
    conn.commit()

def generate_places(conn):
    cursor = conn.cursor()
    cursor.execute("DELETE FROM places")
    for p in AISSMS_PLACES:
        cursor.execute("""
        INSERT INTO places (place_id, name, category, capacity, data_source, service_rate_per_min, default_counters)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            p["place_id"], p["name"], p["category"], p["capacity"],
            p["data_source"], p["service_rate"], p["default_counters"]
        ))
    conn.commit()

def generate_multiweek_dataset(num_weeks: int = 7):
    """Generates realistic AISSMS COE footfall dataset across 7 weeks."""
    init_db()
    conn = get_connection()
    generate_places(conn)
    generate_slots(conn)

    cursor = conn.cursor()
    cursor.execute("DELETE FROM responses")
    cursor.execute("DELETE FROM crowd_index")
    cursor.execute("DELETE FROM forecasts")

    slots_df = pd.read_sql("SELECT * FROM slots", conn)
    today = datetime.date.today()
    monday_current = today - datetime.timedelta(days=today.weekday())
    start_monday = monday_current - datetime.timedelta(weeks=num_weeks - 1)

    np.random.seed(42)
    random.seed(42)

    responses_rows = []
    crowd_index_rows = []

    # Student pool from AISSMS departments
    student_pool = []
    for dept in DEPARTMENTS:
        for idx in range(1, 120):
            student_pool.append(f"AISSMS_{dept['code']}_{202600 + idx}")

    student_hashes = [hash_roll(s) for s in student_pool]

    for week_idx in range(num_weeks):
        week_start_date = start_monday + datetime.timedelta(weeks=week_idx)
        week_str = week_start_date.isoformat()

        # Day multiplier reflecting college attendance
        day_multipliers = {0: 1.06, 1: 1.02, 2: 1.03, 3: 0.98, 4: 0.94, 5: 0.60}

        for p_cfg in AISSMS_PLACES:
            pid = p_cfg["place_id"]
            cap = p_cfg["capacity"]
            curve = p_cfg["base_curve"]

            for _, slot in slots_df.iterrows():
                sid = int(slot["slot_id"])
                wday = int(slot["weekday"])
                stime = slot["start_time"]

                base_val = curve.get(stime, 0.1)
                day_mul = day_multipliers.get(wday, 1.0)
                noise = np.random.normal(loc=0.0, scale=0.05)

                # Real-world campus anomalies (SPPU submission, MahaDBT deadline)
                if week_idx == 3 and wday == 2 and pid == 2 and stime in ["11:30", "12:00"]:
                    surge = 0.50 # MahaDBT scholarship submission surge
                elif week_idx == 4 and wday == 3 and pid == 3 and stime in ["12:30", "13:00"]:
                    surge = 0.42 # Shivaji Jayanti / Shivanjali annual day special feast
                elif week_idx == 5 and wday == 0 and pid == 4 and stime in ["08:30", "09:00"]:
                    surge = 0.45 # Final in-sem lab assignment printout rush
                else:
                    surge = 0.0

                raw_index = max(0.02, min(1.0, (base_val * day_mul) + noise + surge))
                coverage = round(float(np.random.uniform(0.85, 0.94)), 2)

                estimated_people = int(round(raw_index * cap))
                detected_count = int(round(estimated_people * coverage))
                if detected_count < 1:
                    detected_count = max(1, int(round(cap * 0.04)))

                actual_estimate = detected_count / coverage
                computed_index = round(float(actual_estimate / cap), 3)

                if computed_index < 0.40:
                    level = "Low"
                elif computed_index <= 0.75:
                    level = "Medium"
                else:
                    level = "High"

                crowd_index_rows.append((
                    pid, sid, week_str, detected_count, coverage, computed_index, level
                ))

                if week_idx >= num_weeks - 2 and detected_count > 0:
                    sample_size = min(detected_count, len(student_hashes))
                    active_students = random.sample(student_hashes, sample_size)
                    slot_date = week_start_date + datetime.timedelta(days=wday)
                    timestamp_str = f"{slot_date.isoformat()} {stime}:00"

                    for s_hash in active_students:
                        responses_rows.append((
                            str(uuid.uuid4()),
                            s_hash,
                            pid,
                            sid,
                            1,
                            timestamp_str,
                            coverage
                        ))

    cursor.executemany("""
    INSERT INTO crowd_index (place_id, slot_id, week_start, count, coverage, crowd_index, level)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, crowd_index_rows)

    cursor.executemany("""
    INSERT INTO responses (response_id, roll_hash, place_id, slot_id, consent, submitted_at, coverage)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, responses_rows)

    conn.commit()

    csv_backup_path = DB_DIR / "crowd_index_backup.csv"
    ci_df = pd.read_sql("SELECT * FROM crowd_index", conn)
    ci_df.to_csv(csv_backup_path, index=False)

    print(f"AISSMS COE Dataset Generated:")
    print(f"- Total crowd records: {len(crowd_index_rows)}")
    print(f"- Total student event tokens: {len(responses_rows)}")
    print(f"- Saved CSV to: {csv_backup_path}")

    conn.close()
    return len(crowd_index_rows)

if __name__ == "__main__":
    generate_multiweek_dataset(num_weeks=7)
