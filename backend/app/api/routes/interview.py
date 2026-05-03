import uuid
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user_id
from app.models.answer import Answer
from app.models.interview import Interview, InterviewRole
from app.models.result import Result
from app.schemas.interview import (
    GenerateQuestionRequest, GenerateQuestionResponse,
    StartInterviewRequest, StartInterviewResponse,
    SubmitAnswerRequest, SubmitAnswerResponse,
)
from app.schemas.result import InterviewResultsResponse
from app.services import interview_service

router = APIRouter(prefix="/interview", tags=["Interview"])


@router.post("/start-interview", response_model=StartInterviewResponse, status_code=201)
async def start_interview(payload: StartInterviewRequest, db: AsyncSession = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    interview = await interview_service.start_interview(db=db, user_id=uuid.UUID(user_id), role_id=payload.role_id, total_questions=payload.total_questions)
    return StartInterviewResponse(interview_id=interview.id, role=interview.role.title, difficulty=interview.role.difficulty, total_questions=interview.total_questions, status=interview.status, started_at=interview.started_at)


@router.post("/generate-question", response_model=GenerateQuestionResponse)
async def generate_question(payload: GenerateQuestionRequest, db: AsyncSession = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    question = await interview_service.generate_question(db=db, interview_id=payload.interview_id, user_id=uuid.UUID(user_id), question_number=payload.question_number)
    return GenerateQuestionResponse(question_id=question.id, question_text=question.question_text, question_type=question.question_type, order_index=question.order_index, interview_id=question.interview_id)


@router.post("/submit-answer", response_model=SubmitAnswerResponse)
async def submit_answer(payload: SubmitAnswerRequest, db: AsyncSession = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    data = await interview_service.submit_answer(db=db, interview_id=payload.interview_id, question_id=payload.question_id, user_id=uuid.UUID(user_id), answer_text=payload.answer_text, time_taken_sec=payload.time_taken_sec)
    return SubmitAnswerResponse(**data)


@router.get("/get-results/{interview_id}", response_model=InterviewResultsResponse)
async def get_results(interview_id: uuid.UUID, db: AsyncSession = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    data = await interview_service.get_interview_results(db=db, interview_id=interview_id, user_id=uuid.UUID(user_id))
    return InterviewResultsResponse(**data)


@router.get("/user-stats")
async def get_user_stats(db: AsyncSession = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    uid = uuid.UUID(user_id)
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)

    total = (await db.execute(select(func.count()).select_from(Interview).where(Interview.user_id == uid))).scalar() or 0
    completed = (await db.execute(select(func.count()).select_from(Interview).where(Interview.user_id == uid, Interview.status == "completed"))).scalar() or 0
    weekly = (await db.execute(select(func.count()).select_from(Interview).where(Interview.user_id == uid, Interview.created_at >= week_ago))).scalar() or 0

    avg_row = (await db.execute(select(func.avg(Result.score)).where(Result.user_id == uid, Result.score.isnot(None)))).scalar()
    avg_score = round(float(avg_row), 1) if avg_row else None

    best_row = (await db.execute(select(func.max(Result.score)).where(Result.user_id == uid, Result.score.isnot(None)))).scalar()
    best_score = round(float(best_row), 1) if best_row else None

    recent_rows = (await db.execute(
        select(Interview, InterviewRole)
        .join(InterviewRole, Interview.role_id == InterviewRole.id)
        .where(Interview.user_id == uid)
        .order_by(Interview.created_at.desc())
        .limit(5)
    )).all()

    recent_interviews = []
    for iv, role in recent_rows:
        score_row = (await db.execute(select(func.avg(Result.score)).where(Result.interview_id == iv.id, Result.score.isnot(None)))).scalar()
        overall = round(float(score_row), 1) if score_row else None
        recent_interviews.append({
            "interview_id": str(iv.id),
            "role": role.title,
            "difficulty": role.difficulty,
            "status": iv.status,
            "total_questions": iv.total_questions,
            "overall_score": overall,
            "created_at": iv.created_at.isoformat() if iv.created_at else None,
            "completed_at": iv.completed_at.isoformat() if iv.completed_at else None,
        })

    return {
        "total_interviews": total,
        "completed_interviews": completed,
        "weekly_count": weekly,
        "avg_score": avg_score,
        "best_score": best_score,
        "streak": weekly,
        "recent_interviews": recent_interviews,
    }
