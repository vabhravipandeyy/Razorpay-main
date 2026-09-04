import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Ensure app is importable
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.base import Base
from app.core.database import engine, SessionLocal
import app.models
from app.models.eway_bill import EwayBill
from app.models.fastag_transaction import FastagTransaction
from app.models.pincode_location import PincodeLocation
from app.services.analysis_service import AnalysisService
from app.core.logging_config import logger


PINCODE_DATA = [
    {"pin_code": 110001, "latitude": 28.6328, "longitude": 77.2197, "office_name": "New Delhi GPO", "district": "Central Delhi", "state": "Delhi"},
    {"pin_code": 122001, "latitude": 28.4595, "longitude": 77.0266, "office_name": "Gurugram SO", "district": "Gurgaon", "state": "Haryana"},
    {"pin_code": 201301, "latitude": 28.5355, "longitude": 77.3910, "office_name": "Noida SO", "district": "Gautam Buddha Nagar", "state": "Uttar Pradesh"},
    {"pin_code": 302001, "latitude": 26.9124, "longitude": 75.7873, "office_name": "Jaipur GPO", "district": "Jaipur", "state": "Rajasthan"},
    {"pin_code": 380001, "latitude": 23.0225, "longitude": 72.5714, "office_name": "Ahmedabad GPO", "district": "Ahmedabad", "state": "Gujarat"},
    {"pin_code": 395001, "latitude": 21.1702, "longitude": 72.8311, "office_name": "Surat GPO", "district": "Surat", "state": "Gujarat"},
    {"pin_code": 400001, "latitude": 18.9388, "longitude": 72.8353, "office_name": "Mumbai GPO", "district": "Mumbai", "state": "Maharashtra"},
    {"pin_code": 411001, "latitude": 18.5204, "longitude": 73.8567, "office_name": "Pune GPO", "district": "Pune", "state": "Maharashtra"},
    {"pin_code": 500001, "latitude": 17.3850, "longitude": 78.4867, "office_name": "Hyderabad GPO", "district": "Hyderabad", "state": "Telangana"},
    {"pin_code": 560001, "latitude": 12.9716, "longitude": 77.5946, "office_name": "Bengaluru GPO", "district": "Bengaluru", "state": "Karnataka"},
    {"pin_code": 600001, "latitude": 13.0827, "longitude": 80.2707, "office_name": "Chennai GPO", "district": "Chennai", "state": "Tamil Nadu"},
    {"pin_code": 700001, "latitude": 22.5726, "longitude": 88.3639, "office_name": "Kolkata GPO", "district": "Kolkata", "state": "West Bengal"},
    {"pin_code": 226001, "latitude": 26.8467, "longitude": 80.9462, "office_name": "Lucknow GPO", "district": "Lucknow", "state": "Uttar Pradesh"},
    {"pin_code": 160001, "latitude": 30.7333, "longitude": 76.7794, "office_name": "Chandigarh GPO", "district": "Chandigarh", "state": "Punjab"},
    {"pin_code": 452001, "latitude": 22.7196, "longitude": 75.8577, "office_name": "Indore GPO", "district": "Indore", "state": "Madhya Pradesh"},
]


def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    print("==================================================")
    print("Seeding Realistic GST & FASTag Data")
    print("==================================================")

    # 1. Seed Pincodes
    print("\n[1/4] Upserting Core Pincode Locations...")
    for p in PINCODE_DATA:
        existing = db.query(PincodeLocation).filter(PincodeLocation.pin_code == p["pin_code"]).first()
        if not existing:
            loc = PincodeLocation(
                pin_code=p["pin_code"],
                latitude=p["latitude"],
                longitude=p["longitude"],
                office_name=p["office_name"],
                district=p["district"],
                state=p["state"],
                region="HQ",
                circle=p["state"]
            )
            db.add(loc)
    db.commit()
    print("  -> Pincodes synced.")

    now = datetime.utcnow()

    # Clear existing synthetic EWBs and FASTags if desired, or skip existing
    # 2. Define High-Signal Vehicles
    # -------------------------------------------------------------
    # VEHICLE 1: MH12AB1234 (HIGH RISK - IMPOSSIBLE SPEED > 200 km/h)
    # -------------------------------------------------------------
    v1 = "MH12AB1234"
    ewb1_dt = now - timedelta(hours=36)
    ewb1_valid = ewb1_dt + timedelta(days=2)
    ewb1 = EwayBill(
        ewb_no=100000000001,
        ewb_dt=ewb1_dt,
        from_pin=411001,  # Pune
        to_pin=400001,    # Mumbai
        travel_distance=150,
        ewb_final_valid_dt=ewb1_valid,
        ewb_ass_amt=1450000.00,
        cgst_amt=130500.00,
        sgst_amt=130500.00,
        igst_amt=0.00,
        vehicle_number=v1
    )
    # Fastag with impossible jump: Pune to Khalapur in 15 mins (distance ~70 km = 280 km/h)
    f1_1 = FastagTransaction(
        toll_id=901,
        toll_name="Khedshivapur Plaza",
        highway_type="NH-48",
        geo_lat=18.3245,
        geo_long=73.8456,
        readertme=ewb1_dt + timedelta(hours=2),
        veh=v1
    )
    f1_2 = FastagTransaction(
        toll_id=902,
        toll_name="Khalapur Expressway Plaza",
        highway_type="NE-1",
        geo_lat=18.7845,
        geo_long=73.2845,
        readertme=ewb1_dt + timedelta(hours=2, minutes=14),  # 14 mins!
        veh=v1
    )
    f1_3 = FastagTransaction(
        toll_id=903,
        toll_name="Vashi Toll Plaza",
        highway_type="SH-42",
        geo_lat=19.0654,
        geo_long=72.9865,
        readertme=ewb1_dt + timedelta(hours=2, minutes=32),
        veh=v1
    )

    # -------------------------------------------------------------
    # VEHICLE 2: DL01XY9876 (HIGH RISK - DUPLICATE OVERLAPPING EWBs)
    # -------------------------------------------------------------
    v2 = "DL01XY9876"
    ewb2_1_dt = now - timedelta(hours=48)
    ewb2_1_valid = ewb2_1_dt + timedelta(days=3)
    ewb2_1 = EwayBill(
        ewb_no=100000000002,
        ewb_dt=ewb2_1_dt,
        from_pin=110001,  # Delhi
        to_pin=302001,    # Jaipur (West vector)
        travel_distance=280,
        ewb_final_valid_dt=ewb2_1_valid,
        ewb_ass_amt=1850000.00,
        cgst_amt=166500.00,
        sgst_amt=166500.00,
        igst_amt=0.00,
        vehicle_number=v2
    )
    # Overlapping second bill to Kolkata (East vector)
    ewb2_2_dt = ewb2_1_dt + timedelta(hours=4)
    ewb2_2_valid = ewb2_2_dt + timedelta(days=6)
    ewb2_2 = EwayBill(
        ewb_no=100000000003,
        ewb_dt=ewb2_2_dt,
        from_pin=110001,  # Delhi
        to_pin=700001,    # Kolkata (Opposite direction!)
        travel_distance=1450,
        ewb_final_valid_dt=ewb2_2_valid,
        ewb_ass_amt=2850000.00,
        cgst_amt=0.00,
        sgst_amt=0.00,
        igst_amt=513000.00,
        vehicle_number=v2
    )
    f2_1 = FastagTransaction(
        toll_id=904,
        toll_name="Kherki Daula Plaza",
        highway_type="NH-48",
        geo_lat=28.4011,
        geo_long=76.9945,
        readertme=ewb2_1_dt + timedelta(hours=5),
        veh=v2
    )
    f2_2 = FastagTransaction(
        toll_id=905,
        toll_name="Shahjahanpur Plaza",
        highway_type="NH-48",
        geo_lat=27.9945,
        geo_long=76.4215,
        readertme=ewb2_1_dt + timedelta(hours=7, minutes=30),
        veh=v2
    )

    # -------------------------------------------------------------
    # VEHICLE 3: WB37C8894 (HIGH RISK - EXPIRED VALIDITY & DEVIATION)
    # -------------------------------------------------------------
    v3 = "WB37C8894"
    ewb3_dt = now - timedelta(days=7)
    ewb3_valid = ewb3_dt + timedelta(days=2)  # Expired 5 days ago!
    ewb3 = EwayBill(
        ewb_no=100000000004,
        ewb_dt=ewb3_dt,
        from_pin=700001,  # Kolkata
        to_pin=110001,    # Delhi
        travel_distance=1450,
        ewb_final_valid_dt=ewb3_valid,
        ewb_ass_amt=2100000.00,
        cgst_amt=0.00,
        sgst_amt=0.00,
        igst_amt=378000.00,
        vehicle_number=v3
    )
    # Toll scan occurs today - well after ewb_final_valid_dt!
    f3_1 = FastagTransaction(
        toll_id=906,
        toll_name="Dankuni Toll Plaza",
        highway_type="NH-19",
        geo_lat=22.6845,
        geo_long=88.2945,
        readertme=now - timedelta(hours=12),
        veh=v3
    )
    f3_2 = FastagTransaction(
        toll_id=907,
        toll_name="Palsit Toll Plaza",
        highway_type="NH-19",
        geo_lat=23.1845,
        geo_long=88.0215,
        readertme=now - timedelta(hours=9),
        veh=v3
    )

    # -------------------------------------------------------------
    # VEHICLE 4: GJ06EF5678 (HIGH RISK - GHOST TRANSIT / NO FASTAG)
    # -------------------------------------------------------------
    v4 = "GJ06EF5678"
    ewb4_dt = now - timedelta(hours=28)
    ewb4_valid = ewb4_dt + timedelta(days=3)
    ewb4 = EwayBill(
        ewb_no=100000000005,
        ewb_dt=ewb4_dt,
        from_pin=380001,  # Ahmedabad
        to_pin=395001,    # Surat
        travel_distance=260,
        ewb_final_valid_dt=ewb4_valid,
        ewb_ass_amt=1780000.00,
        cgst_amt=160200.00,
        sgst_amt=160200.00,
        igst_amt=0.00,
        vehicle_number=v4
    )
    # NO FASTag scans recorded at all -> Ghost bill recycling!

    # -------------------------------------------------------------
    # VEHICLE 5: KA05CD4321 (MEDIUM RISK - MARGINAL TELEMETRY)
    # -------------------------------------------------------------
    v5 = "KA05CD4321"
    ewb5_dt = now - timedelta(hours=24)
    ewb5_valid = ewb5_dt + timedelta(days=2)
    ewb5 = EwayBill(
        ewb_no=100000000006,
        ewb_dt=ewb5_dt,
        from_pin=560001,  # Bengaluru
        to_pin=600001,    # Chennai
        travel_distance=340,
        ewb_final_valid_dt=ewb5_valid,
        ewb_ass_amt=950000.00,
        cgst_amt=0.00,
        sgst_amt=0.00,
        igst_amt=171000.00,
        vehicle_number=v5
    )
    f5_1 = FastagTransaction(
        toll_id=908,
        toll_name="Attibele Toll Plaza",
        highway_type="NH-44",
        geo_lat=12.7845,
        geo_long=77.7712,
        readertme=ewb5_dt + timedelta(hours=3),
        veh=v5
    )
    f5_2 = FastagTransaction(
        toll_id=909,
        toll_name="Sriperumbudur Toll Plaza",
        highway_type="NH-48",
        geo_lat=12.9845,
        geo_long=79.9412,
        readertme=ewb5_dt + timedelta(hours=6, minutes=45),
        veh=v5
    )

    # -------------------------------------------------------------
    # VEHICLE 6: UP32JK3344 (LOW RISK - FULLY COMPLIANT)
    # -------------------------------------------------------------
    v6 = "UP32JK3344"
    ewb6_dt = now - timedelta(hours=30)
    ewb6_valid = ewb6_dt + timedelta(days=3)
    ewb6 = EwayBill(
        ewb_no=100000000007,
        ewb_dt=ewb6_dt,
        from_pin=226001,  # Lucknow
        to_pin=201301,    # Noida
        travel_distance=520,
        ewb_final_valid_dt=ewb6_valid,
        ewb_ass_amt=680000.00,
        cgst_amt=61200.00,
        sgst_amt=61200.00,
        igst_amt=0.00,
        vehicle_number=v6
    )
    f6_1 = FastagTransaction(
        toll_id=910,
        toll_name="Agra Lucknow Toll Plaza",
        highway_type="ALE",
        geo_lat=26.9845,
        geo_long=80.1245,
        readertme=ewb6_dt + timedelta(hours=2),
        veh=v6
    )
    f6_2 = FastagTransaction(
        toll_id=911,
        toll_name="Fatehabad Plaza",
        highway_type="ALE",
        geo_lat=27.1245,
        geo_long=78.2845,
        readertme=ewb6_dt + timedelta(hours=6),  # 4 hours for 220 km = 55 km/h
        veh=v6
    )
    f6_3 = FastagTransaction(
        toll_id=912,
        toll_name="Jewar Toll Plaza",
        highway_type="YEW",
        geo_lat=28.1245,
        geo_long=77.5845,
        readertme=ewb6_dt + timedelta(hours=9),  # 3 hours for 180 km = 60 km/h
        veh=v6
    )

    # -------------------------------------------------------------
    # VEHICLE 7: RJ14LM5566 (LOW RISK - FULLY COMPLIANT)
    # -------------------------------------------------------------
    v7 = "RJ14LM5566"
    ewb7_dt = now - timedelta(hours=18)
    ewb7_valid = ewb7_dt + timedelta(days=2)
    ewb7 = EwayBill(
        ewb_no=100000000008,
        ewb_dt=ewb7_dt,
        from_pin=302001,  # Jaipur
        to_pin=122001,    # Gurugram
        travel_distance=230,
        ewb_final_valid_dt=ewb7_valid,
        ewb_ass_amt=420000.00,
        cgst_amt=0.00,
        sgst_amt=0.00,
        igst_amt=75600.00,
        vehicle_number=v7
    )
    f7_1 = FastagTransaction(
        toll_id=913,
        toll_name="Manoharpur Toll Plaza",
        highway_type="NH-48",
        geo_lat=27.3012,
        geo_long=75.9545,
        readertme=ewb7_dt + timedelta(hours=1, minutes=30),
        veh=v7
    )
    f7_2 = FastagTransaction(
        toll_id=914,
        toll_name="Shahjahanpur Toll Plaza",
        highway_type="NH-48",
        geo_lat=27.9945,
        geo_long=76.4215,
        readertme=ewb7_dt + timedelta(hours=3, minutes=45),  # 52 km/h
        veh=v7
    )

    # -------------------------------------------------------------
    # VEHICLE 8: PB10RS9900 (LOW RISK - FULLY COMPLIANT)
    # -------------------------------------------------------------
    v8 = "PB10RS9900"
    ewb8_dt = now - timedelta(hours=20)
    ewb8_valid = ewb8_dt + timedelta(days=2)
    ewb8 = EwayBill(
        ewb_no=100000000009,
        ewb_dt=ewb8_dt,
        from_pin=160001,  # Chandigarh
        to_pin=110001,    # Delhi
        travel_distance=260,
        ewb_final_valid_dt=ewb8_valid,
        ewb_ass_amt=510000.00,
        cgst_amt=0.00,
        sgst_amt=0.00,
        igst_amt=91800.00,
        vehicle_number=v8
    )
    f8_1 = FastagTransaction(
        toll_id=915,
        toll_name="Gharaunda Toll Plaza",
        highway_type="NH-44",
        geo_lat=29.5412,
        geo_long=76.9745,
        readertme=ewb8_dt + timedelta(hours=2, minutes=30),
        veh=v8
    )
    f8_2 = FastagTransaction(
        toll_id=916,
        toll_name="Murthal Toll Plaza",
        highway_type="NH-44",
        geo_lat=29.0212,
        geo_long=77.0845,
        readertme=ewb8_dt + timedelta(hours=4, minutes=15),  # 56 km/h
        veh=v8
    )

    all_ewbs = [ewb1, ewb2_1, ewb2_2, ewb3, ewb4, ewb5, ewb6, ewb7, ewb8]
    all_fastags = [f1_1, f1_2, f1_3, f2_1, f2_2, f3_1, f3_2, f5_1, f5_2, f6_1, f6_2, f6_3, f7_1, f7_2, f8_1, f8_2]

    # Insert EWBs (skip existing by ewb_no)
    print("\n[2/4] Inserting E-Way Bills...")
    for ewb in all_ewbs:
        existing = db.query(EwayBill).filter(EwayBill.ewb_no == ewb.ewb_no).first()
        if not existing:
            db.add(ewb)
    db.commit()
    print(f"  -> {len(all_ewbs)} E-Way Bills populated.")

    # Insert FASTags
    print("\n[3/4] Inserting FASTag Telemetry Transactions...")
    for ft in all_fastags:
        db.add(ft)
    db.commit()
    print(f"  -> {len(all_fastags)} FASTag transactions populated.")

    # 3. Trigger Full Risk Analytics & ML Pipeline on all vehicles
    print("\n[4/4] Executing Batch Risk Analytics Pipeline...")
    vehicles = [v1, v2, v3, v4, v5, v6, v7, v8]
    import asyncio

    async def run_pipeline():
        for veh in vehicles:
            print(f"  * Analyzing {veh} through detection pipeline...")
            res = await AnalysisService.analyze_vehicle(db, veh)
            print(f"    -> Score: {res.get('risk_score')}/130 | Level: {res.get('risk_level')} | Priority: {res.get('decision', {}).get('investigation_priority')}")

    asyncio.run(run_pipeline())
    print("\nPipeline execution completed successfully!")

    # Verify counts
    total_ewb = db.query(EwayBill).count()
    total_ft = db.query(FastagTransaction).count()
    print(f"\nFinal DB State: {total_ewb} E-Way Bills, {total_ft} FASTag records.")
    db.close()


if __name__ == "__main__":
    seed_database()
