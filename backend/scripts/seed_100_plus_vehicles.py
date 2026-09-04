import sys
import random
from datetime import datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.database import SessionLocal
from app.models.user import User
from app.core.security import hash_password
from app.models.eway_bill import EwayBill
from app.models.fastag_transaction import FastagTransaction
from app.models.pincode_location import PincodeLocation
from app.services.analysis_service import AnalysisService

PINCODES = [
    (110001, 28.6328, 77.2197, "New Delhi GPO", "Central Delhi", "Delhi"),
    (122001, 28.4595, 77.0266, "Gurugram SO", "Gurgaon", "Haryana"),
    (201301, 28.5355, 77.3910, "Noida SO", "Gautam Buddha Nagar", "Uttar Pradesh"),
    (302001, 26.9124, 75.7873, "Jaipur GPO", "Jaipur", "Rajasthan"),
    (380001, 23.0225, 72.5714, "Ahmedabad GPO", "Ahmedabad", "Gujarat"),
    (395001, 21.1702, 72.8311, "Surat GPO", "Surat", "Gujarat"),
    (400001, 18.9388, 72.8353, "Mumbai GPO", "Mumbai", "Maharashtra"),
    (411001, 18.5204, 73.8567, "Pune GPO", "Pune", "Maharashtra"),
    (500001, 17.3850, 78.4867, "Hyderabad GPO", "Hyderabad", "Telangana"),
    (560001, 12.9716, 77.5946, "Bengaluru GPO", "Bengaluru", "Karnataka"),
    (600001, 13.0827, 80.2707, "Chennai GPO", "Chennai", "Tamil Nadu"),
    (700001, 22.5726, 88.3639, "Kolkata GPO", "Kolkata", "West Bengal"),
    (226001, 26.8467, 80.9462, "Lucknow GPO", "Lucknow", "Uttar Pradesh"),
    (160001, 30.7333, 76.7794, "Chandigarh GPO", "Chandigarh", "Punjab"),
    (452001, 22.7196, 75.8577, "Indore GPO", "Indore", "Madhya Pradesh"),
]


def seed_users(db):
    print("\n[1/5] Seeding Officers & Inspectors...")
    users_to_seed = [
        {"username": "ins1", "password": "ins1#123", "role": "inspector", "full_name": "Inspector 1 - Senior Enforcement Officer", "email": "ins1@gst-analytics.gov.in"},
        {"username": "ins2", "password": "ins2#123", "role": "inspector", "full_name": "Inspector 2 - Flying Squad Officer", "email": "ins2@gst-analytics.gov.in"},
        {"username": "auditor1", "password": "auditor#123", "role": "inspector", "full_name": "Tax Auditor - Intelligence Wing", "email": "auditor1@gst-analytics.gov.in"},
    ]
    for u in users_to_seed:
        existing = db.query(User).filter(User.username == u["username"]).first()
        if not existing:
            new_u = User(
                username=u["username"],
                email=u["email"],
                full_name=u["full_name"],
                role=u["role"],
                hashed_password=hash_password(u["password"]),
                is_active=True
            )
            db.add(new_u)
            print(f"  + User created: {u['username']} (Role: {u['role']})")
        else:
            existing.hashed_password = hash_password(u["password"])
            existing.full_name = u["full_name"]
            existing.is_active = True
            print(f"  ~ User credentials updated: {u['username']}")
    db.commit()


def seed_pincodes(db):
    print("\n[2/5] Seeding Pincode Locations...")
    for pin, lat, lon, name, dist, st in PINCODES:
        existing = db.query(PincodeLocation).filter(PincodeLocation.pin_code == pin).first()
        if not existing:
            loc = PincodeLocation(
                pin_code=pin,
                latitude=lat,
                longitude=lon,
                office_name=name,
                district=dist,
                state=st,
                region="HQ",
                circle=st
            )
            db.add(loc)
    db.commit()


def seed_100_plus_vehicles(db):
    print("\n[3/5] Generating 110 Realistic Transport Vehicles (High, Medium, Low Risk)...")

    now = datetime.utcnow()
    states = ["MH", "DL", "KA", "GJ", "WB", "TN", "UP", "RJ", "HR", "PB", "AP", "TS", "MP"]

    base_ewb_no = 300000000000
    base_toll_id = 90000

    all_ewbs = []
    all_fastags = []
    vehicle_numbers = []

    for i in range(1, 111):
        st = states[(i - 1) % len(states)]
        series = chr(65 + ((i // 10) % 26)) + chr(65 + (i % 26))
        v_num = f"{st}{((i % 99) + 1):02d}{series}{((i * 43) % 8999) + 1000}"
        vehicle_numbers.append(v_num)

        ewb_dt = now - timedelta(hours=random.randint(24, 96))

        # =========================================================================
        # 1. HIGH RISK VEHICLES (i = 1 to 25)
        # Combine Rule 4 (Impossible speed: 30) + Rule 3 (Outside validity: 20) + Rule 5 (Deviation: 25) = 75-85 pts!
        # =========================================================================
        if i <= 25:
            # Short declared trip: Pune (411001) to Mumbai (400001)
            valid_dt = ewb_dt + timedelta(hours=18)  # Already expired
            ewb = EwayBill(
                ewb_no=base_ewb_no + i,
                ewb_dt=ewb_dt,
                from_pin=411001,
                to_pin=400001,
                travel_distance=150,
                ewb_final_valid_dt=valid_dt,
                ewb_ass_amt=float(random.randint(120000, 280000)),
                cgst_amt=162000.0,
                sgst_amt=162000.0,
                igst_amt=0.0,
                vehicle_number=v_num
            )
            all_ewbs.append(ewb)

            # Fastags triggering:
            # 1) Impossible speed: 70 km in 8 minutes (>500 km/h) -> Rule 4 (30 pts)
            # 2) Scans occurring after valid_dt -> Rule 3 (20 pts)
            # 3) Divergent coordinates far from Mumbai/Pune corridor -> Rule 5 (25 pts)
            t1 = FastagTransaction(
                toll_id=base_toll_id + i * 10 + 1,
                toll_name="Dankuni Bypass Plaza",
                highway_type="NH-19",
                geo_lat=22.6845,
                geo_long=88.2945,  # Deviated to West Bengal!
                readertme=valid_dt + timedelta(hours=5),
                veh=v_num
            )
            t2 = FastagTransaction(
                toll_id=base_toll_id + i * 10 + 2,
                toll_name="Palsit Plaza",
                highway_type="NH-19",
                geo_lat=23.1845,
                geo_long=88.0215,  # 65 km away in 8 mins!
                readertme=valid_dt + timedelta(hours=5, minutes=8),
                veh=v_num
            )
            all_fastags.extend([t1, t2])

        # =========================================================================
        # 2. MEDIUM RISK VEHICLES (i = 26 to 55)
        # Rule 4 only (speed ~95 km/h: 30 pts) OR Rule 3 (outside validity: 20 pts) = 30-50 pts
        # =========================================================================
        elif i <= 55:
            from_p, to_p = 560001, 600001  # Bengaluru to Chennai
            valid_dt = ewb_dt + timedelta(days=2)
            ewb = EwayBill(
                ewb_no=base_ewb_no + i,
                ewb_dt=ewb_dt,
                from_pin=from_p,
                to_pin=to_p,
                travel_distance=340,
                ewb_final_valid_dt=valid_dt,
                ewb_ass_amt=float(random.randint(75000, 160000)),
                cgst_amt=0.0,
                sgst_amt=0.0,
                igst_amt=160000.0,
                vehicle_number=v_num
            )
            all_ewbs.append(ewb)

            # Moderate speed burst (110 km/h)
            t1 = FastagTransaction(
                toll_id=base_toll_id + i * 10 + 1,
                toll_name="Attibele Plaza",
                highway_type="NH-44",
                geo_lat=12.7845,
                geo_long=77.7712,
                readertme=ewb_dt + timedelta(hours=1),
                veh=v_num
            )
            t2 = FastagTransaction(
                toll_id=base_toll_id + i * 10 + 2,
                toll_name="Sriperumbudur Plaza",
                highway_type="NH-48",
                geo_lat=12.9845,
                geo_long=79.9412,
                readertme=ewb_dt + timedelta(hours=2, minutes=45),  # 240 km in 1h45m = ~137 km/h -> Rule 4
                veh=v_num
            )
            all_fastags.extend([t1, t2])

        # =========================================================================
        # 3. LOW RISK / FULLY COMPLIANT (i = 56 to 110)
        # Normal steady speeds (50-60 km/h), within validity, correct routes = 0 pts
        # =========================================================================
        else:
            from_p, to_p = 110001, 302001  # Delhi to Jaipur
            valid_dt = ewb_dt + timedelta(days=3)
            ewb = EwayBill(
                ewb_no=base_ewb_no + i,
                ewb_dt=ewb_dt,
                from_pin=from_p,
                to_pin=to_p,
                travel_distance=270,
                ewb_final_valid_dt=valid_dt,
                ewb_ass_amt=float(random.randint(45000, 95000)),
                cgst_amt=0.0,
                sgst_amt=0.0,
                igst_amt=54000.0,
                vehicle_number=v_num
            )
            all_ewbs.append(ewb)

            t1 = FastagTransaction(
                toll_id=base_toll_id + i * 10 + 1,
                toll_name="Kherki Daula Plaza",
                highway_type="NH-48",
                geo_lat=28.4011,
                geo_long=76.9945,
                readertme=ewb_dt + timedelta(hours=1),
                veh=v_num
            )
            t2 = FastagTransaction(
                toll_id=base_toll_id + i * 10 + 2,
                toll_name="Shahjahanpur Plaza",
                highway_type="NH-48",
                geo_lat=27.9945,
                geo_long=76.4215,
                readertme=ewb_dt + timedelta(hours=2, minutes=45),
                veh=v_num
            )
            t3 = FastagTransaction(
                toll_id=base_toll_id + i * 10 + 3,
                toll_name="Manoharpur Plaza",
                highway_type="NH-48",
                geo_lat=27.3012,
                geo_long=75.9545,
                readertme=ewb_dt + timedelta(hours=4, minutes=30),
                veh=v_num
            )
            all_fastags.extend([t1, t2, t3])

    print(f"\n[4/5] Persisting {len(all_ewbs)} E-Way Bills & {len(all_fastags)} FASTags...")
    for e in all_ewbs:
        existing = db.query(EwayBill).filter(EwayBill.ewb_no == e.ewb_no).first()
        if not existing:
            db.add(e)
    db.commit()

    for f in all_fastags:
        db.add(f)
    db.commit()

    print(f"\n[5/5] Running Batch Pipeline Analysis for all 110 Vehicles...")
    import asyncio
    
    async def run_batch():
        count = 0
        high_cnt = 0
        med_cnt = 0
        low_cnt = 0
        for veh in vehicle_numbers:
            res = await AnalysisService.analyze_vehicle(db, veh)
            count += 1
            level = res.get("risk_level", "LOW")
            score = res.get("risk_score", 0)
            if level == "HIGH" or score >= 60:
                high_cnt += 1
            elif level == "MEDIUM" or score >= 30:
                med_cnt += 1
            else:
                low_cnt += 1
            if count % 25 == 0 or count == len(vehicle_numbers):
                print(f"  Processed {count}/{len(vehicle_numbers)} vehicles (High: {high_cnt}, Medium: {med_cnt}, Low: {low_cnt})")

    asyncio.run(run_batch())
    print("\nDatabase seeding & pipeline analysis completed successfully!")
    db.close()


if __name__ == "__main__":
    db = SessionLocal()
    seed_users(db)
    seed_pincodes(db)
    seed_100_plus_vehicles(db)
