# Phase 0 Baseline Documentation

**Project Name:** GST Suspicious Vehicle Detection System  
**Milestone:** Phase 0 — Foundation, Codebase Audit, Stabilization, Security Baseline & Automated Testing  
**Status:** Completed & Validated  
**Baseline Date:** September 1, 2026  

---

## 1. Project Overview

The **GST Suspicious Vehicle Detection System** is an enforcement analytics platform designed for Indian GST tax authorities. It cross-references electronic transportation documentation (**E-Way Bills**) with electronic toll plaza crossing telemetry (**FASTag RFID records**) to automatically detect irregularities, tax evasion, duplicate billing, and suspicious logistics activities.

---

## 2. Current Architecture

```
                                    ┌───────────────────────┐
                                    │    React 19 Frontend  │
                                    │ (Vite, Leaflet, Axios)│
                                    └───────────┬───────────┘
                                                │
                                       Bearer JWT (HTTP)
                                                ▼
                                    ┌───────────────────────┐
                                    │   FastAPI REST API    │
                                    │  (Auth & Middleware)  │
                                    └───────────┬───────────┘
                                                │
                                                ▼
 ┌─────────────────────────┐        ┌───────────────────────┐        ┌─────────────────────────┐
 │   data.gov.in API       │ ◄────► │    AnalysisService    │ ◄────► │     MySQL Database      │
 │ (Pincode Geocoding)     │        │  (6 Business Rules)   │        │ (EWBs, FASTag, Records) │
 └─────────────────────────┘        └───────────────────────┘        └─────────────────────────┘
```

The system operates in a modular layered structure:
1. **Core Layer (`app.core`):** Database connection pooling, base model declarations, vehicle normalization utilities, configuration management, and structured logging.
2. **Models Layer (`app.models`):** Declarative SQLAlchemy 2.x ORM models.
3. **Repository Layer (`app.repositories`):** Encapsulated, query-optimized database operations with normalized vehicle lookup support.
4. **Service Layer (`app.services`):** Business logic, mathematical geodesy, fraud detection rule engines, geocoding resolution with negative caching, and batch synchronization.
5. **API Layer (`app.api.routes`):** Endpoint route handlers with server-side JWT authentication dependencies.

---

## 3. Tech Stack

| Layer | Component | Version | Purpose |
|---|---|---|---|
| **Backend** | Python | 3.12+ | Core programming language |
| | FastAPI | 0.139.0 | High-performance asynchronous REST API framework |
| | Uvicorn | 0.51.0 | ASGI production server |
| | SQLAlchemy | 2.0.51 | ORM and SQL toolkit |
| | PyMySQL | 1.2.0 | MySQL database driver |
| | Pydantic | 2.13.4 | Data validation and schema parsing |
| | PyJWT | 2.13.0 | JSON Web Token issuance and decoding |
| | Cryptography | 49.0.0 | Bcrypt password hashing |
| | Requests | 2.34.2 | HTTP client for external government geocoding |
| | Pytest & Pytest-Asyncio | 9.1.1 / 1.4.0 | Automated unit and integration testing |
| **Frontend** | React | 19.2.7 | User interface library |
| | Vite | 6.2.0 | Frontend build tool and dev server |
| | React Router DOM | 7.18.1 | Client-side routing |
| | Axios | 1.18.1 | HTTP client with automatic auth header interceptors |
| | TailwindCSS | 4.3.2 | Utility-first styling |
| | Leaflet / React-Leaflet | 1.9.4 / 5.0.0 | Interactive geographic maps |
| | Lucide React | 1.23.0 | UI icons |
| **Database** | MySQL | 8+ / 9+ | Relational data store |

---

## 4. Database Schema & Tables

1. **`eway_bills`**: Stores issued E-Way Bills (bill number, issuance timestamp, origin/destination postal PINs, declared distance, validity expiry timestamp, assessed invoice amounts, CGST/SGST/IGST breakdown, vehicle registration number).
2. **`fastag_transactions`**: Stores real-time toll plaza telemetry (toll ID, toll plaza name, highway category, latitude, longitude, NPCI update timestamp, status, fee, scan timestamp `readertme`, vehicle registration number `veh`).
3. **`pincode_locations`**: Local geocoding cache mapping 6-digit Indian PIN codes to GPS coordinates, office name, district, state, region, and postal circle.
4. **`vehicle_analysis_records`**: Cached analysis results (vehicle number, risk score 0–130, risk level, EWB count, FASTag count, failed rules count, summary reasons, serialized JSON analysis data payload, timestamp).
5. **`users`**: User identity accounts (username, email, bcrypt-hashed password, full name, role, active status, creation timestamp).

---

## 5. The 6 Business Rules (Fraud & Suspicion Engine)

| Rule | Name | Condition | Risk Score Weight |
|---|---|---|---|
| **Rule 1** | **No FASTag Data** | Vehicle has active E-Way Bills (`eway_bill_count > 0`) but zero recorded FASTag toll transactions (`fastag_count == 0`). | **+25 pts** |
| **Rule 2** | **Duplicate / Overlapping EWB** | Multiple E-Way Bills for the same vehicle have temporal validity periods overlapping by $\ge 60\%$. | **+10 pts** |
| **Rule 3** | **FASTag Outside EWB Validity** | Vehicle toll transactions occurred at timestamps outside all active E-Way Bill validity windows. | **+20 pts** |
| **Rule 4** | **Impossible Average Speed** | Calculated speed between consecutive toll plaza crossings exceeds $130\text{ km/h}$. | **+30 pts** |
| **Rule 5** | **Route Mismatch (Bearing Angle)** | Deviation between declared route bearing (origin PIN $\to$ destination PIN) and actual toll traversal bearing is between $30.0^\circ$ and $34.99^\circ$. | **+25 pts** |
| **Rule 6** | **Suspicious Time Gap** | (A) Movement $< 10\text{ km}$ with idle duration $> 8\text{ hours}$, OR (B) Movement $> 100\text{ km}$ in $< 5\text{ minutes}$. | **+20 pts** |

---

## 6. Scoring System & Risk Bands

- **Theoretical Maximum Score:** $25 + 10 + 20 + 30 + 25 + 20 = 130\text{ points}$
- **Risk Level Classifications:**
  - **`LOW` Risk:** $0 - 29\text{ points}$ (Green)
  - **`MEDIUM` Risk:** $30 - 59\text{ points}$ (Yellow/Orange)
  - **`HIGH` Risk:** $60+\text{ points}$ (Red)

---

## 7. API Endpoints

### Authentication Endpoints (`/api/auth`)
- `POST /api/auth/register` — Register a new officer account
- `POST /api/auth/login` — Authenticate and receive a JWT Bearer token
- `GET /api/auth/me` — Retrieve current authenticated user profile (`Bearer JWT` required)
- `POST /api/auth/seed` — Seed default system administrator if users table is empty

### Analysis Endpoints (`/analysis`) — *All require `Bearer JWT` authentication*
- `GET /analysis/{vehicle_number}` — Perform live vehicle analysis, auto-persist to cache, return detailed JSON
- `GET /analysis/records` — Fetch paginated suspicious vehicle records (`?search=`, `?risk_level=`, `?limit=`, `?offset=`)
- `GET /analysis/records/stats` — Retrieve summary statistics (total records, high/medium/low counts, average score)
- `POST /analysis/records/sync` — Trigger batch synchronization over unprocessed vehicles (`?limit=`, `?sync_all=`, `?max_workers=`)
- `GET /analysis/records/detail/{vehicle_number}` — Retrieve pre-computed JSON payload or fallback to live analysis

---

## 8. Authentication & Authorization Flow

```
1. Client POST /api/auth/login (username, password)
                     │
                     ▼
2. Server verifies bcrypt hash -> Issues JWT Token (HS256, 7-day validity)
                     │
                     ▼
3. Client stores token in localStorage -> Axios attaches `Authorization: Bearer <token>`
                     │
                     ▼
4. Client requests /analysis/{vehicle_number}
                     │
                     ▼
5. Server executes `get_current_user` dependency:
   ├── Token missing / invalid -> 401 Unauthorized
   └── Token valid -> Resolves active user, executes analysis
```

---

## 9. Data Flow

```
Search Input (e.g. "ka 01 ab 1234")
         │
         ▼
Vehicle Normalization ("KA01AB1234")
         │
         ▼
Fetch DB Records (EwayBillRepository & FastagRepository)
         │
         ▼
Resolve Pincode Locations (DB Cache -> data.gov.in API -> Regional Fallbacks)
         │
         ▼
Calculate Geodesic Distances, Bearings & Overlaps
         │
         ▼
Evaluate 6 Business Rules -> Calculate Risk Score (0-130) & Band (LOW/MED/HIGH)
         │
         ▼
Upsert vehicle_analysis_records in MySQL
         │
         ▼
Return Standardized JSON Payload -> Render Dashboard, Map, Tables & Timeline
```

---

## 10. Baseline Statistics

- **Test Suite Status:** 28 / 28 Automated Tests Passing (100% success rate)
- **Current Database Status:**
  - `eway_bills`: Clean schema initialized, indexed on `vehicle_number`
  - `fastag_transactions`: Clean schema initialized, indexed on `veh` and `readertme`
  - `pincode_locations`: Local geocoding cache initialized
  - `vehicle_analysis_records`: Pre-computed cache initialized
  - `users`: Administrator initialized

---

## 11. Bugs Discovered & Fixed During Phase 0

1. **Unprotected Analysis Endpoints:**
   - *Bug:* `/analysis/*` routes had no server-side auth dependencies, allowing unauthorized access.
   - *Fix:* Attached `Depends(get_current_user)` to all analysis route handlers.
2. **Hardcoded Admin Credentials:**
   - *Bug:* `admin` / `admin123` was hardcoded in `auth_service.py`.
   - *Fix:* Externalized credentials to `Settings` backed by environment variables with `.env.example` template.
3. **Vehicle Number Inconsistency:**
   - *Bug:* Case differences or whitespace variations caused queries to fail to match records.
   - *Fix:* Created `app.core.vehicle.normalize_vehicle_number()` and integrated it into all repository queries and analysis logic.
4. **Potential Division by Zero in Overlap Math:**
   - *Bug:* `overlap_percentage()` did not guard against zero-duration EWBs.
   - *Fix:* Added duration checks (`duration <= 0` returns `0.0`).
5. **Float Precision Domain Errors in Haversine:**
   - *Bug:* Float precision could result in $a > 1.0$, causing math domain error in `sqrt(1 - a)`.
   - *Fix:* Clamped $a = \min(1.0, \max(0.0, a))$.
6. **Missing Indexing in ORM Models:**
   - *Bug:* `vehicle_number`, `veh`, and `readertme` lacked explicit `index=True` in SQLAlchemy model definitions.
   - *Fix:* Added `index=True` across all corresponding model columns.

---

## 12. Known Limitations & Technical Debt

1. **`readertme` Typo in Schema:** The FASTag source table column is named `readertme` (missing 'i'). This matches the raw source CSV schema and is preserved for backward compatibility.
2. **Pincode Fallbacks are Approximate:** When `data.gov.in` API is unavailable, coordinates fall back to regional postal circle centers marked as `(Estimated)`.
3. **Narrow Bearing Band in Rule 5:** The rule checks $30.0^\circ \le \Delta \text{bearing} < 35.0^\circ$. This narrow threshold is an intentional business decision to reduce false positives in the existing rule set.
4. **JWT in `localStorage`:** Standard for internal web dashboards; future phases can transition to `httpOnly` secure cookies.

---

## 13. Phase 1 Readiness

The codebase is now:
- **Cleanly Structured:** Distinct layers for core, models, repositories, services, and APIs.
- **100% Tested:** 28 automated tests covering vehicle normalization, every individual rule, risk bands, geocoding fallbacks, repository queries, authentication, and batch processing.
- **Secure:** Enforced server-side JWT authentication, environment-backed configuration, and sanitized error responses.
- **Resilient:** Safe mathematical bounds, vehicle format normalization, and robust geocoding fallbacks.
