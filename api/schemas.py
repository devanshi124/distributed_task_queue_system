from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime
from uuid import UUID
from models import TaskStatus, TaskPriority


class TaskCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    task_type: str = Field(..., description="Type: send_email | process_data | generate_report | custom")
    payload: Optional[dict] = None
    priority: TaskPriority = TaskPriority.MEDIUM
    max_retries: int = Field(default=3, ge=0, le=10)


class TaskResponse(BaseModel):
    id: UUID
    name: str
    task_type: str
    payload: Optional[str]
    status: TaskStatus
    priority: TaskPriority
    retry_count: int
    max_retries: int
    client_id: str
    result: Optional[str]
    error: Optional[str]
    celery_task_id: Optional[str]
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]

    class Config:
        from_attributes = True


class TaskListResponse(BaseModel):
    tasks: list[TaskResponse]
    total: int
    page: int
    page_size: int


class TaskStats(BaseModel):
    total: int
    pending: int
    running: int
    success: int
    failed: int
    retrying: int
    cancelled: int
    avg_duration_seconds: Optional[float]
    tasks_per_minute: Optional[float]