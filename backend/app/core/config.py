from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # Set extra="ignore" to prevent crashes from undefined env variables
    model_config = SettingsConfigDict(
        env_file=".env", 
        env_file_encoding="utf-8",
        extra="ignore" 
    )

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/interview_db"

    # Auth
    SECRET_KEY: str = "change-this-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # AI
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    AI_MODEL: str = "openai/gpt-4o-mini"

    # CORS
    FRONTEND_URL: str = "http://localhost:3000"

settings = Settings()