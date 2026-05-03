import asyncio
from app.core.database import AsyncSessionLocal
from app.models.user import User
from app.core.security import get_password_hash
from sqlalchemy import select

async def create_hr():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.email == 'hr@company.com'))
        existing = result.scalar_one_or_none()
        if existing:
            existing.password_hash = get_password_hash('hr123456')
            await db.commit()
            print('HR user password reset! Email: hr@company.com | Password: hr123456')
        else:
            hr = User(full_name='HR Admin', email='hr@company.com',
                     password_hash=get_password_hash('hr123456'), role='hr', is_active=True)
            db.add(hr)
            await db.commit()
            print('HR user created! Email: hr@company.com | Password: hr123456')

asyncio.run(create_hr())
