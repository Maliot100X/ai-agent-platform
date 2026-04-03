"""WebSocket connection manager for real-time broadcasting."""

import json
from typing import Any

import structlog
from fastapi import WebSocket

logger = structlog.get_logger()


class ConnectionManager:
    """Manages WebSocket connections and broadcasts messages."""

    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info("ws_connected", total=len(self.active_connections))

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
        logger.info("ws_disconnected", total=len(self.active_connections))

    async def broadcast(self, message: dict) -> None:
        """Broadcast a message to all connected clients."""
        data = json.dumps(message, default=str)
        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(data)
            except Exception:
                disconnected.append(connection)
        for conn in disconnected:
            self.disconnect(conn)

    async def broadcast_signal(self, signal: dict) -> None:
        await self.broadcast({"type": "signal", "data": signal})

    async def broadcast_action(self, action: dict) -> None:
        await self.broadcast({"type": "agent_action", "data": action})

    async def broadcast_log(self, log: dict) -> None:
        await self.broadcast({"type": "log", "data": log})

    async def broadcast_metric(self, metric: dict) -> None:
        await self.broadcast({"type": "metric", "data": metric})

    @property
    def connection_count(self) -> int:
        return len(self.active_connections)


# Global WebSocket manager
ws_manager = ConnectionManager()
