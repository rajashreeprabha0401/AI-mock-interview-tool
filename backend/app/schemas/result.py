import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class ResultOut(BaseModel):
    id: uuid.UUID
    answer_id: uuid.UUID
    score: Optional[float] = None
    relevance_score: Optional[float] = None
    clarity_score: Optional[float] = None
    depth_score: Optional[float] = None
    feedback: Optional[str] = None
    ideal_answer: Optional[str] = None
    strengths: Optional[list[str]] = None
    improvements: Optional[list[str]] = None
    overall_score: Optional[float] = None
    overall_feedback: Optional[str] = None
    hire_recommendation: Optional[str] = None
    evaluated_at: datetime
    # Joined fields for frontend display
    question_text: Optional[str] = None
    answer_text: Optional[str] = None

    model_config = {"from_attributes": True}


class InterviewResultsResponse(BaseModel):
    interview_id: uuid.UUID
    role: str
    status: str
    total_questions: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    overall_score: Optional[float] = None
    hire_recommendation: Optional[str] = None
    results: list[ResultOut]
