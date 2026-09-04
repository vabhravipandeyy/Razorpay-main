# End-to-End System Architecture

**Project:** GST Suspicious Vehicle Detection System  
**Track:** AI Risk Manager  

---

## 1. Complete Multi-Tier System Diagram

```
                              ┌────────────────────────────────────────┐
                              │            CLIENT BROWSER              │
                              │ (React 18 + Vite + TailwindCSS + Maps) │
                              └───────────────────┬────────────────────┘
                                                  │ (HTTPS / HttpOnly Cookie)
                                                  ▼
                              ┌────────────────────────────────────────┐
                              │       NGINX REVERSE PROXY GATEWAY      │
                              │ (SSL Termination, Gzip, Security Hdrs) │
                              └───────────────────┬────────────────────┘
                                                  │
                                                  ▼
                              ┌────────────────────────────────────────┐
                              │          FASTAPI ASGI BACKEND          │
                              │ (Security Headers, Rate Limiter, Auth) │
                              └───────────────────┬────────────────────┘
                                                  │
                 ┌────────────────────────────────┼────────────────────────────────┐
                 ▼                                ▼                                ▼
   ┌──────────────────────────┐     ┌──────────────────────────┐     ┌──────────────────────────┐
   │      AUTHENTICATION      │     │     AI RISK COPILOT      │     │      COMMAND CENTER      │
   │    & RBAC PERMISSIONS    │     │  (RAG Vector Store +     │     │   & ADVANCED ANALYTICS   │
   │ (Admin / Inspector Gate) │     │   Read-Only Risk Tools)  │     │   (KPIs / Corridors)     │
   └─────────────┬────────────┘     └─────────────┬────────────┘     └─────────────┬────────────┘
                 │                                │                                │
                 └────────────────────────────────┼────────────────────────────────┘
                                                  │
                                                  ▼
                              ┌────────────────────────────────────────┐
                              │         HYBRID RISK ENGINE             │
                              │  ┌─────────────────┬─────────────────┐ │
                              │  │ Statutory Rules │ Isolation Forest│ │
                              │  │ (Max 130 Score) │ (14D Telemetry) │ │
                              │  └────────┬────────┴────────┬────────┘ │
                              │           └────────┬────────┘          │
                              │                    ▼                   │
                              │         Hybrid Risk Calculation        │
                              │        (70% Rules + 30% ML Score)      │
                              └───────────────────┬────────────────────┘
                                                  │
                 ┌────────────────────────────────┼────────────────────────────────┐
                 ▼                                ▼                                ▼
   ┌──────────────────────────┐     ┌──────────────────────────┐     ┌──────────────────────────┐
   │      EVIDENCE ENGINE     │     │      DECISION ENGINE     │     │     CASE MANAGEMENT      │
   │  (Factual Evidence Items │     │ (Statutory Priority Band │     │ (GST-2026-NNNNNN Dockets │
   │   & Verifiable Chains)   │     │   & Actionable Checks)   │     │  & Evidence Reviews)     │
   └─────────────┬────────────┘     └─────────────┬────────────┘     └─────────────┬────────────┘
                 │                                │                                │
                 └────────────────────────────────┼────────────────────────────────┘
                                                  │
                                                  ▼
                              ┌────────────────────────────────────────┐
                              │       DATABASE & STORAGE TIER          │
                              │ (MySQL 8 + SQLAlchemy 2.0 ORM Indices) │
                              └────────────────────────────────────────┘
```

---

## 2. Core Execution Pipeline

$$\text{EWB + FASTag Records} \longrightarrow \text{14D Feature Vector} \longrightarrow \begin{cases} \text{Statutory Fraud Rules} \\ \text{Isolation Forest ML Engine} \end{cases} \longrightarrow \text{Hybrid Risk Score} \longrightarrow \text{Evidence Chains} \longrightarrow \text{Case Dockets} \longrightarrow \text{Reporting}$$
