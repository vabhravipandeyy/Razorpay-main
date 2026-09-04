# AI Architecture: Hybrid Risk, RAG & Risk Copilot

**Project:** GST Suspicious Vehicle Detection System  
**Track:** AI Risk Manager  

---

## 1. Hybrid Risk Engine

The system avoids relying purely on black-box ML or static heuristics by employing a **Weighted Hybrid Risk Architecture**:

$$\text{Hybrid Risk Score} = \left(0.70 \times \text{Normalized Rule Score}\right) + \left(0.30 \times \text{ML Anomaly Score}\right)$$

- **Deterministic Statutory Rules (70%):** Enforces statutory non-negotiable tax fraud rules (impossible velocity, route mismatch, expired validity, duplicate bills).
- **Unsupervised ML Anomaly Detection (30%):** Catches subtle multi-dimensional transit outliers across 14 extracted telemetry features using an Isolation Forest baseline.

---

## 2. RAG Regulatory Vector Store

- **Authoritative Knowledge Base:** Ingests official CBIC GST rules (Rule 138, 138A, 138B), National Telemetry Standards, and FASTag circulars.
- **Cosine Vector Search:** Embeds statutory text chunks and performs cosine similarity retrieval with confidence thresholding ($\ge 0.15$).
- **Grounded Synthesis:** Prompts enforce that the AI must only cite retrieved statutory chunks and must explicitly state when information is unavailable.

---

## 3. Read-Only Risk Tools

When responding to vehicle inquiries, the Copilot executes safe, read-only Python tools:
- `get_vehicle_profile(vehicle_number)`
- `get_vehicle_evidence(vehicle_number)`
- `get_rule_evaluations(vehicle_number)`
- `get_fastag_timeline(vehicle_number)`
- `get_eway_bills(vehicle_number)`
- `get_investigation_recommendations(vehicle_number)`
