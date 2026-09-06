import asyncio
import json
import logging
import uuid
from typing import Any, Dict, List
from datetime import datetime

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import ChatMessage, User
from ..cache import get_cache
from encore_cache import CacheClient

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Chat"])

# Simple memory storage for active connections on THIS node
class ConnectionManager:
    def __init__(self):
        # event_id -> list of websockets
        self.active_connections: Dict[str, List[WebSocket]] = {}
        
    def connect(self, event_id: str, websocket: WebSocket):
        if event_id not in self.active_connections:
            self.active_connections[event_id] = []
        self.active_connections[event_id].append(websocket)
        
    def disconnect(self, event_id: str, websocket: WebSocket):
        if event_id in self.active_connections:
            if websocket in self.active_connections[event_id]:
                self.active_connections[event_id].remove(websocket)
            if not self.active_connections[event_id]:
                del self.active_connections[event_id]

    async def broadcast_to_room_local(self, event_id: str, message: dict):
        if event_id in self.active_connections:
            # Create a list copy to avoid mutation errors if someone disconnects
            for connection in list(self.active_connections[event_id]):
                try:
                    await connection.send_json(message)
                except RuntimeError:
                    self.disconnect(event_id, connection)

manager = ConnectionManager()
redis_client = None
pubsub = None

async def start_redis_pubsub(redis_url: str):
    """Background task to listen to Redis Pub/Sub for chat messages."""
    global redis_client, pubsub
    
    # In V1, we just use localhost by default. In prod, read from config.
    try:
        redis_client = aioredis.from_url(redis_url, decode_responses=True)
        pubsub = redis_client.pubsub()
        await pubsub.psubscribe("chat:*")
        
        logger.info("Started Redis Pub/Sub listener for chat.")
        
        async for message in pubsub.listen():
            if message["type"] == "pmessage":
                channel = message["channel"]
                event_id = channel.split(":")[1]
                data = json.loads(message["data"])
                await manager.broadcast_to_room_local(event_id, data)
    except Exception as e:
        logger.error(f"Redis Pub/Sub error: {e}")

def get_redis_url(cache: CacheClient = Depends(get_cache)) -> str:
    # Hack to extract connection info, normally we'd pass this via config
    if hasattr(cache, "_redis"):
        kwargs = cache._redis.connection_pool.connection_kwargs
        host = kwargs.get("host", "localhost")
        port = kwargs.get("port", 6379)
        db = kwargs.get("db", 0)
        return f"redis://{host}:{port}/{db}"
    return "redis://localhost:6379/0"

def moderate_message(content: str) -> bool:
    """Basic moderation hook. Returns False if message is blocked."""
    blocked_words = {"spam", "abuse", "scam"}
    content_lower = content.lower()
    for word in blocked_words:
        if word in content_lower:
            return False
    return True

@router.websocket("/ws/chat/{event_id}")
async def websocket_endpoint(
    websocket: WebSocket, 
    event_id: uuid.UUID,
    token: str = Query(...), # Simple token simulation for V1
    last_message_id: int = Query(None, description="Optional ID for backfilling missed messages"),
    db: Session = Depends(get_db)
):
    await websocket.accept()
    
    # 1. Authenticate user (Mock implementation for V1)
    # Ideally, we would decode the JWT and get the user ID. 
    # For this implementation, we assume token is the user_id string for simplicity,
    # OR we just query the DB for the user. Let's just mock user parsing.
    user_id_str = token
    try:
        user_id = uuid.UUID(user_id_str)
    except ValueError:
        await websocket.close(code=1008, reason="Invalid token (expected valid UUID for V1)")
        return
        
    try:
        # Check if user exists
        user = db.scalars(select(User).where(User.id == user_id)).first()
        if not user:
            await websocket.close(code=1008, reason="User not found")
            return
            
        event_id_str = str(event_id)
        manager.connect(event_id_str, websocket)
        
        # 2. Backfill missed messages if requested
        if last_message_id is not None:
            missed_messages = db.scalars(
                select(ChatMessage)
                .where(ChatMessage.event_id == event_id)
                .where(ChatMessage.id > last_message_id)
                .order_by(ChatMessage.id.asc())
            ).all()
            for msg in missed_messages:
                await websocket.send_json({
                    "id": msg.id,
                    "event_id": str(msg.event_id),
                    "user_id": str(msg.user_id),
                    "content": msg.content,
                    "created_at": msg.created_at.isoformat()
                })
        
        # 3. Broadcast Presence Join
        join_msg = {
            "type": "presence",
            "action": "join",
            "user_id": str(user_id)
        }
        if redis_client:
            await redis_client.publish(f"chat:{event_id_str}", json.dumps(join_msg))
            
        # 4. Listen for incoming messages
        try:
            while True:
                data = await websocket.receive_text()
                
                if not moderate_message(data):
                    await websocket.send_json({"type": "error", "message": "Message blocked by moderation."})
                    continue
                    
                # Save to DB
                chat_msg = ChatMessage(
                    event_id=event_id,
                    user_id=user_id,
                    content=data
                )
                db.add(chat_msg)
                db.commit()
                db.refresh(chat_msg)
                
                # Publish to Redis
                broadcast_msg = {
                    "type": "chat",
                    "id": chat_msg.id,
                    "event_id": str(chat_msg.event_id),
                    "user_id": str(chat_msg.user_id),
                    "content": chat_msg.content,
                    "created_at": chat_msg.created_at.isoformat()
                }
                
                if redis_client:
                    await redis_client.publish(f"chat:{event_id_str}", json.dumps(broadcast_msg))
                    
        except WebSocketDisconnect:
            manager.disconnect(event_id_str, websocket)
            # Broadcast Presence Leave
            leave_msg = {
                "type": "presence",
                "action": "leave",
                "user_id": str(user_id)
            }
            if redis_client:
                await redis_client.publish(f"chat:{event_id_str}", json.dumps(leave_msg))
    finally:
        pass # db is managed by Depends
