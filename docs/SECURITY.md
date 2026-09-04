# Enterprise Security, RBAC & Hardening Architecture

**Project:** GST Suspicious Vehicle Detection System  
**Track:** AI Risk Manager  

---

## 1. Zero-Trust Security Baseline

1. **HttpOnly Session Cookies:** JWT access tokens are stored in `HttpOnly`, `SameSite=Lax` cookies, preventing client-side script token theft via XSS.
2. **Server-Side Session Revocation:** All active user sessions are tracked in the database with token hashes. Logging out or changing passwords immediately invalidates existing sessions.
3. **Role-Based Access Control (RBAC):** Strict segregation between `ADMIN` and `INSPECTOR` roles. Admin capabilities (user provisioning, ML retraining, RAG management, CSV data exports) are guarded with `@require_permission` decorators.
4. **Self-Protection Guard:** Server-side validation prevents deactivating, deleting, or demoting the final active administrator.
5. **Rate Limiting:** Sliding-window rate limiter enforcing max 15 login attempts per 60 seconds per IP address.
6. **Data Privacy:** Client IP addresses are hashed using SHA-256 before being written to immutable audit logs.
7. **HTTP Security Headers:** Injected across all responses:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `Referrer-Policy: strict-origin-when-cross-origin`
   - `Permissions-Policy: geolocation=(), microphone=(), camera=()`
