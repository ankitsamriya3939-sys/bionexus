import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    PROJECT_NAME: str = "BioNexus Studio API"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api"
    
    # Database: SQLite async by default for zero-config local dev; set to postgresql+asyncpg://... for production
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite+aiosqlite:///{BASE_DIR}/bionexus.db")
    
    # JWT Auth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "bionexus_secret_development_key_super_secure_98471203847")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Flat / Object Storage (S3-compatible structure)
    STORAGE_DIR: Path = Path(os.getenv("STORAGE_DIR", str(BASE_DIR / "storage" / "objects")))
    
    # NCBI Entrez E-Utilities API Key (unlocks 10 req/s limit)
    NCBI_API_KEY: str = os.getenv("NCBI_API_KEY", "")
    
    # CORS Origins (allow frontend dev server, backend self-hosted ports, and custom domain)
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5000",
        "http://localhost:8000",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5000",
        "http://127.0.0.1:8000",
        "https://bionexusstudio.ai",
    ]

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Ensure object storage directory exists
settings.STORAGE_DIR.mkdir(parents=True, exist_ok=True)
