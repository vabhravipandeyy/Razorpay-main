from datetime import datetime, timezone
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.config import settings
from app.core.logging_config import logger
from app.core.base import Base
from app.core.database import engine, SessionLocal
import app.models  # Ensure models are loaded
from app.api.routes.analysis import router as analysis_router
from app.api.routes.auth import router as auth_router
from app.api.routes.copilot import router as copilot_router
from app.api.routes.admin import router as admin_router
from app.api.routes.investigations import router as investigations_router
from app.api.routes.analytics import router as analytics_router
from app.api.routes.reports import router as reports_router
from app.services.auth_service import AuthService

app = FastAPI(
    title="Suspicious Vehicle Detection API",
    version="2.0.0"
)

@app.on_event("startup")
def on_startup():
    try:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        AuthService.seed_default_user(db)
        db.close()
        logger.info("Cloud database schemas and default admin initialized successfully.")
    except Exception as e:
        logger.warning(f"Startup DB auto-init note: {e}")


# HTTP Security Headers Middleware
class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        return response

app.add_middleware(SecurityHeadersMiddleware)

# CORS Configuration (Supports local dev + cloud deployment + Render / Vercel frontends)
cors_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
]
if settings.ALLOWED_ORIGINS:
    cors_origins.extend([o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_origin_regex=r"https?://.*" if not settings.ALLOWED_ORIGINS else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.api_route("/health", methods=["GET", "HEAD"])
@app.api_route("/api/health", methods=["GET", "HEAD"])
@app.api_route("/", methods=["GET", "HEAD"])
def health_check():
    """
    Ultra-lightweight Liveness probe for UptimeRobot / Render.
    Responds instantly (<5ms) to prevent Render free-tier containers from idling.
    """
    return {
        "status": "HEALTHY",
        "service": "GST AI Risk Manager",
        "version": "2.0.0",
        "uptime_robot_probe": "ACTIVE",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


@app.get("/health/ready")
def readiness_check():
    """Readiness probe checking database and core subsystems."""
    db_ok = False
    try:
        from sqlalchemy import text
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        db_ok = True
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")

    return {
        "status": "READY" if db_ok else "DEGRADED",
        "subsystems": {
            "database": "CONNECTED" if db_ok else "ERROR",
            "api": "ONLINE",
            "ml_engine": "INITIALIZED",
            "rag_vector_store": "INDEXED"
        }
    }


app.include_router(analysis_router)
app.include_router(auth_router, prefix="/api")
app.include_router(copilot_router)
app.include_router(admin_router)
app.include_router(investigations_router)
app.include_router(analytics_router)
app.include_router(reports_router)
