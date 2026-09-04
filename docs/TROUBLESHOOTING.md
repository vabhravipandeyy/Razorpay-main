# Troubleshooting & Operational Recovery Guide

---

## 1. Common Diagnostics

| Issue | Root Cause | Solution |
|---|---|---|
| **Database Connection Error** | MySQL service stopped or credentials mismatch | Verify MySQL status with `mysqladmin ping` or check `DATABASE_URL` in `.env`. |
| **403 Forbidden on Admin Endpoint** | User authenticated as `inspector` role | Ensure user has `admin` role assigned via `/admin` or database. |
| **LLM Offline Fallback Mode** | No external API key provided in `.env` | System automatically defaults to offline deterministic rule engine with zero downtime. |
| **Session Expired / Unauthorized** | Cookie expired or invalidated | Log back in at `/login` to generate new HttpOnly session cookie. |
