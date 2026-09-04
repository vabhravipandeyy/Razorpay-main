# GST Suspicious Vehicle Detection System — Full Project Documentation

> A full-stack web application that cross-references **E-Way Bill** and **FASTag** data to automatically detect potentially fraudulent or suspicious vehicle movements in the Indian GST logistics ecosystem.

---

## Table of Contents

1. [What Is This Project?](#1-what-is-this-project)
2. [How It Works — The Big Picture](#2-how-it-works--the-big-picture)
3. [Tech Stack](#3-tech-stack)
4. [Project Structure](#4-project-structure)
5. [Database Design](#5-database-design)
6. [Backend — Deep Dive](#6-backend--deep-dive)
   - [Entry Point](#61-entry-point)
   - [Configuration & Environment](#62-configuration--environment)
   - [Authentication System](#63-authentication-system)
   - [Core Analysis Engine](#64-core-analysis-engine--business-rules)
   - [Location Service](#65-location-service)
   - [API Endpoints](#66-api-endpoints)
   - [Repositories](#67-repositories)
7. [Frontend — Deep Dive](#7-frontend--deep-dive)
   - [Routing & Auth Guard](#71-routing--auth-guard)
   - [Pages](#72-pages)
   - [Components](#73-components)
   - [API Layer](#74-api-layer)
8. [Risk Scoring System](#8-risk-scoring-system)
9. [Setup & Running Locally](#9-setup--running-locally)
10. [Environment Variables Reference](#10-environment-variables-reference)
11. [Common Change Scenarios](#11-common-change-scenarios)
12. [Known Quirks & Gotchas](#12-known-quirks--gotchas)

---

## 1. What Is This Project?

In India, when goods are transported by road above ₹50,000 in value, an **E-Way Bill (EWB)** must be generated under the GST system. Simultaneously, vehicles on national highways create **FASTag** (RFID toll) records at every toll plaza.

This system is a **GST enforcement analytics tool** that:
- Ingests raw E-Way Bill and FASTag transaction data loaded into a MySQL database
- Cross-references the two datasets to flag discrepancies
- Applies 6 automated fraud-detection rules (e.g. impossible vehicle speed, mismatched routes, overlapping bills)
- Displays results on a dashboard for tax inspectors / enforcement officers

**Target users:** GST department inspectors, tax auditors, enforcement officers.

---

## 2. How It Works — The Big Picture

```
MySQL Database
┌─────────────────┐    ┌────────────────────┐
│   eway_bills    │    │ fastag_transactions │
│  (trips/goods)  │    │  (toll plaza data)  │
└────────┬────────┘    └──────────┬─────────┘
         │                        │
         └──────────┬─────────────┘
                    ▼
         ┌─────────────────────┐
         │  AnalysisService    │  ← Core engine (Python)
         │  (6 Business Rules) │
         └──────────┬──────────┘
                    │  fetches GPS coords from
                    ▼
         ┌─────────────────────┐
         │   LocationService   │  ← data.gov.in Pincode API
         │  (Pincode → LatLon) │    + local DB cache
         └──────────┬──────────┘
                    ▼
         ┌─────────────────────┐
         │ vehicle_analysis_   │  ← Persisted result
         │     records         │
         └──────────┬──────────┘
                    ▼
         ┌─────────────────────┐
         │   FastAPI REST API  │  ← Port 8000
         └──────────┬──────────┘
                    ▼
         ┌─────────────────────┐
         │   React Frontend    │  ← Port 5173 (Vite)
         │  (Dashboard, Map,   │
         │   Suspicious List)  │
         └─────────────────────┘
```

**Data flow for a single vehicle lookup:**
1. Inspector enters a vehicle number in the UI
2. Frontend calls `GET /analysis/{vehicle_number}`
3. Backend fetches all E-Way Bills and FASTag records for that vehicle
4. For each EWB, pincodes are resolved to lat/lon (DB cache first, then govt API)
5. Six rules are evaluated → a risk score is computed
6. Result is saved to `vehicle_analysis_records` table (upsert)
7. Full JSON response is returned to the frontend
8. Dashboard renders: risk card, rule table, trip table, interactive map, timeline

---

## 3. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Backend Framework** | FastAPI | 0.139.0 |
| **ASGI Server** | Uvicorn | 0.51.0 |
| **ORM** | SQLAlchemy | 2.0.51 |
| **Database** | MySQL 8+ | — |
| **DB Driver** | PyMySQL | 1.2.0 |
| **Auth** | JWT (PyJWT) | 2.13.0 |
| **Password Hashing** | passlib / bcrypt (via cryptography) | — |
| **HTTP Client** | requests | 2.34.2 |
| **Data Science** | pandas, numpy | 3.0.3 / 2.5.1 |
| **Frontend Framework** | React 19 | — |
| **Build Tool** | Vite 8 | — |
| **Routing** | React Router DOM v7 | — |
| **HTTP Client (FE)** | Axios | 1.18.1 |
| **Styling** | TailwindCSS v4 | — |
| **Icons** | Lucide React | 1.23.0 |
| **Maps** | React Leaflet + Leaflet | 5.0.0 / 1.9.4 |
| **Charts** | Chart.js + react-chartjs-2 | 4.5.1 / 5.3.1 |
| **External API** | data.gov.in Pincode API | — |

---

## 4. Project Structure

```
gst_proj/
├── backend/
│   ├── .env                          # Environment variables (DB creds, API keys)
│   ├── requirements.txt              # Python dependencies
│   ├── venv/                         # Python virtual environment
│   ├── data/
│   │   ├── create.sql                # SQL schema to create all tables
│   │   └── Analysis.ipynb            # Jupyter notebook for data exploration
│   └── app/
│       ├── main.py                   # FastAPI app, CORS, startup seeding
│       ├── core/
│       │   ├── base.py               # SQLAlchemy declarative Base
│       │   ├── config.py             # Settings class (reads .env)
│       │   ├── database.py           # Engine + SessionLocal + get_db()
│       │   └── security.py           # JWT + bcrypt helpers
│       ├── models/
│       │   ├── __init__.py           # Re-exports all models
│       │   ├── eway_bill.py          # EwayBill ORM model
│       │   ├── fastag_transaction.py # FastagTransaction ORM model
│       │   ├── pincode_location.py   # PincodeLocation ORM model (cache)
│       │   ├── user.py               # User ORM model
│       │   └── vehicle_analysis.py   # VehicleAnalysisRecord ORM model
│       ├── schemas/
│       │   └── auth.py               # Pydantic schemas for auth endpoints
│       ├── repositories/
│       │   ├── eway_bill_repository.py
│       │   ├── fastag_repository.py
│       │   ├── pincode_repository.py
│       │   ├── user_repository.py
│       │   └── vehicle_analysis_repository.py
│       ├── services/
│       │   ├── analysis_service.py   # THE MAIN BRAIN — all 6 rules live here
│       │   ├── auth_service.py       # Register, login, seed admin
│       │   └── location_service.py   # Pincode → coordinates resolver
│       └── api/
│           └── routes/
│               ├── analysis.py       # /analysis/* endpoints
│               └── auth.py           # /api/auth/* endpoints
│
└── frontend/
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── main.jsx                  # React entry point
        ├── App.jsx                   # Router + Auth guards
        ├── App.css / index.css       # Global styles
        ├── context/
        │   └── AuthContext.jsx       # Global auth state (token, user, login/logout)
        ├── api/
        │   ├── axios.js              # Axios instance with base URL + auth header
        │   ├── analysis.js           # Analysis API calls
        │   └── auth.js               # Auth API calls (login, register, me)
        ├── pages/
        │   ├── Login.jsx             # Login/Register page
        │   ├── Dashboard.jsx         # Vehicle search + full analysis view
        │   └── SuspiciousVehicles.jsx # Paginated list of all flagged vehicles
        └── components/
            ├── Navbar.jsx            # Top navigation bar
            ├── Footer.jsx            # Footer
            ├── SearchBox.jsx         # Vehicle number search input
            ├── RiskCard.jsx          # Overall risk score display
            ├── StatsCard.jsx         # Counts (EWBs, FASTags, rules failed)
            ├── RuleTable.jsx         # Table of all 6 rule results
            ├── TripTable.jsx         # Table of enriched trip data
            ├── VehicleMap.jsx        # Interactive Leaflet map with routes + tolls
            ├── Timeline.jsx          # Chronological toll crossing timeline
            ├── Loading.jsx           # Spinner component
            └── EmptyState.jsx        # Placeholder when no search done
```

---

## 5. Database Design

### `eway_bills` — Core GST movement records

| Column | Type | Description |
|--------|------|-------------|
| `ewb_no` | BIGINT PK | Unique E-Way Bill number |
| `ewb_dt` | DATETIME | Bill generation date/time |
| `from_pin` | INT | Origin pincode |
| `to_pin` | INT | Destination pincode |
| `travel_distance` | INT | Declared travel distance (km) |
| `ewb_final_valid_dt` | DATETIME | Bill expiry date/time |
| `ewb_ass_amt` | DECIMAL(15,2) | Assessed/invoice amount (₹) |
| `cgst_amt` | DECIMAL(15,2) | CGST tax amount |
| `sgst_amt` | DECIMAL(15,2) | SGST tax amount |
| `igst_amt` | DECIMAL(15,2) | IGST tax amount |
| `vehicle_number` | VARCHAR(20) | Vehicle registration number (indexed) |

### `fastag_transactions` — Toll plaza crossing records

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT PK AUTO | Internal ID |
| `toll_id` | BIGINT | Toll plaza ID |
| `toll_name` | VARCHAR(255) | Toll plaza name |
| `highway_type` | VARCHAR(20) | Highway category |
| `geo_lat` | DECIMAL(10,6) | Toll GPS latitude |
| `geo_long` | DECIMAL(10,6) | Toll GPS longitude |
| `updated_at_npci` | DATETIME | NPCI update timestamp |
| `status` | CHAR(1) | Transaction status |
| `toll` | BIGINT | Toll amount charged |
| `readertme` | DATETIME | Exact time vehicle crossed (note: column typo is intentional — match source data) |
| `veh` | VARCHAR(20) | Vehicle number (indexed) |

### `pincode_locations` — Coordinates cache

| Column | Type | Description |
|--------|------|-------------|
| `pin_code` | BIGINT PK | 6-digit Indian pincode |
| `latitude` | DOUBLE | GPS latitude |
| `longitude` | DOUBLE | GPS longitude |
| `office_name` | VARCHAR(255) | Post office name |
| `district` | VARCHAR(150) | District |
| `state` | VARCHAR(150) | State |
| `region` | VARCHAR(150) | Postal region |
| `circle` | VARCHAR(150) | Postal circle |
| `fetched_at` | TIMESTAMP | When it was fetched/cached |

### `vehicle_analysis_records` — Pre-computed results cache

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT PK AUTO | Record ID |
| `vehicle_number` | VARCHAR(50) UNIQUE | Vehicle number |
| `risk_score` | INT | Computed score 0–130 |
| `risk_level` | VARCHAR(20) | HIGH / MEDIUM / LOW |
| `eway_bill_count` | INT | Number of EWBs found |
| `fastag_count` | INT | Number of FASTag txns found |
| `failed_rules_count` | INT | How many rules this vehicle failed |
| `summary_reasons` | TEXT | Comma-joined list of failed rule names |
| `analysis_data` | LONGTEXT | Full JSON blob of the analysis result |
| `analyzed_at` | DATETIME | First analysis timestamp |
| `updated_at` | DATETIME | Last re-analysis timestamp |

### `users` — Authentication

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT PK | User ID |
| `username` | VARCHAR UNIQUE | Login username |
| `email` | VARCHAR UNIQUE | Email address |
| `hashed_password` | VARCHAR | Bcrypt hash |
| `full_name` | VARCHAR | Display name |
| `role` | VARCHAR | `admin` or `inspector` |
| `is_active` | BOOL | Account status |

---

## 6. Backend — Deep Dive

### 6.1 Entry Point

[`backend/app/main.py`](file:///Users/shreyashgautam/Downloads/gst_proj/backend/app/main.py)

- Creates the FastAPI app titled **"Suspicious Vehicle Detection API"**
- Configures CORS to allow the React dev server (`localhost:5173`)
- On startup: creates all SQL tables (SQLAlchemy `create_all`), then seeds a default admin user if no users exist
- Registers two routers:
  - `analysis_router` → prefix `/analysis`
  - `auth_router` → prefix `/api/auth`

### 6.2 Configuration & Environment

[`backend/app/core/config.py`](file:///Users/shreyashgautam/Downloads/gst_proj/backend/app/core/config.py)

All config is read from `backend/.env`:

```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=root
DB_NAME=gst_project
DATA_GOV_API_KEY=<your-key>
SECRET_KEY=<jwt-secret>
```

[`backend/app/core/security.py`](file:///Users/shreyashgautam/Downloads/gst_proj/backend/app/core/security.py) — JWT + bcrypt utilities:
- `hash_password(plain)` → bcrypt hash
- `verify_password(plain, hashed)` → bool
- `create_access_token(data)` → JWT string (7-day expiry)
- `decode_access_token(token)` → payload dict or None

### 6.3 Authentication System

**Backend:**
- [`auth_service.py`](file:///Users/shreyashgautam/Downloads/gst_proj/backend/app/services/auth_service.py) — business logic for register, login, seed
- [`auth.py` routes](file:///Users/shreyashgautam/Downloads/gst_proj/backend/app/api/routes/auth.py) — REST endpoints
- Default admin user: `admin` / `admin123` (auto-seeded on first startup)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/register` | POST | Create new user account |
| `/api/auth/login` | POST | Login, returns JWT token |
| `/api/auth/me` | GET | Get current user (requires Bearer token) |
| `/api/auth/seed` | POST | Manually seed admin user |

**Frontend:**
- [`AuthContext.jsx`](file:///Users/shreyashgautam/Downloads/gst_proj/frontend/src/context/AuthContext.jsx) — React context holding `user`, `token`, `login()`, `logout()`
- Token stored in `localStorage` (`"token"` key), user info stored as `"user"` JSON
- On app load, verifies token validity by calling `/api/auth/me`
- `ProtectedRoute` → redirects to `/login` if not authenticated
- `PublicRoute` → redirects to `/` if already authenticated

### 6.4 Core Analysis Engine — Business Rules

[`backend/app/services/analysis_service.py`](file:///Users/shreyashgautam/Downloads/gst_proj/backend/app/services/analysis_service.py)

This is the most important file. It contains all fraud detection logic.

#### Key Constants / Thresholds

| Constant | Value | Meaning |
|----------|-------|---------|
| `MIN_TRIP_DISTANCE` | 200 km | Minimum for a "significant" trip |
| `MIN_ORIGIN_DISTANCE` | 500 km | Minimum origin-to-destination distance |
| `MIN_INVOICE_VALUE` | ₹50,000 | Minimum suspicious invoice |
| `MIN_OVERLAP_PERCENT` | 60% | Overlap needed to flag duplicate EWBs |
| `MAX_AVERAGE_SPEED` | 100 km/h | Max normal average trip speed |
| `MIN_MOVEMENT_DISTANCE` | 10 km | Threshold for "barely moved" |
| `MAX_IDLE_HOURS` | 8 h | Too long idle at almost same location |
| `MIN_TIME_GAP_MINUTES` | 5 min | Minimum time for a 100+ km jump |
| `MAX_SPEED_KMPH` | 130 km/h | Max instantaneous speed between tolls |

#### Rule 1 — No FASTag Data (+25 points)
A vehicle with an E-Way Bill but **zero FASTag records** is suspicious — it means the vehicle either never passed a toll or used cash (evading electronic tracking).

#### Rule 2 — Duplicate / Overlapping E-Way Bills (+10 points)
If two EWBs for the same vehicle have validity windows overlapping by ≥ 60%, this is flagged as **duplicate billing**. Fraudsters sometimes generate duplicate EWBs to move the same goods multiple times.

#### Rule 3 — FASTag Outside EWB Validity (+20 points)
If the vehicle was scanned at a toll plaza **outside any of its EWB validity windows**, the vehicle was physically on the road without a valid bill — goods being transported illegally.

#### Rule 4 — Impossible Average Speed (+30 points)
Between two consecutive toll scans, if the computed speed exceeds 130 km/h, it's physically impossible for a loaded truck. This may indicate **falsified FASTag records** (e.g., cloned tags, replay attacks).

#### Rule 5 — Route Mismatch (Bearing Angle) (+25 points)
Compares the **declared direction** (origin pincode → destination pincode bearing) with the **actual direction** (first toll → last toll bearing). If the angular difference is between 30–35°, it's flagged as a suspicious diversion.

#### Rule 6 — Suspicious Time Gap (+20 points)
Two sub-checks:
- Vehicle **barely moved** (< 10 km) but was idle for **> 8 hours** between toll scans — suggests hiding or detour
- Vehicle **jumped > 100 km** in **< 5 minutes** — physically impossible, suggests data manipulation

#### Risk Level Bands

| Score | Level |
|-------|-------|
| 0 – 29 | LOW (green) |
| 30 – 59 | MEDIUM (yellow) |
| 60+ | HIGH (red) |

#### Batch Sync
`AnalysisService.batch_sync_vehicles()` processes up to N vehicles concurrently using a `ThreadPoolExecutor`. Each thread runs its own async event loop + dedicated DB session. This is triggered via `POST /analysis/records/sync`.

### 6.5 Location Service

[`backend/app/services/location_service.py`](file:///Users/shreyashgautam/Downloads/gst_proj/backend/app/services/location_service.py)

Converts Indian pincodes to GPS coordinates. Three-tier resolution:

1. **DB Cache** — Checks `pincode_locations` table first (fastest)
2. **Government API** — Calls `data.gov.in` Pincode API (tries exact pin, pin+1, pin-1 for robustness). Caches result in DB.
3. **Regional Fallback** — If API fails, uses a hardcoded map of ~80 major Indian cities by PIN prefix (first 2 digits). Stored as `"XYZ (Estimated)"` to indicate it's approximate.

A `_negative_cache` (in-memory set) prevents hammering the external API repeatedly for the same failed PIN within a server session.

### 6.6 API Endpoints

All endpoints under `/analysis/`:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/analysis/{vehicle_number}` | GET | **Live analysis** — compute fresh result, save to DB, return |
| `/analysis/records` | GET | **Paginated list** of pre-computed records. Supports `?search=`, `?risk_level=HIGH/MEDIUM/LOW`, `?limit=`, `?offset=` |
| `/analysis/records/stats` | GET | Summary stats: total, high/medium/low counts, avg score |
| `/analysis/records/sync` | POST | **Batch sync** — compute & save analysis for unprocessed vehicles. Params: `?limit=`, `?sync_all=true`, `?max_workers=` |
| `/analysis/records/detail/{vehicle_number}` | GET | Return stored JSON (or compute live if not stored) |

> **Note on route ordering:** FastAPI matches routes in order. `/records/stats`, `/records/sync`, and `/records/detail/{vehicle_number}` are defined **before** `/{vehicle_number}` to avoid `records` being captured as a vehicle number.

### 6.7 Repositories

Each repository wraps SQLAlchemy queries for its model:

| Repository | Key Methods |
|-----------|-------------|
| [`EwayBillRepository`](file:///Users/shreyashgautam/Downloads/gst_proj/backend/app/repositories/eway_bill_repository.py) | `get_by_vehicle(db, vehicle_number)` |
| [`FastagRepository`](file:///Users/shreyashgautam/Downloads/gst_proj/backend/app/repositories/fastag_repository.py) | `get_by_vehicle(db, veh)`, `get_between(db, vehicle_number, start_time, end_time)` |
| [`PincodeRepository`](file:///Users/shreyashgautam/Downloads/gst_proj/backend/app/repositories/pincode_repository.py) | `get(db, pin_code)`, `save(db, pin_code, lat, lon, ...)` |
| [`UserRepository`](file:///Users/shreyashgautam/Downloads/gst_proj/backend/app/repositories/user_repository.py) | `get_by_username`, `get_by_email`, `create`, `count` |
| [`VehicleAnalysisRepository`](file:///Users/shreyashgautam/Downloads/gst_proj/backend/app/repositories/vehicle_analysis_repository.py) | `save_or_update`, `get_records`, `get_count`, `get_by_vehicle`, `get_stats` |

---

## 7. Frontend — Deep Dive

### 7.1 Routing & Auth Guard

[`frontend/src/App.jsx`](file:///Users/shreyashgautam/Downloads/gst_proj/frontend/src/App.jsx)

Three routes:
- `/login` — wrapped in `PublicRoute` (redirects away if already logged in)
- `/` — `Dashboard`, protected
- `/suspicious` — `SuspiciousVehicles`, protected

### 7.2 Pages

#### `Login.jsx`
Two-tab UI: **Login** and **Register**. Uses `useAuth()` context to call `login()` / `register()`. On success, React Router navigates to `/`.

#### `Dashboard.jsx`
The main vehicle investigation page:
- URL param `?vehicle=XXXX` auto-triggers a search on load
- Calls `GET /analysis/{vehicle_number}` on search
- Renders 6 components: `RiskCard`, `StatsCard`, `RuleTable`, `TripTable`, `VehicleMap`, `Timeline`

#### `SuspiciousVehicles.jsx`
A database explorer for pre-analyzed vehicles:
- Fetches paginated records from `GET /analysis/records`
- Fetches stats from `GET /analysis/records/stats`
- Supports search by vehicle number, filter by risk level (HIGH/MEDIUM/LOW)
- Has a **Sync** button that calls `POST /analysis/records/sync` to batch-process new vehicles
- Clicking a vehicle navigates to `/?vehicle=XXXX` (Dashboard with auto-search)
- Full client-side pagination (12 per page)

### 7.3 Components

| Component | Purpose |
|-----------|---------|
| `Navbar.jsx` | Top bar with app title, navigation links, user info, logout |
| `SearchBox.jsx` | Vehicle number input with validation and submit |
| `RiskCard.jsx` | Large risk score display with color-coded HIGH/MEDIUM/LOW badge |
| `StatsCard.jsx` | Shows E-Way Bill count, FASTag count, failed rules count |
| `RuleTable.jsx` | Table showing all 6 rules, pass/fail status, score contribution, details |
| `TripTable.jsx` | Table of each EWB trip: from/to pin, distance, direction, invoice amount, toll count |
| `VehicleMap.jsx` | Interactive Leaflet map: route polylines, origin/dest markers, toll markers |
| `Timeline.jsx` | Chronological list of all FASTag crossings with time, toll name, status |
| `Loading.jsx` | Spinning loading indicator |
| `EmptyState.jsx` | Friendly placeholder shown before any search |
| `Footer.jsx` | Simple footer |

### 7.4 API Layer

[`frontend/src/api/axios.js`](file:///Users/shreyashgautam/Downloads/gst_proj/frontend/src/api/axios.js) — Axios instance:
- Base URL: `http://localhost:8000`
- Request interceptor: automatically attaches `Authorization: Bearer <token>` from `localStorage`

[`frontend/src/api/analysis.js`](file:///Users/shreyashgautam/Downloads/gst_proj/frontend/src/api/analysis.js):
- `analyzeVehicle(vehicleNumber)` → `GET /analysis/{vehicle_number}`
- `getSuspiciousRecords({search, risk_level, limit, offset})` → `GET /analysis/records`
- `getAnalysisStats()` → `GET /analysis/records/stats`
- `syncVehicleRecords(limit)` → `POST /analysis/records/sync`
- `getRecordDetail(vehicleNumber)` → `GET /analysis/records/detail/{vehicle_number}`

[`frontend/src/api/auth.js`](file:///Users/shreyashgautam/Downloads/gst_proj/frontend/src/api/auth.js):
- `loginApi({username, password})` → `POST /api/auth/login`
- `registerApi(userData)` → `POST /api/auth/register`
- `getMeApi()` → `GET /api/auth/me`

---

## 8. Risk Scoring System

```
Max possible score: 25 + 10 + 20 + 30 + 25 + 20 = 130 points

Rule 1 (No FASTag Data):          +25 pts
Rule 2 (Duplicate EWB):           +10 pts
Rule 3 (FASTag Outside Validity): +20 pts
Rule 4 (Impossible Speed):        +30 pts  ← highest weight
Rule 5 (Route Mismatch):          +25 pts
Rule 6 (Suspicious Time Gap):     +20 pts

Thresholds:
  0 – 29  → LOW    (green)
  30 – 59 → MEDIUM (yellow)
  60+     → HIGH   (red)
```

---

## 9. Setup & Running Locally

### Prerequisites
- Python 3.10+
- Node.js 18+
- MySQL 8+

### Step 1: Database Setup

```sql
-- Run backend/data/create.sql
CREATE DATABASE gst_project;
USE gst_project;
-- (run the CREATE TABLE statements from create.sql)
```

Then import your raw EWB and FASTag CSV data into `eway_bills` and `fastag_transactions`.

### Step 2: Backend Setup

```bash
cd gst_proj/backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Edit .env with your DB credentials and API key
# (see Section 10 below)

# Start the server
uvicorn app.main:app --reload --port 8000
```

API docs available at: http://localhost:8000/docs

### Step 3: Frontend Setup

```bash
cd gst_proj/frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

App available at: http://localhost:5173

### Step 4: Sync Analysis Records

After starting both servers, go to the **Suspicious Vehicles** page and click the **Sync** button, or call:

```
POST http://localhost:8000/analysis/records/sync?limit=100&max_workers=25
```

This runs analysis on all vehicles in the DB and populates the `vehicle_analysis_records` table.

---

## 10. Environment Variables Reference

File: [`backend/.env`](file:///Users/shreyashgautam/Downloads/gst_proj/backend/.env)

| Variable | Example | Purpose |
|----------|---------|---------|
| `DB_HOST` | `localhost` | MySQL host |
| `DB_PORT` | `3306` | MySQL port |
| `DB_USER` | `root` | MySQL username |
| `DB_PASSWORD` | `root` | MySQL password |
| `DB_NAME` | `gst_project` | Database name |
| `DATA_GOV_API_KEY` | `579b464d...` | API key for data.gov.in pincode API |
| `SECRET_KEY` | (any long random string) | JWT signing secret |

> **Important:** The `DATA_GOV_API_KEY` is required for resolving pincodes to GPS coordinates. Get one free at [data.gov.in](https://data.gov.in/). Without it, the system falls back to approximate regional coordinates.

---

## 11. Common Change Scenarios

### ➕ Adding a New Fraud Detection Rule

1. Open [`backend/app/services/analysis_service.py`](file:///Users/shreyashgautam/Downloads/gst_proj/backend/app/services/analysis_service.py)
2. Add your constant thresholds to the class-level constants at the top
3. Add a new rule block after Rule 6, following the same pattern:
   ```python
   # ===================================================
   # Rule 7: Your New Rule
   # ===================================================
   if <condition>:
       analysis["risk_score"] += <points>
       analysis["rules"].append({
           "rule": "Your Rule Name",
           "passed": False,
           "score": <points>,
           "reason": "...",
           "details": [...]  # optional
       })
   else:
       analysis["rules"].append({
           "rule": "Your Rule Name",
           "passed": True,
           "score": 0,
           "reason": "..."
       })
   ```
4. Update the `RuleTable.jsx` component if you want to show special details for the new rule
5. Re-run batch sync to update all cached records

### 🔧 Changing Risk Level Thresholds

Edit the scoring thresholds at the bottom of `analyze_vehicle()` in `analysis_service.py`:
```python
if analysis["risk_score"] >= 60:   # ← change this
    analysis["risk_level"] = "HIGH"
elif analysis["risk_score"] >= 30: # ← and this
    analysis["risk_level"] = "MEDIUM"
```

### 🗄️ Changing the Database

Edit `backend/.env` with new credentials. The SQLAlchemy models will auto-create tables on startup if they don't exist.

### 🌐 Changing the Backend URL (for deployment)

Edit [`frontend/src/api/axios.js`](file:///Users/shreyashgautam/Downloads/gst_proj/frontend/src/api/axios.js) — change the `baseURL` from `http://localhost:8000` to your server's URL.

Also update CORS in [`backend/app/main.py`](file:///Users/shreyashgautam/Downloads/gst_proj/backend/app/main.py) — add your frontend's domain to `allow_origins`.

### 👤 Adding a New User Role

1. Add role logic in [`auth_service.py`](file:///Users/shreyashgautam/Downloads/gst_proj/backend/app/services/auth_service.py)
2. Use `user.role` in route handlers for authorization (currently role is stored in JWT but not enforced on routes)

### 📦 Adding a New Page (Frontend)

1. Create `frontend/src/pages/YourPage.jsx`
2. Add route in [`App.jsx`](file:///Users/shreyashgautam/Downloads/gst_proj/frontend/src/App.jsx) — wrap with `ProtectedRoute` if it needs login
3. Add a link to `Navbar.jsx`

---

## 12. Known Quirks & Gotchas

| Issue | Notes |
|-------|-------|
| **`readertme` column typo** | The FASTag table has `readertme` (missing 'i'). This is intentional — it matches the raw source data CSV format. Don't rename it. |
| **Async + ThreadPoolExecutor** | Batch sync spawns threads that each create their own event loop (`asyncio.new_event_loop()`). This is needed because `AnalysisService.analyze_vehicle` is `async` but `ThreadPoolExecutor` is synchronous. |
| **Pincode fallbacks are approximate** | When the data.gov.in API fails, coordinates are approximate city-level coords for the PIN prefix. Analysis results may show slightly off map positions for rare pincodes. |
| **Rule 5 (Route Mismatch) narrow band** | The bearing check only flags differences of 30–35°. This narrow band was intentional to reduce false positives. Adjust `is_bearing_suspicious` lambda to widen it. |
| **Token storage** | JWT is stored in `localStorage` — fine for a controlled internal tool, but consider `httpOnly` cookies if this goes public. |
| **No auth on analysis routes** | The `/analysis/*` endpoints currently do **not** require authentication. Only the frontend enforces auth via `ProtectedRoute`. Add `Depends(get_current_user)` to route handlers to protect them server-side. |
| **`vehicle_analysis_records` is MySQL-only** | Uses `LONGTEXT` via `Text().with_variant(LONGTEXT, "mysql")`. If you switch to PostgreSQL, change to `Text` or `JSON` column type. |
| **Batch sync skips already-analyzed vehicles** | By default `skip_existing=True`. To re-analyze all vehicles, call `POST /analysis/records/sync?sync_all=true` — but this will overwrite all existing records. |
