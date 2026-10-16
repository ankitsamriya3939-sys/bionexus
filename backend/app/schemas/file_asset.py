from datetime import datetime
from pydantic import BaseModel

class FileAssetOut(BaseModel):
    id: str
    project_id: str
    filename: str
    file_key: str
    file_size: int
    mime_type: str
    file_type: str
    sha256_hash: str | None = None
    created_at: datetime
    download_url: str | None = None

    class Config:
        from_attributes = True
