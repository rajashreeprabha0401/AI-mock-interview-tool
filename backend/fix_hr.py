import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from passlib.context import CryptContext

DATABASE_URL = "postgresql+asyncpg://postgres:admin123@localhost:5432/interview_db"

async def fix():
    engine = create_async_engine(DATABASE_URL)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")
    hashed = ctx.hash("stepup techers")

    async with async_session() as db:
        await db.execute(text("DELETE FROM users WHERE email = 'rajashreeprabha1@gmail.com' OR email = 'hr@company.com'"))
        await db.execute(text("""
            INSERT INTO users (id, full_name, email, password_hash, role, is_active, created_at, updated_at)
            VALUES (gen_random_uuid(), 'HR Admin', 'rajashreeprabha1@gmail.com', :pwd, 'hr', true, NOW(), NOW())
        """), {"pwd": hashed})
        await db.commit()

        result = await db.execute(text("SELECT email, role FROM users WHERE email='rajashreeprabha1@gmail.com'"))
        row = result.fetchone()
        ok = ctx.verify("stepup techers", hashed)
        print(f"✅ HR user ready!")
        print(f"   Email: rajashreeprabha1@gmail.com")
        print(f"   Password: stepup techers")
        print(f"   Role: {row[1]}")
        print(f"   Password verify: {'OK' if ok else 'FAIL'}")

    await engine.dispose()

asyncio.run(fix())
