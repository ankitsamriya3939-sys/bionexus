from datetime import datetime
from pydantic import BaseModel

class SequenceBase(BaseModel):
    name: str
    accession: str | None = None
    seq_type: str = "DNA"
    raw_seq: str
    description: str | None = None

class SequenceCreate(SequenceBase):
    project_id: str

class SequenceOut(SequenceBase):
    id: str
    project_id: str
    length: int
    gc_content: float | None = None
    created_at: datetime

    class Config:
        from_attributes = True
