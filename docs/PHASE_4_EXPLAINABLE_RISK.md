# Phase 4 Documentation: Explainable AI, Evidence Engine & Decision Intelligence

**Project:** GST Suspicious Vehicle Detection System  
**Milestone:** Phase 4 — Explainability, Structured Evidence & Decision Intelligence  
**Competition Track:** AI Risk Manager  
**Baseline Date:** September 1, 2026  
**Status:** Completed & Tested (45 / 45 Automated Tests Passing)

---

## 1. Executive Summary & Architecture

Phase 4 transforms the system into an **investigation-ready, evidence-backed decision platform**:

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
                   ┌──────────────────┴──────────────────┐
                   ▼                                     ▼
        ┌─────────────────────┐               ┌─────────────────────┐
        │   Evidence Engine   │               │  Explanation Engine │
        │ (Verifiable Chains) │               │(Synthesis & Clusters│
        └──────────┬──────────┘               └──────────┬──────────┘
                   │                                     │
                   └──────────────────┬──────────────────┘
                                      ▼
                         ┌─────────────────────────┐
                         │     Decision Engine     │
                         │ (Investigation Priority)│
                         └────────────┬────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │ Investigation Dashboard │
                         │ (Evidence Modal & Action│
                         └─────────────────────────┘
```

---

## 2. Structured Evidence Engine (`EvidenceEngine`)

Every flagged risk signal is backed by a verifiable, structured evidence record:

```json
{
  "evidence_id": "EV-SPEED-01",
  "category": "KINEMATIC_VIOLATION",
  "title": "Impossible Transit Speed",
  "severity": "CRITICAL",
  "observed_value": 148.2,
  "threshold_value": 130.0,
  "unit": "km/h",
  "source": "FASTAG_RFID_TELEMETRY",
  "location": "Shahjahanpur Plaza → Manesar Toll",
  "description": "Vehicle recorded traveling at 148.2 km/h between Shahjahanpur Plaza and Manesar Toll, exceeding maximum realistic heavy freight velocity.",
  "evidence_chain": [
    "E-Way Bill active for vehicle KA01AB1234",
    "FASTag RFID sensor checkpoint recorded at 'Shahjahanpur Plaza' (ID: 104)",
    "Subsequent FASTag RFID scan recorded at 'Manesar Toll' (ID: 108)",
    "Calculated interval velocity of 148.2 km/h strictly exceeds the 130 km/h physical heavy-freight threshold (+18.2 km/h excess)",
    "Statutory Rule R4 triggered (+30 pts risk weight)"
  ]
}
```

---

## 3. Explanation Engine & Signal Deduplication (`ExplanationEngine`)

### A. Deduplicated Risk Clusters
Correlated statutory rules and ML anomalies are grouped into unified operational clusters to prevent artificial score inflation:
1. **`CL-VELOCITY`**: Transit Velocity & Kinematic Anomaly (Rule 4 + ML Speed Departure + Trust Sanity Penalty).
2. **`CL-ROUTE`**: Route Bearing Diversion (Rule 5 + Compliance Route Alignment Penalty).
3. **`CL-DOCUMENTATION`**: E-Way Bill & Telemetry Misalignment (Rule 1 / 2 / 3 + Documentation Integrity).
4. **`CL-TEMPORAL`**: Temporal Halts & Teleportation Jumps (Rule 6 + Trust Temporal Continuity).
5. **`CL-ML`**: Unsupervised Multi-Dimensional Statistical Outlier.

### B. Financial Context Framing
- Calculates **Associated Transaction Valuation** across all declared and flagged bills (e.g. `₹12,40,000`).
- Responsibly framed as *"Associated E-Way Bill Transaction Valuation Requiring Review"*, never as unverified *"Fraud Amount"*.

---

## 4. Decision Intelligence & Investigation Priorities (`DecisionEngine`)

Maps hybrid risk scores, confidence levels, and evidence dossiers to deterministic priority tiers:

| Priority Level | Badge Color | Trigger Condition | Action Summary |
|---|---|---|---|
| **`URGENT_REVIEW`** | Rose (pulsing) | Hybrid Score $\ge 85$ OR ($\ge 2$ Critical Violations with Conf $\ge 50$) | Immediate field interception & consignment inspection |
| **`INVESTIGATE`** | Red | Hybrid Score $\ge 50$ with Conf $\ge 40$ OR $\ge 1$ Critical Flag | Formal tax audit & consignor cross-examination |
| **`REVIEW`** | Amber | Elevated risk with Low Confidence ($\text{Conf} < 40$) | Document verification & data completeness review |
| **`MONITOR`** | Yellow | Moderate risk ($30 - 49$) or statistical ML outlier | Flag in system for recurring patterns |
| **`NORMAL`** | Emerald | Hybrid Score $< 30$ with clean statutory record | Routine archival compliance |

### Prescriptive Action Checklist:
- **`ACT-01`**: Audit RFID Toll Timestamps & Clock Synchronization.
- **`ACT-02`**: Perform Physical Delivery Interception.
- **`ACT-03`**: Cross-Examine E-Way Bill Validity Expiration.
- **`ACT-04`**: Investigate Potential Invoice Recycling.
- **`ACT-05`**: Investigate Potential Ghost Transport / Fake Invoicing.
- **`ACT-06`**: Examine Uncodified Fleet Telemetry Outlier.

---

## 5. UI Integration & Interactive Evidence Modal

- **`ExecutiveDecisionBanner`**: Top-level executive summary displaying investigation priority, hybrid score, confidence assessment, and associated financial exposure.
- **`InvestigationGuidance`**: Interactive officer checklist with step-by-step audit actions and case queuing.
- **`EvidenceModal`**: Modal popup displaying full factual findings, parameter measurements, and end-to-end evidence chains.

---

## 6. Phase 5 AI Copilot Readiness

The structured outputs (`evidence_chain`, `decision`, `executive_summary`, `financial_context`, `risk_clusters`) provide clean, hallucination-free context payloads for the Phase 5 RAG / LLM Risk Copilot.
