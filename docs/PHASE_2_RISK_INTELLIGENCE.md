# Phase 2 Documentation: Risk Intelligence Engine

**Project:** GST Suspicious Vehicle Detection System  
**Milestone:** Phase 2 — Risk Intelligence Engine  
**Competition Track:** AI Risk Manager  
**Baseline Date:** September 1, 2026  
**Status:** Completed & Tested (37 / 37 Automated Tests Passing)

---

## 1. Executive Summary & Architecture

Phase 2 elevates the system from simple ad-hoc rule evaluation into a structured, modular **Risk Intelligence Engine**:

```
                         ┌─────────────────────────┐
                         │   EWB & FASTag Telemetry│
                         └────────────┬────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │ FeatureEngineeringSvc   │
                         │ (Kinematic, Route, Temp)│
                         └────────────┬────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │    RuleEngine (6 Rules) │
                         │ (0 - 130 Score Baseline)│
                         └──────┬─────┬─────┬──────┘
                                │     │     │
                ┌───────────────┘     │     └──────────────┐
                ▼                     ▼                    ▼
     ┌───────────────────┐  ┌───────────────────┐  ┌───────────────────┐
     │ ComplianceService │  │ TrustScoreService │  │ EvidenceConfidence│
     │  (0 - 100 Score)  │  │  (0 - 100 Score)  │  │  (0 - 100 Score)  │
     └─────────┬─────────┘  └─────────┬─────────┘  └─────────┬─────────┘
               │                      │                      │
               └──────────────────────┼──────────────────────┘
                                      ▼
                         ┌─────────────────────────┐
                         │       RiskEngine        │
                         │  (Prioritized Drivers)  │
                         └────────────┬────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │   Unified Risk Profile  │
                         │  (API & UI Integration) │
                         └─────────────────────────┘
```

> [!IMPORTANT]
> **Deterministic Foundation:** Phase 2 is entirely deterministic and mathematically explainable. No black-box machine learning or LLMs are used in Phase 2. This creates clean feature vectors and clean labels for Phase 3 ML.

---

## 2. Feature Engineering Service (`FeatureEngineeringService`)

Derives quantifiable features across 6 distinct categories:

### A. E-Way Bill Features (`ewb`)
- `total_ewbs`: Total declared documentation count.
- `active_ewbs` / `expired_ewbs`: Temporal validity status.
- `avg_invoice_value` / `max_invoice_value`: Financial value assessment.
- `total_declared_distance_km` / `avg_declared_distance_km`: Declared route distances.
- `overlapping_ewb_pairs`: Count of E-Way Bill pairs sharing $\ge 60\%$ concurrent validity.
- `high_value_ewb_count`: Count of bills $\ge ₹50,000$.

### B. FASTag Telemetry Features (`fastag`)
- `total_transactions`: Total RFID toll passage events.
- `unique_toll_plazas`: Count of distinct toll plazas traversed.
- `night_crossings_count`: Crossings occurring between 22:00 and 06:00.
- `avg_time_between_tolls_min`: Average checkpoint interval in minutes.
- `avg_distance_between_tolls_km`: Mean geographic distance between consecutive checkpoints.

### C. Speed & Kinematic Features (`speed`)
- `avg_speed_kmh` / `max_speed_kmh` / `min_speed_kmh`: Calculated interval transit velocities.
- `speed_variance`: Statistical dispersion of speeds across journey segments.
- `high_speed_events_gt_100`: Crossings with speeds $> 100\text{ km/h}$.
- `impossible_speed_events_gt_130`: Crossings with speeds $> 130\text{ km/h}$ (Rule 4 threshold).

### D. Movement Continuity Features (`movement`)
- `total_observed_movement_km`: Sum of Great Circle distances across all toll checkpoints.
- `movement_segments_count`: Total valid consecutive toll legs.
- `stationary_periods_gt_8h`: Movement $< 10\text{ km}$ with elapsed time $> 8\text{ hours}$.
- `rapid_long_distance_jumps`: Movement $> 100\text{ km}$ in $< 5\text{ minutes}$ (teleportation anomaly).

### E. Route Conformity Features (`route`)
- `declared_bearing_deg`: Angle from declared Origin PIN to Destination PIN.
- `observed_bearing_deg`: Angle from first observed toll plaza to last observed toll plaza.
- `bearing_deviation_deg`: Circular angular difference ($\min(|A - B|, 360 - |A - B|)$).
  - *Example:* $350^\circ$ vs $10^\circ = 20^\circ$ difference (correct circular geodesy).
- `route_mismatch_detected`: Flagged if $30.0^\circ \le \text{deviation} < 35.0^\circ$ (Rule 5).

### F. Data Quality Features (`data_quality`)
- `missing_coordinates_count`: Checkpoints with null latitude or longitude.
- `missing_timestamps_count`: Checkpoints with null timestamps.
- `invalid_coordinates_count`: Coordinates outside valid Earth bounds ($-90 \le \text{lat} \le 90$).
- `data_quality_score`: $0 - 100$ completeness indicator.

---

## 3. Statutory Rule Engine (`RuleEngine`)

Evaluates the 6 statutory rules with exact score preservation:

| Rule ID | Rule Name | Severity | Score Weight | Threshold |
|---|---|---|---|---|
| **R1** | No FASTag Data | HIGH | **+25 pts** | Active EWB with 0 FASTags |
| **R2** | Duplicate E-Way Bill | MEDIUM | **+10 pts** | Overlap $\ge 60\%$ |
| **R3** | FASTag Outside Validity | HIGH | **+20 pts** | Crossings with no active EWB |
| **R4** | Impossible Average Speed | CRITICAL | **+30 pts** | Velocity $> 130\text{ km/h}$ |
| **R5** | Route Mismatch | HIGH | **+25 pts** | $30.0^\circ \le \Delta \text{bearing} < 35.0^\circ$ |
| **R6** | Suspicious Time Gap | MEDIUM | **+20 pts** | (A) $<10\text{km}, >8\text{h}$ OR (B) $>100\text{km}, <5\text{min}$ |

**Risk Level Classifications:**
- `LOW`: $0 - 29\text{ pts}$
- `MEDIUM`: $30 - 59\text{ pts}$
- `HIGH`: $60+\text{ pts}$

---

## 4. Compliance Engine (`ComplianceService`)

Calculates a deterministic **Compliance Score** ($0 - 100$) reflecting regulatory adherence:
- **Baseline:** $100\text{ pts}$
- **Penalties:**
  - $-30\text{ pts}$ if Rule 1 failed (No FASTag coverage)
  - $-25\text{ pts}$ if Rule 2 failed (Duplicate / Overlapping billing)
  - $-25\text{ pts}$ if Rule 3 failed (Toll transit outside validity)
  - $-20\text{ pts}$ if Rule 5 failed (Route bearing deviation)
- **Sub-Dimensions Evaluated:**
  - `ewb_validity` ($0-100$)
  - `movement_compliance` ($0-100$)
  - `route_compliance` ($0-100$)
  - `fastag_consistency` ($0-100$)

---

## 5. Vehicle Trust Engine (`TrustScoreService`)

Calculates a deterministic **Vehicle Trust Score** ($0 - 100$) reflecting physical feasibility:
- **Baseline:** $100\text{ pts}$
- **Penalties:**
  - $-35\text{ pts}$ if Rule 4 failed (Impossible velocity $> 130\text{ km/h}$)
  - $-25\text{ pts}$ if Rule 6 failed (Suspicious time gap or teleportation)
  - $-20\text{ pts}$ if Rule 3 failed (Unregistered physical movement)
  - $-20\text{ pts}$ if Rule 2 failed (Concurrent duplicate bills)
- **Sub-Dimensions Evaluated:**
  - `telemetry_sanity` ($0-100$)
  - `movement_consistency` ($0-100$)
  - `documentation_consistency` ($0-100$)
  - `route_consistency` ($0-100$)

---

## 6. Evidence Confidence Engine

Calculates an **Evidence Confidence Score** ($0 - 100$) representing the completeness and statistical richness of available evidence:
- **EWB Documentation Coverage:** up to $30\text{ pts}$ ($\ge 3$ EWBs $= 30\text{ pts}$, $1-2 = 20\text{ pts}$)
- **FASTag Telemetry Coverage:** up to $40\text{ pts}$ ($\ge 10$ scans $= 40\text{ pts}$, $4-9 = 30\text{ pts}$, $1-3 = 15\text{ pts}$)
- **Data Quality Score:** up to $30\text{ pts}$ based on coordinate and timestamp completeness.

> [!NOTE]
> **Risk vs. Confidence Distinction:** A vehicle with 1 FASTag passage outside validity may receive a `MEDIUM RISK` classification with `LOW CONFIDENCE` because observations are sparse.

---

## 7. Prioritized Risk Drivers (`RiskEngine`)

Sorts all flagged statutory infractions and behavioral anomalies by severity (`CRITICAL` $\to$ `HIGH` $\to$ `MEDIUM`) and risk weight contribution. This provides direct explainability for tax inspectors.

---

## 8. API Endpoints

- `GET /analysis/{vehicle_number}/risk-profile` — Returns the complete Unified Risk Profile.
- `GET /analysis/{vehicle_number}/features` — Returns extracted feature vectors and behavior profile.
- `GET /analysis/{vehicle_number}` — Full backward-compatible live analysis endpoint.
