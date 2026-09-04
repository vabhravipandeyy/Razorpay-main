# Phase 3 Documentation: ML Anomaly Detection & Hybrid Risk Engine

**Project:** GST Suspicious Vehicle Detection System  
**Milestone:** Phase 3 — Unsupervised Machine Learning & Hybrid Intelligence  
**Competition Track:** AI Risk Manager  
**Baseline Date:** September 1, 2026  
**Status:** Completed & Tested (41 / 41 Automated Tests Passing)

---

## 1. Executive Summary & Architecture

Phase 3 introduces an unsupervised **Machine Learning Anomaly Detection Engine** that operates in tandem with the statutory 6-rule engine. It establishes a **Hybrid Risk Architecture**:

```
                         ┌─────────────────────────┐
                         │   EWB & FASTag Telemetry│
                         └────────────┬────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │ FeatureEngineeringSvc   │
                         │ (14-Dimensional Vector) │
                         └────────────┬────────────┘
                                      │
                   ┌──────────────────┴──────────────────┐
                   ▼                                     ▼
        ┌─────────────────────┐               ┌─────────────────────┐
        │  Statutory Rule     │               │  Unsupervised ML    │
        │  Engine (6 Rules)   │               │  (Isolation Forest) │
        │ (0 - 130 Baseline)  │               │  (0 - 100 Anomaly)  │
        └──────────┬──────────┘               └──────────┬──────────┘
                   │                                     │
                   └──────────────────┬──────────────────┘
                                      ▼
                         ┌─────────────────────────┐
                         │   Hybrid Risk Engine    │
                         │ (70% Rule + 30% ML Score│
                         └────────────┬────────────┘
                                      │
                   ┌──────────────────┼──────────────────┐
                   ▼                  ▼                  ▼
        ┌──────────────────┐ ┌──────────────────┐ ┌──────────────────┐
        │ Compliance Index │ │  Vehicle Trust   │ │EvidenceConfidence│
        │  (0 - 100 Score) │ │  (0 - 100 Score) │ │  (0 - 100 Score) │
        └──────────────────┘ └──────────────────┘ └──────────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │   Unified Risk Profile  │
                         │   (API & Dashboard UI)  │
                         └─────────────────────────┘
```

---

## 2. ML Problem Formulation

- **Unsupervised Anomaly Detection:** In GST enforcement, verified fraud ground-truth labels are scarce or biased. Supervised models trained on unverified data suffer from label leakage and false certainty.
- **Isolation Forest Baseline:** Isolates anomalous multi-dimensional telemetry patterns by randomly partitioning feature space. Points requiring fewer recursive partitions are statistically unusual outliers.
- **Rule Violation vs. ML Anomaly Distinction:**
  - **Rule Violation:** Triggers a specific, hardcoded statutory regulation (e.g. Speed $> 130\text{ km/h}$).
  - **ML Anomaly:** Detects subtle multi-dimensional outliers (e.g. combined moderate speed + unusual night-time frequency + elevated invoice ratios) not explicitly captured by discrete rules.

---

## 3. Feature Vector Schema (14 Dimensions)

The feature matrix is derived directly from `FeatureEngineeringService`:

| Index | Feature Key | Display Name | Unit | Description |
|---|---|---|---|---|
| 0 | `ewb_total_count` | E-Way Bill Volume | count | Total bills declared |
| 1 | `ewb_avg_invoice_value` | Average Invoice Valuation | ₹ | Financial valuation mean |
| 2 | `ewb_max_invoice_value` | Max Invoice Valuation | ₹ | Maximum single bill value |
| 3 | `ewb_overlapping_pairs` | Overlapping Bill Pairs | count | Concurrent validity pairs ($\ge 60\%$) |
| 4 | `fastag_total_count` | FASTag Telemetry Volume | count | Total RFID toll scans |
| 5 | `fastag_unique_tolls` | Unique Toll Checkpoints | count | Distinct toll plazas visited |
| 6 | `fastag_night_crossings` | Night-time Toll Crossings | count | Scans between 22:00 and 06:00 |
| 7 | `speed_avg_kmh` | Average Transit Velocity | km/h | Mean speed across toll legs |
| 8 | `speed_max_kmh` | Peak Transit Velocity | km/h | Maximum observed interval speed |
| 9 | `speed_variance` | Velocity Dispersion | $(km/h)^2$ | Kinematic stability |
| 10 | `movement_total_km` | Observed Road Trajectory | km | Total cumulative distance |
| 11 | `movement_stationary_8h` | Extended Stationary Halts | count | Stops $>8\text{h}$ with $<10\text{km}$ |
| 12 | `movement_rapid_jumps` | Spatial Jump Teleportation | count | Movements $>100\text{km}$ in $<5\text{min}$ |
| 13 | `route_bearing_deviation` | Route Bearing Deviation | deg | Angular difference vs declared path |

---

## 4. Preprocessing & Anomaly Score Normalization

### A. Preprocessing
- Replaces `None`, `NaN`, and infinite values with safe boundary defaults.
- Imputes fleet reference medians when observational data points are zero.

### B. Normalization Formula (0–100)
Isolation Forest `decision_function(X)` yields raw scores in the range $[-0.35, +0.25]$:
$$\text{ML Anomaly Score} = \text{clip}\left(\text{round}\left((0.20 - \text{decision\_function}) \times 160.0\right), 0, 100\right)$$

- **`HIGHLY_ANOMALOUS`**: Score $\ge 75$
- **`UNUSUAL`**: Score $50 - 74$
- **`NORMAL`**: Score $< 50$

---

## 5. Feature Deviation & Explainability

For each vehicle, features are compared against the population reference medians:
$$\text{deviation\_pct} = \frac{\text{observed\_value} - \text{population\_median}}{\max(1.0, |\text{population\_median}|)} \times 100$$

Top deviating features are ranked and formatted with clear plain-English summaries for tax investigators.

---

## 6. Hybrid Risk Engine Methodology

Combines statutory certainty with statistical machine learning:

$$\text{Hybrid Risk Score} = (0.70 \times \text{Normalized Rule Score}) + (0.30 \times \text{ML Anomaly Score})$$

Where $\text{Normalized Rule Score} = \min\left(100.0, \frac{\text{Rule Score}}{130.0} \times 100.0\right)$.

### Risk Bands:
- `LOW`: $0 - 29$
- `MEDIUM`: $30 - 59$
- `HIGH`: $60 - 84$
- `CRITICAL`: $85+$

### Rule vs. ML Diagnostic Matrix:
- **`HIGH_RULE_HIGH_ML`**: High statutory violations & high statistical anomaly $\to$ Priority investigation candidate.
- **`LOW_RULE_HIGH_ML`**: Low rule violations with high statistical anomaly $\to$ Novel or uncodified behavioral pattern detected.
- **`HIGH_RULE_LOW_ML`**: Specific statutory rule triggered while statistical profile remains near fleet median.
- **`LOW_RULE_LOW_ML`**: Consistent baseline. Normal statutory compliance and typical telemetry.

---

## 7. Model Cold-Start & Graceful Degradation
If no model artifact is found on disk, `MLAnomalyService` returns status `UNAVAILABLE` and the `RiskEngine` automatically falls back to 100% rule-based scoring without throwing unhandled exceptions.

---

## 8. Training Pipeline & Admin Endpoints

- **CLI Script:** `backend/scripts/train_anomaly_model.py`
- **Authenticated Endpoint:** `POST /analysis/ml/train` (retrains model and updates `app/models/ml_artifacts/`)
- **Metadata Endpoint:** `GET /analysis/ml/metadata` (returns model version, training sample size, and feature baseline statistics)
