# Deployment & Production Architecture Guide

---

## 1. Single-Command Docker Orchestration

To run the complete platform in production containers:

```bash
# 1. Clone repository
git clone <repo_url> && cd gst_proj

# 2. Copy and configure environment variables
cp .env.example .env

# 3. Launch with Docker Compose
docker-compose up -d --build

# 4. Verify running health
curl -f http://localhost/health
```

---

## 2. Local Manual Deployment

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install
npm run build
npm run preview -- --port 5173
```
