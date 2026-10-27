"""
Campus SmartQueue 2.0 - End-to-End System Integration Test
"""

import sys
from pathlib import Path
from fastapi.testclient import TestClient

ROOT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT_DIR))

from app.api import app

def run_tests():
    client = TestClient(app)

    print("--- Running Campus SmartQueue 2.0 Integration Tests ---")

    # Test 1: Places
    r1 = client.get('/api/places')
    assert r1.status_code == 200, f"Places failed: {r1.status_code}"
    places = r1.json()['places']
    print(f"[OK] 1. /api/places: OK ({len(places)} facilities registered)")

    # Test 2: Live Status
    r2 = client.get('/api/status')
    assert r2.status_code == 200, f"Status failed: {r2.status_code}"
    status = r2.json()
    clock = status["clock"]
    print(f"[OK] 2. /api/status: OK (Campus Clock: {clock['weekday_name']} {clock['time_label']})")

    # Test 3: Forecast
    r3 = client.get('/api/forecast?place_id=3')
    assert r3.status_code == 200, f"Forecast failed: {r3.status_code}"
    fc = r3.json()
    print(f"[OK] 3. /api/forecast: OK ({len(fc['hourly_forecast'])} slots, Active model: {fc['active_model']})")

    # Test 4: Best-time
    r4 = client.get('/api/best-time?place_id=4')
    assert r4.status_code == 200, f"Best-time failed: {r4.status_code}"
    bt = r4.json()
    print(f"[OK] 4. /api/best-time: OK (Top quiet slot: {bt['best_slot']['time_label']}, Level: {bt['best_slot']['level']})")

    # Test 5: Queue Simulator (Erlang C)
    r5 = client.post('/api/queue-simulator', json={'arrival_rate': 1.5, 'service_rate': 0.5, 'counters': 4})
    assert r5.status_code == 200, f"Queue sim failed: {r5.status_code}"
    q_res = r5.json()
    print(f"[OK] 5. /api/queue-simulator (Erlang C): OK (Wait: {q_res['wait_time_minutes']} min, Utilization: {q_res['utilization']}%)")

    # Test 6: Static frontend index.html
    r6 = client.get('/')
    assert r6.status_code == 200 and 'Campus SmartQueue 2.0' in r6.text, "Frontend index failed"
    print("[OK] 6. Frontend index.html: OK (Served at root /)")

    # Test 7: Take Virtual Token
    r7 = client.post('/api/take-token', json={'place_id': 2, 'department': 'AI&DS', 'student_roll': '25AI113'})
    assert r7.status_code == 200, f"Token failed: {r7.status_code}"
    t_res = r7.json()
    print(f"[OK] 7. /api/take-token: OK (Code: {t_res['token_code']}, Ahead: {t_res['ahead_in_queue']}, Call: {t_res['estimated_call_time']})")

    # Test 8: Weekly Heatmap Matrix
    r8 = client.get('/api/weekly-heatmap?place_id=3')
    assert r8.status_code == 200, f"Heatmap failed: {r8.status_code}"
    hm_res = r8.json()
    assert 'Monday' in hm_res['heatmap'], "Monday missing in heatmap"
    print(f"[OK] 8. /api/weekly-heatmap: OK ({len(hm_res['heatmap'])} days x {len(hm_res['heatmap']['Monday'])} slots matrix)")

    # Test 9: Departments API
    r9 = client.get('/api/departments')
    assert r9.status_code == 200, f"Departments failed: {r9.status_code}"
    depts = r9.json()['departments']
    print(f"[OK] 9. /api/departments: OK ({len(depts)} engineering departments for AISSMS COE)")

    print("\nALL PHASE VERIFICATION TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_tests()
