import requests
from typing import Optional
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.logging_config import logger
from app.repositories.pincode_repository import PincodeRepository

# Reusable HTTP session
session = requests.Session()
session.headers.update({
    "User-Agent": "Mozilla/5.0",
    "Accept": "application/json",
})

# In-memory negative cache to prevent re-querying failed PINs during batch runs
_negative_cache = set()

# Regional default approximate coordinates for Indian Postal Circles (PIN first 2 digits)
PIN_REGION_FALLBACKS = {
    11: (28.61, 77.20, "Delhi", "Delhi"),
    12: (28.45, 77.02, "Gurgaon", "Haryana"),
    13: (30.06, 76.82, "Kurukshetra", "Haryana"),
    14: (30.90, 75.85, "Ludhiana", "Punjab"),
    15: (30.21, 74.94, "Bathinda", "Punjab"),
    16: (30.73, 76.77, "Chandigarh", "Chandigarh"),
    17: (31.10, 77.17, "Shimla", "Himachal Pradesh"),
    18: (32.72, 74.85, "Jammu", "Jammu and Kashmir"),
    19: (34.08, 74.79, "Srinagar", "Jammu and Kashmir"),
    20: (28.53, 77.39, "Noida", "Uttar Pradesh"),
    21: (25.43, 81.84, "Allahabad", "Uttar Pradesh"),
    22: (26.84, 80.94, "Lucknow", "Uttar Pradesh"),
    23: (26.44, 80.33, "Kanpur", "Uttar Pradesh"),
    24: (28.98, 77.70, "Meerut", "Uttar Pradesh"),
    25: (25.31, 82.97, "Varanasi", "Uttar Pradesh"),
    26: (27.17, 78.00, "Agra", "Uttar Pradesh"),
    27: (26.76, 83.37, "Gorakhpur", "Uttar Pradesh"),
    28: (25.44, 78.56, "Jhansi", "Uttar Pradesh"),
    30: (26.91, 75.78, "Jaipur", "Rajasthan"),
    31: (24.58, 73.71, "Udaipur", "Rajasthan"),
    32: (25.21, 75.86, "Kota", "Rajasthan"),
    33: (28.02, 73.31, "Bikaner", "Rajasthan"),
    34: (26.23, 73.02, "Jodhpur", "Rajasthan"),
    36: (23.02, 72.57, "Ahmedabad", "Gujarat"),
    37: (23.24, 69.66, "Kutch", "Gujarat"),
    38: (23.02, 72.57, "Ahmedabad", "Gujarat"),
    39: (21.17, 72.83, "Surat", "Gujarat"),
    40: (19.07, 72.87, "Mumbai", "Maharashtra"),
    41: (18.52, 73.85, "Pune", "Maharashtra"),
    42: (19.99, 73.78, "Nashik", "Maharashtra"),
    43: (19.87, 75.34, "Aurangabad", "Maharashtra"),
    44: (21.14, 79.08, "Nagpur", "Maharashtra"),
    45: (22.71, 75.85, "Indore", "Madhya Pradesh"),
    46: (23.25, 77.41, "Bhopal", "Madhya Pradesh"),
    47: (26.21, 78.17, "Gwalior", "Madhya Pradesh"),
    48: (24.17, 79.83, "Jabalpur", "Madhya Pradesh"),
    49: (21.25, 81.62, "Raipur", "Chhattisgarh"),
    50: (17.38, 78.48, "Hyderabad", "Telangana"),
    51: (17.38, 78.48, "Secunderabad", "Telangana"),
    52: (17.68, 83.21, "Visakhapatnam", "Andhra Pradesh"),
    53: (16.50, 80.64, "Vijayawada", "Andhra Pradesh"),
    56: (12.97, 77.59, "Bengaluru", "Karnataka"),
    57: (12.97, 77.59, "Bengaluru North", "Karnataka"),
    58: (12.29, 76.63, "Mysuru", "Karnataka"),
    59: (15.84, 74.50, "Belagavi", "Karnataka"),
    60: (13.08, 80.27, "Chennai", "Tamil Nadu"),
    61: (13.08, 80.27, "Chennai South", "Tamil Nadu"),
    62: (9.92, 78.11, "Madurai", "Tamil Nadu"),
    63: (11.01, 76.95, "Coimbatore", "Tamil Nadu"),
    64: (10.79, 78.70, "Tiruchirappalli", "Tamil Nadu"),
    67: (10.52, 76.21, "Thrissur", "Kerala"),
    68: (9.93, 76.26, "Kochi", "Kerala"),
    69: (8.52, 76.93, "Thiruvananthapuram", "Kerala"),
    70: (22.57, 88.36, "Kolkata", "West Bengal"),
    71: (22.57, 88.36, "Kolkata South", "West Bengal"),
    72: (22.33, 87.32, "Kharagpur", "West Bengal"),
    73: (23.52, 87.31, "Durgapur", "West Bengal"),
    74: (26.72, 88.39, "Siliguri", "West Bengal"),
    75: (20.29, 85.82, "Bhubaneswar", "Odisha"),
    76: (20.46, 85.88, "Cuttack", "Odisha"),
    77: (21.46, 83.97, "Sambalpur", "Odisha"),
    78: (26.14, 91.73, "Guwahati", "Assam"),
    79: (25.57, 91.88, "Shillong", "Meghalaya"),
    80: (25.59, 85.13, "Patna", "Bihar"),
    81: (25.24, 86.98, "Bhagalpur", "Bihar"),
    82: (24.79, 85.00, "Gaya", "Bihar"),
    83: (23.34, 85.30, "Ranchi", "Jharkhand"),
    84: (22.80, 86.20, "Jamshedpur", "Jharkhand"),
    85: (23.66, 86.15, "Dhanbad", "Jharkhand"),
}


class LocationService:

    BASE_URL = (
        "https://api.data.gov.in/resource/"
        "5c2f62fe-5afa-4119-a499-fec9d604d5bd"
    )

    @staticmethod
    async def get_location(
        db: Session,
        pin_code: int,
    ):
        if not pin_code:
            return None

        # 1. Check Database Cache
        location = PincodeRepository.get(db, pin_code)
        if location:
            return location

        if pin_code in _negative_cache:
            return LocationService._get_fallback_location(db, pin_code)

        # 2. Query Govt API with tight timeout (2 sec connect, 3 sec read)
        pins_to_try = [pin_code, pin_code + 1, pin_code - 1]
        selected = None

        for current_pin in pins_to_try:
            params = {
                "api-key": settings.DATA_GOV_API_KEY,
                "format": "json",
                "filters[pincode]": str(current_pin),
            }

            try:
                response = session.get(
                    LocationService.BASE_URL,
                    params=params,
                    timeout=(2, 3),
                )
                if response.status_code == 200:
                    data = response.json()
                    records = data.get("records", [])
                    if records:
                        delivery_records = [
                            r for r in records
                            if r.get("delivery", "").strip().lower() == "delivery"
                        ] or records
                        
                        for r in delivery_records:
                            try:
                                lat = float(r["latitude"])
                                lon = float(r["longitude"])
                                selected = {
                                    "record": r,
                                    "lat": lat,
                                    "lon": lon,
                                }
                                break
                            except (ValueError, TypeError, KeyError):
                                continue
            except Exception:
                pass

            if selected:
                break

        if selected:
            record = selected["record"]
            location = PincodeRepository.save(
                db=db,
                pin_code=pin_code,
                latitude=selected["lat"],
                longitude=selected["lon"],
                office_name=record.get("officename"),
                district=record.get("district"),
                state=record.get("statename"),
                region=record.get("regionname"),
                circle=record.get("circlename"),
            )
            return location

        # 3. Add to negative cache and use regional fallback coordinates
        _negative_cache.add(pin_code)
        return LocationService._get_fallback_location(db, pin_code)

    @staticmethod
    def _get_fallback_location(db: Session, pin_code: int):
        prefix = int(str(pin_code)[:2]) if len(str(pin_code)) >= 2 else 70
        fallback = PIN_REGION_FALLBACKS.get(prefix, (22.57, 88.36, "Region Central", "India"))
        
        lat, lon, office, state = fallback
        try:
            return PincodeRepository.save(
                db=db,
                pin_code=pin_code,
                latitude=lat,
                longitude=lon,
                office_name=f"{office} (Estimated)",
                district=office,
                state=state,
                region=state,
                circle=state,
            )
        except Exception:
            return PincodeRepository.get(db, pin_code)