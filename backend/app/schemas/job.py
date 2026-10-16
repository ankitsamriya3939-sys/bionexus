from datetime import datetime
from typing import Any
from pydantic import BaseModel

class JobCreate(BaseModel):
    project_id: str
    tool_name: str
    input_params: dict[str, Any] = {}

class JobOut(BaseModel):
    id: str
    project_id: str
    tool_name: str
    status: str
    progress: int
    input_params: dict[str, Any]
    result_data: dict[str, Any] | None = None
    error_message: str | None = None
    created_at: datetime
    completed_at: datetime | None = None

    class Config:
        from_attributes = True
