# AI Mock Interview — FastAPI Backend

## Quick Start

### 1. Setup environment
```bash
cd interview-backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Configure environment variables
```bash
cp .env.example .env
# Edit .env — set your DATABASE_URL and SECRET_KEY
```

### 3. Run the server
```bash
uvicorn app.main:app --reload --port 8000
```

### 4. Seed interview roles (first time only)
```bash
python seed_roles.py
```

### 5. Open API docs
- Swagger UI  → http://localhost:8000/docs
- ReDoc       → http://localhost:8000/redoc
- Health      → http://localhost:8000/health

---

## API Routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ❌ | Register new user |
| POST | `/api/auth/login` | ❌ | Login → get JWT token |
| GET  | `/api/roles/` | ❌ | List interview roles |
| POST | `/api/interview/start-interview` | ✅ | Start new session |
| POST | `/api/interview/generate-question` | ✅ | Get question N |
| POST | `/api/interview/submit-answer` | ✅ | Submit answer |
| GET  | `/api/interview/get-results/{id}` | ✅ | Fetch results |

## Interview Flow
```
Register/Login → Get JWT
    ↓
POST /start-interview  → interview_id
    ↓
POST /generate-question (question_number: 1)
    ↓
POST /submit-answer
    ↓
Repeat for questions 2..N
    ↓
GET /get-results/{interview_id}
```

## Day 2 — AI Integration
Edit `app/services/ai_service.py` to implement:
- `generate_question_with_ai()` — OpenRouter prompt
- `evaluate_answer_with_ai()` — scoring + feedback
- `generate_overall_feedback_with_ai()` — summary
