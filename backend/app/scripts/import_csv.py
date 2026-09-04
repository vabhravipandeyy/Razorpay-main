from pathlib import Path
import math

import pandas as pd
from sqlalchemy.dialects.mysql import insert as mysql_insert

from app.core.database import SessionLocal
from app.models.eway_bill import EwayBill
from app.models.fastag_transaction import FastagTransaction


# =====================================================
# PATHS
# =====================================================

BASE_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = BASE_DIR / "data"

EWAY_FILE = DATA_DIR / "data_suspicious.csv"
FASTAG_FILE = DATA_DIR / "fasttag_data_intern.csv"

CHUNK_SIZE = 50000


# =====================================================
# HELPERS
# =====================================================

def parse_dates(series):
    return pd.to_datetime(
        series,
        format="mixed",
        errors="coerce"
    )


def clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Remove unwanted columns and clean data."""

    # Remove Unnamed columns
    df = df.loc[:, ~df.columns.str.contains("^Unnamed")]

    # Remove blank column
    if "" in df.columns:
        df = df.drop(columns=[""])

    df.columns = df.columns.str.strip()

    return df


def dataframe_to_records(df: pd.DataFrame):
    """
    Convert DataFrame to list of dictionaries.
    Replace NaN/NaT with None.
    """

    records = []

    for row in df.to_dict("records"):

        cleaned = {}

        for key, value in row.items():

            if pd.isna(value):
                cleaned[key] = None

            elif isinstance(value, float) and math.isnan(value):
                cleaned[key] = None

            else:
                cleaned[key] = value

        records.append(cleaned)

    return records


# =====================================================
# IMPORT EWAY
# =====================================================

def import_eway():

    print("\n==============================")
    print("Importing E-Way Bills")
    print("==============================")

    session = SessionLocal()

    try:

        df = pd.read_csv(EWAY_FILE)

        df = clean_dataframe(df)

        # Dates
        df["ewb_dt"] = parse_dates(df["ewb_dt"])
        df["ewb_final_valid_dt"] = parse_dates(
            df["ewb_final_valid_dt"]
        )

        # Numeric columns
        numeric_cols = [
            "ewb_no",
            "from_pin",
            "to_pin",
            "travel_distance",
            "ewb_ass_amt",
            "cgst_amt",
            "sgst_amt",
            "igst_amt",
        ]

        for col in numeric_cols:
            df[col] = pd.to_numeric(df[col], errors="coerce")

        # Remove missing primary key
        df = df.dropna(subset=["ewb_no"])

        print(f"Rows before cleaning : {len(df):,}")

        duplicates = df.duplicated(
            subset=["ewb_no"],
            keep="first"
        ).sum()

        print(f"Duplicate EWB Numbers : {duplicates:,}")

        if duplicates > 0:
            df = df.drop_duplicates(
                subset=["ewb_no"],
                keep="first"
            )

        print(f"Rows after cleaning : {len(df):,}")

        records = dataframe_to_records(df)

        stmt = mysql_insert(EwayBill).prefix_with("IGNORE")

        session.execute(stmt, records)

        session.commit()

        print(f"✅ Imported {len(records):,} E-Way Bills")

    except Exception as e:

        session.rollback()

        print("\nEWB Import Failed\n")
        print(e)

    finally:

        session.close()


# =====================================================
# IMPORT FASTAG
# =====================================================

def import_fastag():

    print("\n==============================")
    print("Importing FASTag")
    print("==============================")

    session = SessionLocal()

    total = 0

    try:

        for chunk in pd.read_csv(
            FASTAG_FILE,
            chunksize=CHUNK_SIZE
        ):

            chunk = clean_dataframe(chunk)

            chunk["updated_at_npci"] = parse_dates(
                chunk["updated_at_npci"]
            )

            chunk["readertme"] = parse_dates(
                chunk["readertme"]
            )

            numeric_cols = [
                "toll_id",
                "geo_lat",
                "geo_long",
                "toll",
            ]

            for col in numeric_cols:
                chunk[col] = pd.to_numeric(
                    chunk[col],
                    errors="coerce"
                )

            records = dataframe_to_records(chunk)

            stmt = mysql_insert(
                FastagTransaction
            ).prefix_with("IGNORE")

            session.execute(stmt, records)

            session.commit()

            total += len(records)

            print(
                f"\rImported {total:,} FASTag rows",
                end=""
            )

        print()
        print(f"✅ Imported {total:,} FASTag Records")

    except Exception as e:

        session.rollback()

        print("\nFASTag Import Failed\n")
        print(e)

    finally:

        session.close()


# =====================================================
# MAIN
# =====================================================

if __name__ == "__main__":

    import_eway()

    import_fastag()

    print("\n🎉 Import Completed Successfully")