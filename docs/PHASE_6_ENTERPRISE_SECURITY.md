# Phase 6 Documentation: Enterprise Security, RBAC & Admin Control Center

**Project:** GST Suspicious Vehicle Detection System  
**Milestone:** Phase 6 — Enterprise Security, Role-Based Access Control & Admin Governance  
**Competition Track:** AI Risk Manager  
**Baseline Date:** September 1, 2026  
**Status:** Completed & Tested (53 / 53 Automated Tests Passing)

---

## 1. Executive Summary & Architecture

Phase 6 elevates the platform into an **enterprise-grade, multi-tenant GST enforcement platform**:

```
                         ┌─────────────────────────┐
                         │    Inspector / Admin    │
                         └────────────┬────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │   HttpOnly JWT Cookie   │
                         │ (SameSite=Lax, Secure)  │
                         └────────────┬────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │  Session Invalidation   │
                         │    & Rate Limiting      │
                         └────────────┬────────────┘
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │   RBAC Permission Gate  │
                         │  (Role: ADMIN/INSPECTOR)│
                         └────────────┬────────────┘
                                      │
         ┌────────────────────────────┼────────────────────────────┐
         ▼                            ▼                            ▼
┌──────────────────┐         ┌──────────────────┐         ┌──────────────────┐
│ Risk Dashboard   │         │ AI Risk Copilot  │         │ Admin Center     │
│ (View / Analyze) │         │ (Vehicle/RAG)    │         │ (Users/ML/Audit) │
└────────┬─────────┘         └────────┬─────────┘         └────────┬─────────┘
         │                            │                            │
         └────────────────────────────┼────────────────────────────┘
                                      ▼
                         ┌─────────────────────────┐
                         │  Central Audit Service  │
                         │ (IP Hashing & Logging)  │
                         └─────────────────────────┘
```

---

## 2. Authentication & Session Invalidation

- **HttpOnly Secure Cookies:** Authentication session tokens are transmitted solely via `HttpOnly`, `SameSite=Lax` cookies (`access_token`).
- **Session Revocation (`UserSession`):** Every login creates a database session tracking token hash, user agent, IP hash, and expiration timestamp.
- **Immediate Invalidation:** Logging out or changing passwords invalidates all active sessions in the database, blocking any re-use of tokens.

---

## 3. Role-Based Access Control (RBAC) Matrix

| Operation / Capability | Permission Key | Inspector | Administrator |
|---|---|:---:|:---:|
| View Risk Dashboard & Telemetry | `VIEW_DASHBOARD` | ✅ | ✅ |
| Search & Live Vehicle Analysis | `ANALYZE_VEHICLE` | ✅ | ✅ |
| View Suspicious Vehicle Registry | `VIEW_SUSPICIOUS` | ✅ | ✅ |
| Query AI Risk Copilot & RAG | `USE_COPILOT` | ✅ | ✅ |
| Inspect Verifiable Evidence Chains | `VIEW_RECOMMENDATIONS` | ✅ | ✅ |
| User Provisioning & Status Toggle | `MANAGE_USERS` | ❌ (403) | ✅ |
| Role Modification (`admin`/`inspector`) | `CHANGE_USER_ROLES` | ❌ (403) | ✅ |
| View Immutable Audit Trails | `VIEW_AUDIT_LOGS` | ❌ (403) | ✅ |
| Retrain Isolation Forest ML Model | `TRAIN_ML` | ❌ (403) | ✅ |
| Ingest/Rebuild RAG Vector Store | `MANAGE_KNOWLEDGE_BASE` | ❌ (403) | ✅ |
| Trigger Database Batch Sync | `BATCH_SYNC` | ❌ (403) | ✅ |
| View Backend Health Diagnostics | `VIEW_SYSTEM_HEALTH` | ❌ (403) | ✅ |

---

## 4. Admin Control Center (`/admin`)

- **Enterprise Overview:** Real-time statistics on active users, active sessions, total audit events, and ML/RAG engine health.
- **User Management (`/admin/users`):** Searchable user directory, instant account activation/deactivation, role toggle dropdown, and user provisioning modal.
- **Last-Admin Protection:** Server-side validation prevents deleting, deactivating, or demoting the final active administrator.
- **Audit Logs (`/admin/audit-logs`):** Paginated, filterable enterprise audit log tracking actions (`LOGIN`, `FAILED_LOGIN`, `USER_CREATED`, `USER_STATUS_CHANGED`, `PASSWORD_CHANGED`, `VEHICLE_ANALYZED`).
- **AI & ML Engine Management:** Safe administrative triggers for Isolation Forest retraining, vector re-indexing, and batch profile synchronization with confirmation modals.
- **System Health Diagnostics:** Real-time health monitoring of Database, ML model, Vector Store, and LLM providers.

---

## 5. Security Hardening & Rate Limiting

- **Rate Limiting (`InMemoryRateLimiter`):**
  - Login endpoint: Maximum 15 attempts / 60 seconds per IP.
  - Registration: Maximum 10 attempts / 60 seconds.
- **Security Headers Middleware:**
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: DENY`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy: geolocation=(), microphone=(), camera=()`
- **Public Registration Safety:** Public registrations are strictly assigned `inspector` role; requests attempting to pass `role="admin"` are automatically forced to `inspector`.
- **IP Address Privacy:** Client IP addresses in audit logs are hashed using SHA-256 for privacy protection.

---

## 6. Frontend Route Protection & Profile Modal

- **`AdminRoute.jsx`:** Protects `/admin` routes. Non-administrators are redirected to `/403` Access Denied.
- **`Forbidden.jsx` (`/403`):** Access Denied page with navigation back to Dashboard.
- **`ProfileModal.jsx`:** Accessible from Navbar to view profile identity and securely change password with old password verification.
