import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Result(Base):
    __tablename__ = "results"
    __table_args__ = (
        UniqueConstraint("answer_id", name="uq_result_per_answer"),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    interview_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("interviews.id", ondelete="CASCADE"), nullable=False, index=True
    )
    answer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("answers.id", ondelete="CASCADE"), nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Per-answer scores (0-10)
    score: Mapped[float | None] = mapped_column(Numeric(4, 2), nullable=True)
    relevance_score: Mapped[float | None] = mapped_column(Numeric(4, 2), nullable=True)
    clarity_score: Mapped[float | None] = mapped_column(Numeric(4, 2), nullable=True)
    depth_score: Mapped[float | None] = mapped_column(Numeric(4, 2), nullable=True)

    # AI feedback
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    ideal_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    strengths: Mapped[list[str] | None] = mapped_column(ARRAY(Text), nullable=True)
    improvements: Mapped[list[str] | None] = mapped_column(ARRAY(Text), nullable=True)

    # Overall interview summary (filled after last question)
    overall_score: Mapped[float | None] = mapped_column(Numeric(4, 2), nullable=True)
    overall_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    hire_recommendation: Mapped[str | None] = mapped_column(String(20), nullable=True)

    ai_model: Mapped[str | None] = mapped_column(String(80), nullable=True)
    evaluated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Relationships
    interview: Mapped["Interview"] = relationship(back_populates="results")     # noqa: F821
    answer: Mapped["Answer"] = relationship(back_populates="result")            # noqa: F821
    user: Mapped["User"] = relationship(back_populates="results")               # noqa: F821
