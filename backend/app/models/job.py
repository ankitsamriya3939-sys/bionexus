import uuid
from datetime import datetime
from sqlalchemy import String, Text, Integer, DateTime, ForeignKey, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base

class Job(Base):
    __tablename__ = "jobs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id: Mapped[str] = mapped_column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    tool_name: Mapped[str] = mapped_column(String(100), nullable=False)  # blast, alignment, translation, orf_finder
    status: Mapped[str] = mapped_column(String(50), default="PENDING")   # PENDING, RUNNING, COMPLETED, FAILED
    progress: Mapped[int] = mapped_column(Integer, default=0)            # 0 to 100%
    input_params: Mapped[dict] = mapped_column(JSON, default=dict)
    result_data: Mapped[dict] = mapped_column(JSON, nullable=True)
    error_message: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    completed_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    project = relationship("Project", back_populates="jobs")
