# Competition Demonstration Guide (3-5 Minute Pitch)

---

## 1. Demonstration Scenario Flow

1. **Step 1: Login & Role Identity**
   - Login with Administrator (`admin` / `admin123`) or Tax Inspector (`inspector` / `inspector123`).
2. **Step 2: Command Center Overview (`/command-center`)**
   - Highlight Top 8 KPI matrix (Total Fleet, High Risk, Open Investigations, Avg Risk Score).
   - Show Fleet Risk Distribution and Top Transit Corridors.
3. **Step 3: Suspicious Vehicle Selection (`/suspicious`)**
   - Click on High-Risk Vehicle (e.g. `KA01AB1234` or any high-risk target).
4. **Step 4: Risk Intelligence Dashboard (`/`)**
   - Point out the 3 core indices: Fraud Risk Score, Compliance Index, Vehicle Trust Score.
   - Show Hybrid Risk formulation: $70\%$ Statutory Rules $+ 30\%$ ML Anomaly.
   - Expand Factual Evidence Items (e.g. Impossible Speed finding between toll plazas).
5. **Step 5: Conversational AI Risk Copilot**
   - Click "Risk Copilot" in Navbar or floating launcher.
   - Ask: *"Why is this vehicle marked with elevated risk?"* (Uses structured risk tools).
   - Ask: *"What does Rule 138(10) state regarding distance and validity?"* (Uses grounded RAG).
6. **Step 6: Initiate Formal Investigation Case**
   - Click "Open Formal Case Docket".
   - View the created case in `/investigations/:caseId`.
   - Add inspector note and mark evidence finding as "RELEVANT".
   - Formally submit resolution (e.g. `SUSPICIOUS_ACTIVITY_CONFIRMED`).
7. **Step 7: Generate Official Executive Dossier**
   - Click "Executive Dossier" in Command Center.
   - View formal printable report with official statutory disclaimer.
