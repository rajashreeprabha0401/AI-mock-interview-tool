from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import create_tables

# Import all models so SQLAlchemy registers them before create_all
import app.models.user        # noqa: F401
import app.models.interview   # noqa: F401
import app.models.question    # noqa: F401
import app.models.answer      # noqa: F401
import app.models.result      # noqa: F401

from app.api.routes import auth, interview, roles, admin


# ── Lifespan (startup / shutdown) ────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🚀  Starting up — creating DB tables if not exist...")
    await create_tables()
    print("✅  DB tables ready.")
    yield
    print("🛑  Shutting down.")


# ── App instance ─────────────────────────────────────────────
app = FastAPI(
    title="AI Mock Interview API",
    description="Backend for the AI-powered mock interview system",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ── Routers ───────────────────────────────────────────────────
app.include_router(auth.router,      prefix="/api")
app.include_router(interview.router, prefix="/api")
app.include_router(roles.router,     prefix="/api")
app.include_router(admin.router,     prefix="/api")


# ── Health check ─────────────────────────────────────────────
@app.get("/", tags=["Health"])
async def root():
    return {"status": "ok", "message": "AI Mock Interview API is running 🎯"}


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy", "version": "1.0.0"}
