from datetime import datetime
from pydantic import BaseModel

class ProjectBase(BaseModel):
    title: str
    description: str | None = None

class ProjectCreate(ProjectBase):
    pass

class ProjectUpdate(BaseModel):
    title: str | None = None
    description: str | None = None

class ProjectOut(ProjectBase):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
