import pytest
from datetime import datetime
from app.services.analysis_service import AnalysisService
from app.models.eway_bill import EwayBill
from app.models.fastag_transaction import FastagTransaction


@pytest.mark.asyncio
async def test_batch_sync_empty_database(db):
    """Batch sync on empty database safely returns 0 processed."""
    count = await AnalysisService.batch_sync_vehicles(db, limit=10, max_workers=2)
    assert count == 0


@pytest.mark.asyncio
async def test_batch_sync_skip_existing(db):
    """Batch sync skips already analyzed vehicles when skip_existing is True."""
    # Pre-populate and analyze one vehicle
    db.add(EwayBill(
        ewb_no=7001,
        ewb_dt=datetime(2026, 8, 1, 8, 0),
        from_pin=110001,
        to_pin=400001,
        travel_distance=1150,
        ewb_final_valid_dt=datetime(2026, 8, 3, 20, 0),
        vehicle_number="GJ01XX9999"
    ))
    db.commit()

    # Analyze first time
    await AnalysisService.analyze_vehicle(db, "GJ01XX9999")

    # Second sync with skip_existing=True should find 0 new vehicles
    synced = await AnalysisService.batch_sync_vehicles(db, limit=10, max_workers=2, skip_existing=True)
    assert synced == 0
