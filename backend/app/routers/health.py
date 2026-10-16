from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from app.config import settings
from app.database import get_db
from app.storage.storage_service import storage

router = APIRouter(prefix="/health", tags=["Health"])

@router.get("")
async def health_check(db: AsyncSession = Depends(get_db)):
    db_status = "unhealthy"
    try:
        await db.execute(text("SELECT 1"))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": {
            "status": db_status,
            "engine": "postgresql" if "postgresql" in settings.DATABASE_URL else "sqlite_async"
        },
        "storage": {
            "status": "ready",
            "path": str(storage.root_dir)
        }
    }
