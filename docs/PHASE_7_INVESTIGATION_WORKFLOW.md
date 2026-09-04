# Phase 7 Documentation: Investigation Workflow & Case Management

**Project:** GST Suspicious Vehicle Detection System  
**Milestone:** Phase 7 — Investigation Case Management & Operational Workflow  
**Competition Track:** AI Risk Manager  
**Baseline Date:** September 1, 2026  
**Status:** Completed & Tested (58 / 58 Automated Tests Passing)

---

## 1. Executive Summary & Architecture

Phase 7 elevates the system from pure risk intelligence to an **operational, full-lifecycle GST Case Management platform**:

$$\text{Detect Risk} \longrightarrow \text{Explain Evidence} \longrightarrow \text{Create Docket} \longrightarrow \text{Inspector Notes \& Evidence Review} \longrightarrow \text{Formal Resolution} \longrightarrow \text{Case Closed \& Archived}$$

```
                         ┌─────────────────────────┐
                         │   Vehicle Risk Engine   │
                         └────────────┬────────────┘
                                      │ (Create Docket)
                                      ▼
                         ┌─────────────────────────┐
                         │   Investigation Case    │
                         │ (GST-2026-NNNNNN Docket)│
                         └────────────┬────────────┘
                                      │
                   ┌──────────────────┴──────────────────┐
                   ▼                                     ▼
        ┌─────────────────────┐               ┌─────────────────────┐
        │ Immutable Snapshot  │               │ Live Risk Sync      │
        │ (Values at Creation)│               │ (Real-time Delta)   │
        └──────────┬──────────┘               └──────────┬──────────┘
                   │                                     │
                   └──────────────────┬──────────────────┘
                                      ▼
                         ┌─────────────────────────┐
                         │ Evidence Review Matrix  │
                         │ (Assessed & Annotated)  │
                         └────────────┬────────────┘
                                      │
                         ┌────────────┴────────────┐
                         │ Inspector Notes Thread  │
                         │ (Timestamped Audit Log) │
                         └────────────┬────────────┘
                                      │
                         ┌────────────┴────────────┐
                         │ Formal Case Resolution  │
                         │ (Resolution Category)   │
                         └────────────┬────────────┘
                                      │
                         ┌────────────┴────────────┐
                         │  Closed & Archival Log  │
                         └─────────────────────────┘
```

---

## 2. Investigation Case Model & Database Schema

- **`InvestigationCase` (`investigation_cases`)**:
  - `id`: Primary key.
  - `case_number`: Unique sequential human-readable identifier (e.g. `GST-2026-000001`).
  - `vehicle_number`: Normalized vehicle registration.
  - `created_by`: Foreign key to `users.id` (Creator).
  - `assigned_to`: Foreign key to `users.id` (Assigned Inspector).
  - `risk_score`, `risk_level`, `investigation_priority`: Values captured at creation.
  - `snapshot_json`: Full immutable JSON snapshot (hybrid risk, ML score, compliance index, trust score, confidence level, evidence chains, and risk drivers).
  - `status`: Controlled state (`NEW`, `UNDER_REVIEW`, `INVESTIGATION`, `RESOLVED`, `CLOSED`).
  - `resolution_type`, `resolution_summary`, `resolution_notes`, `resolution_evidence_ids`, `closed_at`, `closed_by`.
- **`InvestigationNote` (`investigation_notes`)**:
  - Chronological inspector notes tracking field findings, taxpayer correspondence, and audit actions.
- **`CaseEvidenceReview` (`case_evidence_reviews`)**:
  - Tracks per-evidence assessment (`REVIEWED`, `RELEVANT`, `NOT_RELEVANT`) and inspector findings without altering underlying telemetry.

---

## 3. Lifecycle State Transition Machine

```
   ┌─────────┐
   │   NEW   │
   └────┬────┘
        │
        ▼
   ┌──────────────┐
   │ UNDER_REVIEW │ ◄──┐ (Admin Reopen)
   └────┬────▲────┘    │
        │    │         │
        ▼    │         │
   ┌─────────┴───┐     │
   │INVESTIGATION│     │
   └────┬────────┘     │
        │              │
        ▼              │
   ┌──────────┐        │
   │ RESOLVED │        │
   └────┬─────┘        │
        │              │
        ▼              │
   ┌─────────┐         │
   │ CLOSED  ├─────────┘
   └─────────┘
```

---

## 4. Duplicate Active Case Protection & Vehicle History

- **Duplicate Prevention:** If an active case (`NEW`, `UNDER_REVIEW`, `INVESTIGATION`) is ongoing for a vehicle, clicking "Create Case" returns the existing open case rather than cluttering the database with duplicates.
- **Vehicle Case History:** Historical closed cases remain preserved. Investigators can view past dockets for repeat-offender patterns.

---

## 5. Live vs Snapshot Risk Delta

The Case Dossier displays:
1. **Creation Snapshot:** What the system observed when the investigation was formally initiated.
2. **Current Live Telemetry:** Real-time risk indices calculated by the current data streams, highlighting telemetry changes over time.

---

## 6. Formal Resolution Categories

1. **`COMPLIANCE_ISSUE`**: Statutory non-compliance identified (e.g. expired E-Way Bill transit).
2. **`SUSPICIOUS_ACTIVITY_CONFIRMED`**: Transit anomaly confirmed (e.g. RFID speed or route deviation).
3. **`DATA_ERROR`**: Sensor glitch or toll timestamp inaccuracy.
4. **`NO_ISSUE_FOUND`**: Documented taxpayer justification verified.
5. **`REFERRED_FOR_FURTHER_REVIEW`**: Escalated to regional tax enforcement wing.
6. **`OTHER`**: Miscellaneous resolution.

---

## 7. API Endpoints

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `POST /api/investigations` | `POST` | `Bearer / Cookie` | Create new case or return existing active case |
| `GET /api/investigations` | `GET` | `Bearer / Cookie` | Paginated, filterable case register |
| `GET /api/investigations/stats` | `GET` | `Bearer / Cookie` | Overall case metrics (open, review, urgent, closed) |
| `GET /api/investigations/{id}` | `GET` | `Bearer / Cookie` | Case dossier with snapshot delta, notes, and evidence assessments |
| `PATCH /api/investigations/{id}/status` | `PATCH` | `Bearer / Cookie` | Advance case lifecycle status |
| `PATCH /api/investigations/{id}/assignment` | `PATCH` | `Bearer / Cookie` | Assign or reassign inspector |
| `POST /api/investigations/{id}/notes` | `POST` | `Bearer / Cookie` | Append timestamped inspector note |
| `POST /api/investigations/{id}/evidence-review` | `POST` | `Bearer / Cookie` | Record assessment on specific evidence item |
| `POST /api/investigations/{id}/resolve` | `POST` | `Bearer / Cookie` | Record formal case resolution |
| `POST /api/investigations/{id}/close` | `POST` | `Bearer / Cookie` | Formally close and archive docket |

---

## 8. Frontend Pages

- **[InvestigationList.jsx](file:///Users/shreyashgautam/Downloads/gst_proj/frontend/src/pages/InvestigationList.jsx) (`/investigations`):** Cases register with metrics banner, search, status filters, and 1-click navigation.
- **[InvestigationDetail.jsx](file:///Users/shreyashgautam/Downloads/gst_proj/frontend/src/pages/InvestigationDetail.jsx) (`/investigations/:caseId`):** Complete case dossier with snapshot comparison, evidence reviews, inspector notes thread, resolution modal, and integrated AI Risk Copilot.
