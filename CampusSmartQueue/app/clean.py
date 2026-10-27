"""
Campus SmartQueue 2.0 - Cleaning, Validation & Privacy Layer
Implements Slides 8, 9, 12, 17, and 19:
- Pydantic schema validation for incoming sensor/counter data
- Salted SHA-256 anonymization of student roll numbers
- Privacy filter: suppression of individual count displays if group size < 10
- Scaling formula: estimate = count / coverage; crowd_index = estimate / capacity
- Categorical level banding: Low (< 0.40), Medium (0.40 - 0.75), High (> 0.75)
"""

import hashlib
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator
import pandas as pd
from app.db import get_connection

HASH_SALT = "CampusSmartQueue_2026_SecureSalt"

class SensorRecord(BaseModel):
    place_id: int = Field(..., ge=1, le=6, description="Campus facility ID")
    slot_id: int = Field(..., ge=1, le=120, description="30-min time slot ID")
    raw_identifier: Optional[str] = None
    count: int = Field(..., ge=0, description="Raw detected footfall count")
    coverage: float = Field(0.85, ge=0.1, le=1.0, description="Sensor coverage factor")

    @field_validator('coverage')
    @classmethod
    def validate_coverage(cls, v):
        if v <= 0 or v > 1.0:
            raise ValueError("Coverage must be between 0.1 and 1.0")
        return round(float(v), 2)

def hash_student_roll(raw_id: str, salt: str = HASH_SALT) -> str:
    """SHA-256 salted hash preserving student privacy (Slide 12 & 19)."""
    return hashlib.sha256(f"{raw_id}_{salt}".encode("utf-8")).hexdigest()[:16]

def compute_crowd_index(count: int, coverage: float, capacity: int) -> Dict[str, Any]:
    """
    Computes scaled crowd estimate and index per Slide 17:
    estimate = count / coverage
    crowd_index = estimate / capacity
    """
    coverage = max(0.1, min(1.0, coverage))
    estimate = count / coverage
    index_val = round(estimate / max(1, capacity), 3)

    if index_val < 0.40:
        level = "Low"
    elif index_val <= 0.75:
        level = "Medium"
    else:
        level = "High"

    return {
        "estimate": round(estimate, 1),
        "crowd_index": index_val,
        "level": level
    }

def apply_privacy_suppression(count: int, threshold: int = 10) -> Optional[int]:
    """
    Slide 19: Privacy Rule - Hide groups under 10 to prevent de-anonymization.
    Returns None if count is suppressed.
    """
    if count < threshold:
        return None
    return count

def get_clean_crowd_dataframe() -> pd.DataFrame:
    """Reads crowd_index joined with places and slots for modeling & dashboard."""
    conn = get_connection()
    query = """
    SELECT 
        ci.id,
        ci.place_id,
        p.name AS place_name,
        p.category,
        p.capacity,
        p.data_source,
        p.service_rate_per_min,
        p.default_counters,
        ci.slot_id,
        s.weekday,
        s.start_time,
        s.end_time,
        s.time_label,
        ci.week_start,
        ci.count,
        ci.coverage,
        ci.crowd_index,
        ci.level
    FROM crowd_index ci
    JOIN places p ON ci.place_id = p.place_id
    JOIN slots s ON ci.slot_id = s.slot_id
    ORDER BY ci.week_start, s.weekday, s.slot_id
    """
    df = pd.read_sql(query, conn)
    conn.close()

    df['hour'] = df['start_time'].apply(lambda x: int(x.split(':')[0]))
    df['minute'] = df['start_time'].apply(lambda x: int(x.split(':')[1]))
    df['time_decimal'] = df['hour'] + df['minute'] / 60.0

    return df

if __name__ == "__main__":
    df = get_clean_crowd_dataframe()
    print("Clean Dataframe Loaded:")
    print(f"Shape: {df.shape}")
    print("Sample:\n", df[['place_name', 'time_label', 'crowd_index', 'level']].head())
