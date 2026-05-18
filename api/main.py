from fastapi import FastAPI, Depends, HTTPException, Request, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from contextlib import asynccontextmanager
from typing import Optional
from datetime import datetime, timedelta
import json
import uuid
import asyncio
import os

from models import Task, TaskStatus, TaskPriority, get_db, init_db
from schemas import TaskCreate, TaskResponse, TaskListResponse, TaskStats
from rate_limiter import rate_limiter, check_rate_limit, get_client_id
from ws_manager import ws_manager

from celery import Celery

CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "redis://localhost:6379/0")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", "redis://localhost:6379/1")

celery_app = Celery("task_queue", broker=CELERY_BROKER_URL, backend=CELERY_RESULT_BACKEND)
celery_app.conf.update(
    task_queues={
        "high":   {"exchange": "high",   "routing_key": "high"},
        "medium": {"exchange": "medium", "routing_key": "medium"},
        "low":    {"exchange": "low",    "routing_key": "low"},
    },
    task_default_queue="medium",
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    await rate_limiter.connect()
    task = asyncio.create_task(broadcast_stats_periodically())
    yield
    task.cancel()
    await rate_limiter.disconnect()


app = FastAPI(
    title="Distributed Task Queue System",
    description="A production-grade task queue with priority, retries, rate limiting & WebSockets",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def get_stats_data(db: AsyncSession) -> dict:
    result = await db.execute(
        select(Task.status, func.count(Task.id)).group_by(Task.status)
    )
    counts = {row[0]: row[1] for row in result.fetchall()}
    total = sum(counts.values())

    duration_result = await db.execute(
        select(func.avg(
            func.extract("epoch", Task.completed_at) - func.extract("epoch", Task.started_at)
        )).where(
            and_(Task.status == TaskStatus.SUCCESS,
                 Task.completed_at.isnot(None),
                 Task.started_at.isnot(None))
        )
    )
    avg_duration = duration_result.scalar()

    one_min_ago = datetime.utcnow() - timedelta(minutes=1)
    tpm_result = await db.execute(
        select(func.count(Task.id)).where(Task.created_at >= one_min_ago)
    )
    tasks_per_minute = tpm_result.scalar() or 0

    return {
        "total": total,
        "pending": counts.get(TaskStatus.PENDING, 0),
        "running": counts.get(TaskStatus.RUNNING, 0),
        "success": counts.get(TaskStatus.SUCCESS, 0),
        "failed": counts.get(TaskStatus.FAILED, 0),
        "retrying": counts.get(TaskStatus.RETRYING, 0),
        "cancelled": counts.get(TaskStatus.CANCELLED, 0),
        "avg_duration_seconds": round(avg_duration, 2) if avg_duration else None,
        "tasks_per_minute": tasks_per_minute,
    }


async def broadcast_stats_periodically():
    from models import AsyncSessionLocal
    while True:
        try:
            if ws_manager.active_connections:
                async with AsyncSessionLocal() as db:
                    stats = await get_stats_data(db)
                await ws_manager.send_stats_update(stats)
        except Exception as e:
            print(f"Stats broadcast error: {e}")
        await asyncio.sleep(3)


# ─── Task Endpoints ───────────────────────────────────────────────────────────

@app.post("/tasks", response_model=TaskResponse, status_code=201, tags=["Tasks"])
async def create_task(
    task_in: TaskCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    client_id, _ = await check_rate_limit(request, "submit")

    task = Task(
        id=uuid.uuid4(),
        name=task_in.name,
        task_type=task_in.task_type,
        payload=json.dumps(task_in.payload) if task_in.payload else None,
        priority=task_in.priority,
        max_retries=task_in.max_retries,
        client_id=client_id,
        status=TaskStatus.PENDING,
        created_at=datetime.utcnow(),
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)

    queue_map = {
        TaskPriority.HIGH: "high",
        TaskPriority.MEDIUM: "medium",
        TaskPriority.LOW: "low",
    }
    celery_task = celery_app.send_task(
        "execute_task",
        args=[str(task.id)],
        queue=queue_map[task.priority],
    )

    task.celery_task_id = celery_task.id
    await db.commit()
    await db.refresh(task)

    await ws_manager.send_task_update(str(task.id), {
        "id": str(task.id),
        "name": task.name,
        "status": task.status,
        "priority": task.priority,
        "created_at": task.created_at.isoformat(),
    })

    return task


@app.get("/tasks", response_model=TaskListResponse, tags=["Tasks"])
async def list_tasks(
    request: Request,
    status: Optional[TaskStatus] = None,
    priority: Optional[TaskPriority] = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    await check_rate_limit(request, "default")

    query = select(Task)
    if status:
        query = query.where(Task.status == status)
    if priority:
        query = query.where(Task.priority == priority)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar()

    query = query.order_by(Task.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    result = await db.execute(query)
    tasks = result.scalars().all()

    return TaskListResponse(tasks=tasks, total=total, page=page, page_size=page_size)


@app.get("/tasks/stats/summary", response_model=TaskStats, tags=["Stats"])
async def get_stats(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    await check_rate_limit(request, "default")
    return await get_stats_data(db)


@app.get("/tasks/{task_id}", response_model=TaskResponse, tags=["Tasks"])
async def get_task(
    task_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    await check_rate_limit(request, "default")
    task = await db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@app.delete("/tasks/{task_id}", tags=["Tasks"])
async def cancel_task(
    task_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    await check_rate_limit(request, "default")
    task = await db.get(Task, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    if task.status not in [TaskStatus.PENDING, TaskStatus.RETRYING]:
        raise HTTPException(status_code=400, detail=f"Cannot cancel task with status: {task.status}")

    task.status = TaskStatus.CANCELLED
    task.completed_at = datetime.utcnow()
    await db.commit()
    await db.refresh(task)

    await ws_manager.send_task_update(str(task.id), {
        "id": str(task.id),
        "name": task.name,
        "status": task.status,
    })
    return {"message": "Task cancelled", "task_id": str(task_id)}


# ─── WebSocket ────────────────────────────────────────────────────────────────

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            if msg.get("action") == "subscribe" and msg.get("task_id"):
                ws_manager.subscribe_to_task(websocket, msg["task_id"])
                await websocket.send_text(json.dumps({
                    "type": "subscribed",
                    "task_id": msg["task_id"]
                }))
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


@app.get("/health", tags=["System"])
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}