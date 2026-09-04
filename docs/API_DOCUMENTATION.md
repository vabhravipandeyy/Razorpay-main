# API Reference & Endpoint Specification

**Base URL:** `http://localhost:8000` (or production hostname)  
**Interactive Swagger Docs:** `http://localhost:8000/docs`  
**OpenAPI Specification:** `http://localhost:8000/openapi.json`

---

## 1. Authentication & User Governance

| Method | Path | Role | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register new tax inspector account |
| `POST` | `/api/auth/login` | Public | Authenticate user, issue HttpOnly cookie & JWT |
| `POST` | `/api/auth/logout` | Authenticated | Revoke session and clear cookies |
| `GET` | `/api/auth/me` | Authenticated | Fetch active user identity & role |
| `POST` | `/api/auth/change-password` | Authenticated | Update password and invalidate prior sessions |
| `GET` | `/api/admin/overview` | Admin | Enterprise governance overview statistics |
| `GET` | `/api/admin/users` | Admin | Searchable user directory |
| `POST` | `/api/admin/users` | Admin | Provision new tax inspector or administrator |
| `PATCH` | `/api/admin/users/{id}/status` | Admin | Activate / deactivate user (last-admin protected) |
| `PATCH` | `/api/admin/users/{id}/role` | Admin | Modify user role (last-admin protected) |
| `GET` | `/api/admin/audit-logs` | Admin | Paginated immutable audit trail with IP hashing |

---

## 2. Vehicle Risk & Telemetry

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/analysis/{vehicle_number}` | Authenticated | Full multi-dimensional risk profile for vehicle |
| `GET` | `/analysis/vehicles/available` | Authenticated | List all evaluated vehicles with risk summaries |
| `GET` | `/analysis/features/{vehicle_number}` | Authenticated | 14-dimensional feature vector breakdown |
| `POST` | `/analysis/ml/train` | Admin | Trigger Isolation Forest ML model retraining |
| `POST` | `/analysis/records/sync` | Admin | Batch evaluate and cache vehicle risk records |

---

## 3. AI Risk Copilot & RAG

| Method | Path | Role | Description |
|---|---|---|---|
| `POST` | `/api/copilot/chat` | Authenticated | Conversational AI query with grounded RAG & tools |
| `GET` | `/api/copilot/sessions` | Authenticated | List recent chat sessions for user |
| `GET` | `/api/copilot/sessions/{id}` | Authenticated | Message history for chat session |
| `GET` | `/api/copilot/health` | Authenticated | Health status of LLM engine & vector store |

---

## 4. Case Management & Investigations

| Method | Path | Role | Description |
|---|---|---|---|
| `POST` | `/api/investigations` | Authenticated | Create investigation case or return active duplicate |
| `GET` | `/api/investigations` | Authenticated | Paginated, filterable case register |
| `GET` | `/api/investigations/stats` | Authenticated | Summary case metrics (open, review, urgent, closed) |
| `GET` | `/api/investigations/{id}` | Authenticated | Complete case dossier with snapshot vs live delta |
| `PATCH` | `/api/investigations/{id}/status` | Authenticated | Advance case status through state machine |
| `PATCH` | `/api/investigations/{id}/assignment` | Authenticated | Assign or reassign inspector |
| `POST` | `/api/investigations/{id}/notes` | Authenticated | Add inspector note with timestamp |
| `POST` | `/api/investigations/{id}/evidence-review` | Authenticated | Record assessment on specific evidence item |
| `POST` | `/api/investigations/{id}/resolve` | Authenticated | Submit formal case resolution |
| `POST` | `/api/investigations/{id}/close` | Authenticated | Formally close and archive case |

---

## 5. Command Center Analytics & Reporting

| Method | Path | Role | Description |
|---|---|---|---|
| `GET` | `/api/analytics/overview` | Authenticated | System-wide fleet KPI metrics |
| `GET` | `/api/analytics/risk-distribution` | Authenticated | Fleet breakdown across High, Medium, and Low bands |
| `GET` | `/api/analytics/risk-trends` | Authenticated | 30-day time-series risk trajectory |
| `GET` | `/api/analytics/risk-signals` | Authenticated | Statutory fraud rule trigger frequencies |
| `GET` | `/api/analytics/routes` | Authenticated | High-risk origin-destination transit corridors |
| `GET` | `/api/analytics/tolls` | Authenticated | Toll plazas with concentrated anomaly signals |
| `GET` | `/api/analytics/regions` | Authenticated | State RTO risk index rankings |
| `GET` | `/api/reports/executive` | Authenticated | Formal Executive Intelligence Report |
| `GET` | `/api/reports/vehicle/{v_num}` | Authenticated | Printable Vehicle Risk Dossier |
| `GET` | `/api/reports/investigation/{id}` | Authenticated | Printable Case Dossier |
| `GET` | `/api/reports/export/vehicles-csv` | Admin | Export vehicle risk records to CSV |
| `GET` | `/api/reports/export/cases-csv` | Admin | Export investigation cases to CSV |
| `GET` | `/health` | Public | Liveness probe |
| `GET` | `/health/ready` | Public | Readiness probe for DB, ML, and Vector Store |
