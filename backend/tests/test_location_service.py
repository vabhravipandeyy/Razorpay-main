import pytest
from app.services.location_service import LocationService
from app.models.pincode_location import PincodeLocation


@pytest.mark.asyncio
async def test_location_service_cache_hit(db):
    """If coordinate exists in database, return immediately without API call."""
    db.add(PincodeLocation(
        pin_code=560001,
        latitude=12.9716,
        longitude=77.5946,
        office_name="Bangalore GPO",
        state="Karnataka"
    ))
    db.commit()

    loc = await LocationService.get_location(db, 560001)
    assert loc is not None
    assert loc.latitude == 12.9716
    assert loc.longitude == 77.5946
    assert loc.office_name == "Bangalore GPO"


@pytest.mark.asyncio
async def test_location_service_regional_fallback(db):
    """When API fails, use regional PIN prefix fallback coordinates."""
    # Delhi prefix 11
    loc = LocationService._get_fallback_location(db, 110099)
    assert loc is not None
    assert round(loc.latitude, 1) == 28.6
    assert round(loc.longitude, 1) == 77.2
    assert "Estimated" in loc.office_name


@pytest.mark.asyncio
async def test_location_service_invalid_pin(db):
    """Zero or None pin returns None safely."""
    assert await LocationService.get_location(db, 0) is None
    assert await LocationService.get_location(db, None) is None
