from sqlalchemy import Column, String, Integer, DateTime, Text, Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from datetime import datetime
import uuid
import enum
import os
import asyncio

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql+asyncpg://taskuser:taskpass@localhost:5432/taskqueue")

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


class TaskStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    RETRYING = "retrying"
    CANCELLED = "cancelled"


class TaskPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Task(Base):
    __tablename__ = "tasks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    task_type = Column(String(100), nullable=False)
    payload = Column(Text, nullable=True)
    status = Column(SAEnum(TaskStatus), default=TaskStatus.PENDING, nullable=False)
    priority = Column(SAEnum(TaskPriority), default=TaskPriority.MEDIUM, nullable=False)
    retry_count = Column(Integer, default=0)
    max_retries = Column(Integer, default=3)
    client_id = Column(String(100), nullable=False)
    result = Column(Text, nullable=True)
    error = Column(Text, nullable=True)
    celery_task_id = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    """Try to connect to DB with retries — waits for PostgreSQL to be ready."""
    max_retries = 10
    for attempt in range(max_retries):
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
            print("✅ Database connected and tables created.")
            return
        except Exception as e:
            print(f"⏳ DB not ready (attempt {attempt + 1}/{max_retries}): {e}")
            await asyncio.sleep(3)
    raise Exception("❌ Could not connect to database after multiple retries.")