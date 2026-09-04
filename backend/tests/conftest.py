import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.core.base import Base
from app.core.database import get_db
from app.main import app
from app.models.user import User
from app.core.security import hash_password, create_access_token

# Use StaticPool so all threads/sessions share the same SQLite in-memory database
TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=test_engine,
)


@pytest.fixture(scope="function")
def db():
    """Create a fresh database schema for every test function."""
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def test_user(db):
    """Create a standard test inspector user."""
    user = User(
        username="test_inspector",
        email="inspector@gst.gov.in",
        hashed_password=hash_password("inspector123"),
        full_name="GST Inspector",
        role="inspector",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture(scope="function")
def auth_headers(test_user):
    """Generate valid Bearer authorization header."""
    token = create_access_token(data={"sub": str(test_user.id), "username": test_user.username, "role": test_user.role})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def admin_user(db):
    """Create a standard test admin user."""
    user = User(
        username="test_admin",
        email="admin@gst.gov.in",
        hashed_password=hash_password("admin123"),
        full_name="GST Administrator",
        role="admin",
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture(scope="function")
def admin_headers(admin_user):
    """Generate valid Bearer authorization header for admin user."""
    token = create_access_token(data={"sub": str(admin_user.id), "username": admin_user.username, "role": admin_user.role})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="function")
def client(db):
    """FastAPI TestClient with overridden database dependency."""
    def override_get_db():
        session = TestingSessionLocal()
        try:
            yield session
        finally:
            session.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
