
from fastapi import WebSocket
from typing import Dict, Set
import json
import asyncio


class WebSocketManager:
    def __init__(self):
        # All connected clients
        self.active_connections: Set[WebSocket] = set()
        # Per-task subscribers
        self.task_subscribers: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        # Clean up task subscriptions
        for task_id in list(self.task_subscribers.keys()):
            self.task_subscribers[task_id].discard(websocket)
            if not self.task_subscribers[task_id]:
                del self.task_subscribers[task_id]

    def subscribe_to_task(self, websocket: WebSocket, task_id: str):
        if task_id not in self.task_subscribers:
            self.task_subscribers[task_id] = set()
        self.task_subscribers[task_id].add(websocket)

    async def broadcast(self, message: dict):
        """Send to all connected clients."""
        if not self.active_connections:
            return
        data = json.dumps(message)
        dead = set()
        for ws in self.active_connections.copy():
            try:
                await ws.send_text(data)
            except Exception:
                dead.add(ws)
        for ws in dead:
            self.disconnect(ws)

    async def send_task_update(self, task_id: str, task_data: dict):
        """Send task-specific update to subscribers + broadcast to dashboard."""
        message = {"type": "task_update", "task": task_data}
        data = json.dumps(message)

        # Broadcast to all (dashboard listens to all)
        await self.broadcast(message)

        # Also send to task-specific subscribers
        if task_id in self.task_subscribers:
            dead = set()
            for ws in self.task_subscribers[task_id].copy():
                try:
                    await ws.send_text(data)
                except Exception:
                    dead.add(ws)
            for ws in dead:
                self.disconnect(ws)

    async def send_stats_update(self, stats: dict):
        """Broadcast stats update to all clients."""
        await self.broadcast({"type": "stats_update", "stats": stats})


ws_manager = WebSocketManager()