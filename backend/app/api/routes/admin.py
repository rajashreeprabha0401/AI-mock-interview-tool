"""
Admin/HR routes — requires role == admin or hr
"""
import uuid
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select, delete as sql_delete, update as sql_update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_token, oauth2_scheme
from app.models.interview import Interview, InterviewRole
from app.models.result import Result
from app.models.user import User
from app.models.answer import Answer
from app.models.question import Question

router = APIRouter(prefix="/admin", tags=["Admin"])


async def require_admin(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> User:
    payload = decode_token(token)
    role: str = payload.get("role", "")
    if role not in ("admin", "hr"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin or HR access required")
    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/dashboard")
async def get_dashboard(db: AsyncSession = Depends(get_db), _admin: User = Depends(require_admin)):
    total_users = (await db.execute(select(func.count()).select_from(User).where(User.role == "candidate"))).scalar_one()
    active_users = (await db.execute(select(func.count()).select_from(User).where(User.is_active.is_(True), User.role == "candidate"))).scalar_one()
    total_interviews = (await db.execute(select(func.count()).select_from(Interview))).scalar_one()
    completed_interviews = (await db.execute(select(func.count()).select_from(Interview).where(Interview.status == "completed"))).scalar_one()
    total_results = (await db.execute(select(func.count()).select_from(Result))).scalar_one()

    avg_score_row = (await db.execute(select(func.avg(Result.score)).where(Result.score.isnot(None)))).scalar_one()
    avg_overall_score = round(float(avg_score_row), 2) if avg_score_row else None

    hire_rows = (await db.execute(
        select(Result.hire_recommendation, func.count().label("cnt"))
        .where(Result.hire_recommendation.isnot(None))
        .group_by(Result.hire_recommendation)
    )).all()

    hire_dist = {"strong_yes": 0, "yes": 0, "no": 0, "strong_no": 0, "maybe": 0, "pending": 0}
    for rec, cnt in hire_rows:
        key = (rec or "").lower().replace(" ", "_").replace("-", "_")
        if key in hire_dist:
            hire_dist[key] = cnt

    # Recent activity — all interviews with candidate info
    recent_rows = (await db.execute(
        select(Interview, User, InterviewRole)
        .join(User, Interview.user_id == User.id)
        .join(InterviewRole, Interview.role_id == InterviewRole.id)
        .order_by(Interview.created_at.desc())
        .limit(100)
    )).all()

    activity = []
    for interview, user, role in recent_rows:
        score_row = (await db.execute(
            select(func.avg(Result.score)).where(Result.interview_id == interview.id, Result.score.isnot(None))
        )).scalar_one()
        overall = round(float(score_row), 2) if score_row else None

        hire_row = (await db.execute(
            select(Result.hire_recommendation)
            .where(Result.interview_id == interview.id, Result.hire_recommendation.isnot(None))
            .limit(1)
        )).scalar_one_or_none()

        activity.append({
            "interview_id": str(interview.id),
            "user_name": user.full_name,
            "user_email": user.email,
            "user_id": str(user.id),
            "role_title": role.title,
            "status": interview.status,
            "overall_score": overall,
            "hire_recommendation": hire_row,
            "created_at": interview.created_at.isoformat() if interview.created_at else None,
            "completed_at": interview.completed_at.isoformat() if interview.completed_at else None,
        })

    # Candidates list
    all_users = (await db.execute(
        select(User).where(User.role == "candidate").order_by(User.created_at.desc())
    )).scalars().all()

    users = []
    for u in all_users:
        ic = (await db.execute(select(func.count()).select_from(Interview).where(Interview.user_id == u.id))).scalar() or 0
        cc = (await db.execute(select(func.count()).select_from(Interview).where(Interview.user_id == u.id, Interview.status == "completed"))).scalar() or 0
        avg = (await db.execute(select(func.avg(Result.score)).where(Result.user_id == u.id, Result.score.isnot(None)))).scalar()
        users.append({
            "id": str(u.id),
            "full_name": u.full_name,
            "email": u.email,
            "role": u.role,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "interview_count": ic,
            "completed_count": cc,
            "avg_score": round(float(avg), 2) if avg else None,
        })

    return {
        "stats": {
            "total_users": total_users,
            "active_users": active_users,
            "total_interviews": total_interviews,
            "completed_interviews": completed_interviews,
            "pending_interviews": total_interviews - completed_interviews,
            "avg_overall_score": avg_overall_score,
            "hire_distribution": hire_dist,
            "total_results": total_results,
        },
        "users": users,
        "recent_activity": activity,
    }


@router.patch("/interviews/{interview_id}/hire-decision")
async def update_hire_decision(
    interview_id: uuid.UUID,
    decision: dict,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    rec = decision.get("hire_recommendation")
    await db.execute(
        sql_update(Result).where(Result.interview_id == interview_id).values(hire_recommendation=rec)
    )
    await db.commit()
    return {"status": "updated", "hire_recommendation": rec}


@router.delete("/interviews/{interview_id}")
async def delete_interview(
    interview_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    await db.execute(sql_delete(Result).where(Result.interview_id == interview_id))
    await db.execute(sql_delete(Answer).where(Answer.interview_id == interview_id))
    await db.execute(sql_delete(Question).where(Question.interview_id == interview_id))
    await db.execute(sql_delete(Interview).where(Interview.id == interview_id))
    await db.commit()
    return {"status": "deleted"}


@router.delete("/candidates/{user_id}")
async def delete_candidate(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    # Get all interviews
    interviews = (await db.execute(select(Interview.id).where(Interview.user_id == user_id))).scalars().all()
    for iv_id in interviews:
        await db.execute(sql_delete(Result).where(Result.interview_id == iv_id))
        await db.execute(sql_delete(Answer).where(Answer.interview_id == iv_id))
        await db.execute(sql_delete(Question).where(Question.interview_id == iv_id))
    await db.execute(sql_delete(Interview).where(Interview.user_id == user_id))
    await db.execute(sql_delete(User).where(User.id == user_id))
    await db.commit()
    return {"status": "deleted"}


@router.post("/candidates/{user_id}/grant-permission")
async def grant_interview_permission(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_admin),
):
    # Re-activate the user
    await db.execute(sql_update(User).where(User.id == user_id).values(is_active=True))
    await db.commit()
    return {"status": "permission granted", "user_id": str(user_id)}


@router.patch("/candidates/{user_id}/toggle-active")
async def toggle_candidate_active(
    user_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = not user.is_active
    await db.commit()
    return {"id": str(user.id), "is_active": user.is_active}
