from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.interview import InterviewRole
from app.schemas.interview import InterviewRoleOut

router = APIRouter(prefix="/roles", tags=["Roles"])


@router.get("/", response_model=list[InterviewRoleOut])
async def list_roles(db: AsyncSession = Depends(get_db)):
    """Return all active interview roles (no auth required)."""
    result = await db.execute(
        select(InterviewRole).where(InterviewRole.is_active == True)  # noqa: E712
    )
    return result.scalars().all()
