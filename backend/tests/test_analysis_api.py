import pytest


def test_analysis_endpoints_require_authentication(client):
    """Verify all /analysis endpoints reject unauthenticated requests with 401 Unauthorized."""
    # 1. Live analysis route
    res = client.get("/analysis/KA01AB1234")
    assert res.status_code == 401

    # 2. Records list route
    res = client.get("/analysis/records")
    assert res.status_code == 401

    # 3. Stats route
    res = client.get("/analysis/records/stats")
    assert res.status_code == 401

    # 4. Detail route
    res = client.get("/analysis/records/detail/KA01AB1234")
    assert res.status_code == 401

    # 5. Sync route
    res = client.post("/analysis/records/sync")
    assert res.status_code == 401


def test_authenticated_analysis_flow(client, auth_headers):
    """Verify authenticated user can query vehicle analysis and view records."""
    # Query a vehicle
    res = client.get("/analysis/KA01AB1234", headers=auth_headers)
    assert res.status_code == 200
    data = res.json()
    assert data["vehicle_number"] == "KA01AB1234"
    assert "risk_score" in data
    assert "risk_level" in data
    assert "rules" in data

    # Query records list
    res_records = client.get("/analysis/records", headers=auth_headers)
    assert res_records.status_code == 200
    records_data = res_records.json()
    assert "records" in records_data
    assert "total" in records_data

    # Query statistics
    res_stats = client.get("/analysis/records/stats", headers=auth_headers)
    assert res_stats.status_code == 200
    stats_data = res_stats.json()
    assert "total_records" in stats_data
    assert "high_risk" in stats_data
