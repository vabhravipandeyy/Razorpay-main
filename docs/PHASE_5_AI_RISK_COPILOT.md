# Phase 5 Documentation: RAG, LLM & AI Risk Copilot

**Project:** GST Suspicious Vehicle Detection System  
**Milestone:** Phase 5 — Retrieval-Augmented Generation (RAG) & AI Risk Copilot  
**Competition Track:** AI Risk Manager  
**Baseline Date:** September 1, 2026  
**Status:** Completed & Tested (49 / 49 Automated Tests Passing)

---

## 1. Executive Summary & Architecture

Phase 5 introduces a reliable, grounded **AI Risk Copilot** that allows GST tax inspectors and enforcement officers to investigate vehicles conversationally and query official tax regulations.

```
                         ┌─────────────────────────┐
                         │   Officer Investigation │
                         └────────────┬────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │     AI Risk Copilot     │
                         │   (Intent Router & UI)  │
                         └────────────┬────────────┘
                                      │
                   ┌──────────────────┴──────────────────┐
                   ▼                                     ▼
        ┌─────────────────────┐               ┌─────────────────────┐
        │  Controlled Risk    │               │  RAG Retrieval      │
        │  Tools (Read-Only)  │               │  (Vector Knowledge) │
        │ (Profile, Evidence) │               │ (Rule 138, SOPs)    │
        └──────────┬──────────┘               └──────────┬──────────┘
                   │                                     │
                   └──────────────────┬──────────────────┘
                                      ▼
                         ┌─────────────────────────┐
                         │      LLM Service        │
                         │ (Grounded Synthesis)    │
                         └────────────┬────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │ Evidence-Backed Answer  │
                         │ (Citations & Checklists)│
                         └─────────────────────────┘
```

> [!IMPORTANT]
> **Strict Non-Hallucination Directive:** The LLM is never the primary source of truth. It never invents risk scores, FASTag timestamps, or E-Way Bill numbers. Vehicle data is retrieved from verified backend tools; GST regulations are retrieved from verified RAG sources.

---

## 2. LLM Multi-Provider Abstraction (`LLMService`)

Supports configurable deployment environments:
- **Google Gemini:** `gemini-1.5-flash` / `gemini-1.5-pro` via `GEMINI_API_KEY`.
- **OpenAI:** `gpt-4o-mini` / `gpt-4o` via `OPENAI_API_KEY`.
- **Ollama / Local:** Self-hosted local LLMs.
- **Deterministic Synthesis Engine (Default Fallback):** Offline, zero-cost, hallucination-free rule and evidence synthesis engine that ensures tests and dev environments operate with 100% reliability.

---

## 3. GST Regulatory Knowledge Base & Vector Store

- **Indexed Documents:** Authoritative CBIC GST circulars, CGST Rule 138 (E-Way Bill requirements & validity standards), Rule 138A (Conveyance tracking & FASTag integration), Rule 138B (Interception & audit procedures), Circular No. 41/15/2018-GST (Route compliance), and National Telemetry Standards.
- **Vector Store (`VectorStoreService`):** Lightweight in-memory and disk-persisted vector store utilizing normalized TF-IDF n-gram vectorization and cosine similarity matching.
- **Ingestion Script:** `backend/scripts/ingest_gst_knowledge.py`

---

## 4. Controlled Read-Only Risk Tools (`RiskToolService`)

The LLM interacts with vehicle data strictly through authenticated, read-only tools:
- `get_vehicle_risk_profile(db, vehicle_number)`: Returns fraud score, hybrid score, ML anomaly score, compliance index, trust score, and confidence level.
- `get_vehicle_evidence(db, vehicle_number)`: Returns structured evidence items and step-by-step audit chains.
- `get_vehicle_rules(db, vehicle_number)`: Returns statutory 6-rule evaluation results.
- `get_fastag_events(db, vehicle_number)`: Returns chronological toll crossings.
- `get_eway_bills(db, vehicle_number)`: Returns registered consignment bills.
- `get_investigation_recommendations(db, vehicle_number)`: Returns prescriptive officer action checklists.

---

## 5. Intent Routing (`CopilotService`)

Automatically categorizes queries into distinct operational paths:
- **`GENERAL_GST`**: Pure regulatory questions $\to$ RAG vector search $\to$ Cited answer.
- **`VEHICLE_RISK`**: Vehicle overview questions $\to$ Risk tools $\to$ Structured investigation brief.
- **`VEHICLE_EVIDENCE`**: Velocity / movement / telemetry questions $\to$ Evidence engine tools $\to$ Kinematic audit trail.
- **`VEHICLE_ROUTE`**: Bearing / diversion questions $\to$ Route telemetry tools $\to$ Corridor comparison.
- **`VEHICLE_INVESTIGATION`**: Next-step questions $\to$ Decision engine tools $\to$ Prescriptive checklist.
- **`MIXED`**: Statutory compliance regarding a specific vehicle $\to$ Risk tools + RAG retrieval $\to$ Grounded explanation.

---

## 6. Conversational Memory & Database Models

- **`ai_chat_sessions`**: User-scoped session records storing `id`, `user_id`, `vehicle_number`, and `title`.
- **`ai_chat_messages`**: Chronological message logs storing `session_id`, `role`, `content`, `sources_json`, `evidence_json`, and `tool_calls_json`.
- **Session Isolation:** Users can only query and retrieve their own authenticated chat sessions.

---

## 7. API Endpoints

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `POST /api/copilot/chat` | `POST` | `Bearer / Cookie` | Conversational query execution with vehicle context and RAG citations |
| `GET /api/copilot/sessions` | `GET` | `Bearer / Cookie` | Lists recent chat sessions for the authenticated officer |
| `GET /api/copilot/sessions/{session_id}` | `GET` | `Bearer / Cookie` | Retrieves full message history and citations for a specific session |
| `GET /api/copilot/health` | `GET` | `Bearer / Cookie` | Status check for LLM provider, vector store documents, and readiness |

---

## 8. Frontend Copilot UI (`CopilotDrawer.jsx`)

- **Slide-Over Drawer:** Accessible from any page or directly from the floating widget button on the Dashboard.
- **Active Vehicle Context:** Displays current vehicle registration badge.
- **Interactive Formatting:** Renders clean Markdown, expandable regulatory citations, evidence tags, and tool execution status.
- **Quick Prompt Chips:** One-click shortcuts for common audit questions.
- **Feedback Buttons:** 👍 / 👎 feedback toggles for continuous quality tracking.
