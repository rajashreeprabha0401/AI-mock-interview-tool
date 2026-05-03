import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password, get_current_user_id
from app.models.user import User
from app.schemas.user import TokenResponse, UserLoginRequest, UserOut, UserRegisterRequest

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/register", response_model=UserOut, status_code=201)
async def register(payload: UserRegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == payload.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(full_name=payload.full_name, email=payload.email, password_hash=hash_password(payload.password))
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/login", response_model=TokenResponse)
async def login(payload: UserLoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is inactive. Contact HR.")
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {"access_token": token, "token_type": "bearer", "user": user}


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


@router.post("/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if len(payload.new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    user.password_hash = hash_password(payload.new_password)
    await db.commit()
    return {"message": "Password changed successfully"}


class UpdateProfileRequest(BaseModel):
    full_name: str


@router.put("/profile")
async def update_profile(
    payload: UpdateProfileRequest,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    result = await db.execute(select(User).where(User.id == uuid.UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.full_name = payload.full_name.strip()
    await db.commit()
    await db.refresh(user)
    return UserOut.model_validate(user)


@router.delete("/account")
async def delete_account(
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(get_current_user_id),
):
    from sqlalchemy import delete as sql_delete
    from app.models.interview import Interview
    from app.models.result import Result
    from app.models.answer import Answer
    from app.models.question import Question

    uid = uuid.UUID(user_id)
    interviews = (await db.execute(select(Interview.id).where(Interview.user_id == uid))).scalars().all()
    for iv_id in interviews:
        await db.execute(sql_delete(Result).where(Result.interview_id == iv_id))
        await db.execute(sql_delete(Answer).where(Answer.interview_id == iv_id))
        await db.execute(sql_delete(Question).where(Question.interview_id == iv_id))
    await db.execute(sql_delete(Interview).where(Interview.user_id == uid))
    await db.execute(sql_delete(User).where(User.id == uid))
    await db.commit()
    return {"message": "Account deleted successfully"}
