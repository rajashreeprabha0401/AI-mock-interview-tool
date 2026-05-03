"""
Run this once after starting the server to seed interview roles.
  python seed_roles.py
"""

import asyncio
from app.core.database import AsyncSessionLocal, create_tables
from app.models.interview import InterviewRole

import app.models.user       # noqa
import app.models.interview  # noqa
import app.models.question   # noqa
import app.models.answer     # noqa
import app.models.result     # noqa

ROLES = [
    {"title": "Frontend Developer",   "category": "Frontend", "difficulty": "medium"},
    {"title": "React Developer",      "category": "Frontend", "difficulty": "medium"},
    {"title": "Backend Developer",    "category": "Backend",  "difficulty": "medium"},
    {"title": "Full Stack Developer", "category": "Backend",  "difficulty": "hard"},
    {"title": "Data Analyst",         "category": "Data",     "difficulty": "medium"},
    {"title": "DevOps Engineer",      "category": "DevOps",   "difficulty": "hard"},
    {"title": "UI/UX Designer",       "category": "Design",   "difficulty": "easy"},
    {"title": "Python Developer",     "category": "Backend",  "difficulty": "medium"},
]


async def seed():
    await create_tables()
    async with AsyncSessionLocal() as db:
        for r in ROLES:
            role = InterviewRole(**r)
            db.add(role)
        await db.commit()
    print(f"✅  Seeded {len(ROLES)} interview roles.")


if __name__ == "__main__":
    asyncio.run(seed())
