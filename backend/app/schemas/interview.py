import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


# ── Interview Role ───────────────────────────────────────────
class InterviewRoleOut(BaseModel):
    id: uuid.UUID
    title: str
    category: str
    difficulty: str
    description: Optional[str] = None

    model_config = {"from_attributes": True}


# ── Start Interview ──────────────────────────────────────────
class StartInterviewRequest(BaseModel):
    role_id: uuid.UUID = Field(..., description="UUID of the interview role")
    total_questions: int = Field(default=5, ge=1, le=100)


class StartInterviewResponse(BaseModel):
    interview_id: uuid.UUID
    role: str
    difficulty: str
    total_questions: int
    status: str
    started_at: datetime

    model_config = {"from_attributes": True}


# ── Generate Question ────────────────────────────────────────
class GenerateQuestionRequest(BaseModel):
    interview_id: uuid.UUID
    question_number: int = Field(..., ge=1, description="Which question to generate (1-based)")


class GenerateQuestionResponse(BaseModel):
    question_id: uuid.UUID
    question_text: str
    question_type: str
    order_index: int
    interview_id: uuid.UUID

    model_config = {"from_attributes": True}


# ── Submit Answer ────────────────────────────────────────────
class SubmitAnswerRequest(BaseModel):
    interview_id: uuid.UUID
    question_id: uuid.UUID
    answer_text: str = Field(..., min_length=1, max_length=5000)
    time_taken_sec: Optional[int] = None


class SubmitAnswerResponse(BaseModel):
    answer_id: uuid.UUID
    message: str
    questions_answered: int
    total_questions: int
    is_complete: bool

    model_config = {"from_attributes": True}


# ── Interview Status ─────────────────────────────────────────
class InterviewOut(BaseModel):
    id: uuid.UUID
    status: str
    total_questions: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    model_config = {"from_attributes": True}
