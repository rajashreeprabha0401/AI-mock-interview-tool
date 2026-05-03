# AI Mock Interview — FINAL PROJECT

## Run பண்ண Steps

### Window 1 — Backend
```powershell
cd "$env:USERPROFILE\Downloads\ai-mock-interview-FINAL\backend"
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
pip install bcrypt==4.0.1
python seed_roles.py
python create_hr.py
uvicorn app.main:app --reload --port 8000
```

### Window 2 — Frontend
```powershell
cd "$env:USERPROFILE\Downloads\ai-mock-interview-FINAL\frontend"
npm install
npm run dev
```

## URLs
- Candidate: http://localhost:3000
- HR Portal: http://localhost:3000/hr-login (Password: hr123456)

## Fixes
- Question count bug fixed
- AI scoring works
- HR login works
- Theme changes work
- HR Portal link in sidebar
