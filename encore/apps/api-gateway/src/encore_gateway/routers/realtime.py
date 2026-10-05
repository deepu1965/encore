"""Unified Realtime WebSocket and SSE Dispatcher.

Fulfills Phase 2 (G-10) realtime architecture:
- Unified per-tab WebSocket connection on /ws
- Topic / channel subscription frame handling
- WsEnvelope delivery with monotonic sequence numbering
- SSE fallback bridge on /ws/sse
- Redis Pub/Sub integration for cross-gateway horizontal scaling
- Background Kafka consumer forwarding domain events to connected clients
"""

from __future__ import annotations

import asyncio
from collections import defaultdict
from datetime import datetime, timezone
import json
import logging
from typing import Any
import uuid

from fastapi import APIRouter, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
import redis.asyncio as aioredis

from ..config import settings

logger = logging.getLogger(__name__)

router = APIRouter(tags=["realtime"])


class RealtimeManager:
    """Manages active WebSocket connections, SSE queues, subscriptions, and channel sequencing."""

    def __init__(self) -> None:
        # websocket -> set of subscribed channel names
        self.ws_subscriptions: dict[WebSocket, set[str]] = defaultdict(set)
        # channel -> set of subscribed websockets
        self.channel_ws_subscribers: dict[str, set[WebSocket]] = defaultdict(set)
        # channel -> set of SSE queues
        self.channel_sse_subscribers: dict[str, set[asyncio.Queue]] = defaultdict(set)
        # channel -> monotonic sequence counter
        self.channel_sequences: dict[str, int] = defaultdict(int)
        self._lock = asyncio.Lock()

    def connect_ws(self, websocket: WebSocket) -> None:
        self.ws_subscriptions[websocket] = set()

    def disconnect_ws(self, websocket: WebSocket) -> None:
        channels = self.ws_subscriptions.pop(websocket, set())
        for ch in channels:
            subscribers = self.channel_ws_subscribers.get(ch)
            if subscribers:
                subscribers.discard(websocket)
                if not subscribers:
                    self.channel_ws_subscribers.pop(ch, None)

    def subscribe_ws(self, websocket: WebSocket, channel: str) -> None:
        if websocket in self.ws_subscriptions:
            self.ws_subscriptions[websocket].add(channel)
            self.channel_ws_subscribers[channel].add(websocket)
            logger.debug("Subscribed WebSocket to channel: %s", channel)

    def unsubscribe_ws(self, websocket: WebSocket, channel: str) -> None:
        if websocket in self.ws_subscriptions:
            self.ws_subscriptions[websocket].discard(channel)
        subscribers = self.channel_ws_subscribers.get(channel)
        if subscribers:
            subscribers.discard(websocket)
            if not subscribers:
                self.channel_ws_subscribers.pop(channel, None)

    def subscribe_sse(self, queue: asyncio.Queue, channel: str) -> None:
        self.channel_sse_subscribers[channel].add(queue)

    def unsubscribe_sse(self, queue: asyncio.Queue, channel: str) -> None:
        subscribers = self.channel_sse_subscribers.get(channel)
        if subscribers:
            subscribers.discard(queue)
            if not subscribers:
                self.channel_sse_subscribers.pop(channel, None)

    async def broadcast(
        self,
        channel: str,
        message_type: str,
        payload: Any,
        correlation_id: str | None = None,
    ) -> dict[str, Any]:
        """Format a WsEnvelope and dispatch to all WS and SSE subscribers of channel."""
        async with self._lock:
            self.channel_sequences[channel] += 1
            seq = self.channel_sequences[channel]

        envelope = {
            "messageType": message_type,
            "channel": channel,
            "sequence": seq,
            "correlationId": correlation_id,
            "occurredAt": datetime.now(timezone.utc).isoformat(),
            "payload": payload,
        }

        # Dispatch to WebSockets
        ws_targets = list(self.channel_ws_subscribers.get(channel, set()))
        for ws in ws_targets:
            try:
                await ws.send_json(envelope)
            except Exception:
                self.disconnect_ws(ws)

        # Dispatch to SSE queues
        sse_targets = list(self.channel_sse_subscribers.get(channel, set()))
        for q in sse_targets:
            try:
                q.put_nowait(envelope)
            except Exception:
                pass

        return envelope


manager = RealtimeManager()


async def publish_realtime_event(
    channel: str,
    message_type: str,
    payload: Any,
    correlation_id: str | None = None,
    redis_client: aioredis.Redis | None = None,
) -> None:
    """Publish an event across all gateway replicas via Redis Pub/Sub, or broadcast locally."""
    event_data = {
        "channel": channel,
        "messageType": message_type,
        "payload": payload,
        "correlationId": correlation_id,
    }
    if redis_client:
        try:
            await redis_client.publish(f"realtime:{channel}", json.dumps(event_data))
            return
        except Exception as e:
            logger.warning("Failed to publish realtime event to Redis: %s", e)

    # Local fallback
    await manager.broadcast(channel, message_type, payload, correlation_id)


async def start_realtime_redis_listener(redis_url: str) -> None:
    """Listen for cross-gateway realtime events via Redis pattern pubsub."""
    try:
        client = aioredis.from_url(redis_url, decode_responses=True)
        pubsub = client.pubsub()
        await pubsub.psubscribe("realtime:*")
        logger.info("Started Redis Pub/Sub listener for realtime gateway.")
        async for message in pubsub.listen():
            if message["type"] == "pmessage":
                try:
                    data = json.loads(message["data"])
                    await manager.broadcast(
                        channel=data["channel"],
                        message_type=data["messageType"],
                        payload=data["payload"],
                        correlation_id=data.get("correlationId"),
                    )
                except Exception as ex:
                    logger.error("Error processing realtime pubsub message: %s", ex)
    except asyncio.CancelledError:
        logger.info("Realtime Redis listener cancelled.")
    except Exception as e:
        logger.warning("Realtime Redis Pub/Sub connection error: %s", e)


async def start_kafka_realtime_bridge(bootstrap_servers: str) -> None:
    """Background task consuming Kafka domain topics and dispatching to frontend channels."""
    from kafka import KafkaConsumer  # type: ignore[import-untyped]

    topics = [
        "order.completed",
        "order.cancelled",
        "seat.held",
        "seat.released",
        "seat.hold.expired",
        "waiting.room.admitted",
        "waiting.room.joined",
        "resale.listing",
        "resale.order",
        "resale.trade.matched",
        "resale.trade.settled",
        "resale.trade.failed",
    ]

    def _create_consumer():
        return KafkaConsumer(
            *topics,
            bootstrap_servers=bootstrap_servers,
            group_id=f"realtime-gateway-{uuid.uuid4().hex[:8]}",
            auto_offset_reset="latest",
            enable_auto_commit=True,
            value_deserializer=lambda m: json.loads(m.decode("utf-8")),
            consumer_timeout_ms=500,
            request_timeout_ms=1000,
        )

    logger.info("Starting Kafka realtime bridge against %s", bootstrap_servers)
    try:
        consumer = await asyncio.to_thread(_create_consumer)
    except Exception as e:
        logger.warning("Kafka realtime bridge unavailable, will run without Kafka: %s", e)
        return

    try:
        while True:
            records = await asyncio.to_thread(consumer.poll, 500)
            for _tp, batch in records.items():
                for record in batch:
                    try:
                        envelope = record.value
                        event_type = envelope.get("type") or envelope.get("event_type", "")
                        payload = envelope.get("payload") or {}
                        corr_id = envelope.get("trace_id") or envelope.get("correlation_id")

                        # Map events to frontend channels
                        if event_type in ("seat.hold.expired", "seat_hold_expired"):
                            hold_id = payload.get("hold_id")
                            if hold_id:
                                await manager.broadcast(f"checkout:{hold_id}", "hold.expired", payload, corr_id)

                        elif event_type in ("order.completed", "order_completed"):
                            order_id = payload.get("order_id")
                            if order_id:
                                await manager.broadcast(f"order:{order_id}", "order.updated", payload, corr_id)
                                await manager.broadcast(f"order:{order_id}", "ticket.issued", payload, corr_id)

                        elif event_type in ("resale.listing.created", "resale_listing_created"):
                            event_id = payload.get("event_id")
                            listing_id = payload.get("listing_id")
                            if event_id:
                                await manager.broadcast(f"resale:events:{event_id}", "listing.created", payload, corr_id)
                            if listing_id:
                                await manager.broadcast(f"resale:listings:{listing_id}", "listing.created", payload, corr_id)

                        elif event_type in ("resale.trade.matched", "resale_trade_matched"):
                            event_id = payload.get("event_id")
                            listing_id = payload.get("listing_id")
                            trade_id = payload.get("trade_id")
                            if event_id:
                                await manager.broadcast(f"resale:events:{event_id}", "listing.matched", payload, corr_id)
                            if listing_id:
                                await manager.broadcast(f"resale:listings:{listing_id}", "listing.matched", payload, corr_id)
                            if trade_id:
                                await manager.broadcast(f"resale:trades:{trade_id}", "trade.settling", payload, corr_id)

                        elif event_type in ("resale.trade.settled", "resale_trade_settled"):
                            trade_id = payload.get("trade_id")
                            if trade_id:
                                await manager.broadcast(f"resale:trades:{trade_id}", "trade.completed", payload, corr_id)
                                await manager.broadcast(f"resale:trades:{trade_id}", "ownership.transferred", payload, corr_id)

                        elif event_type in ("resale.trade.failed", "resale_trade_failed"):
                            trade_id = payload.get("trade_id")
                            if trade_id:
                                await manager.broadcast(f"resale:trades:{trade_id}", "trade.failed", payload, corr_id)

                        elif event_type in ("waiting_room_admitted", "waiting.room.admitted"):
                            event_id = payload.get("event_id")
                            if event_id:
                                await manager.broadcast(f"waiting-room:{event_id}", "queue.metrics", payload, corr_id)

                    except Exception as err:
                        logger.error("Error dispatching Kafka event to realtime channel: %s", err)

            await asyncio.sleep(0.01)
    except asyncio.CancelledError:
        logger.info("Kafka realtime bridge cancelled.")
    finally:
        try:
            await asyncio.to_thread(consumer.close)
        except Exception:
            pass


@router.websocket("/ws")
async def unified_websocket_endpoint(websocket: WebSocket) -> None:
    """Single per-tab multiplexed WebSocket connection per architecture specification."""
    await websocket.accept()
    manager.connect_ws(websocket)
    try:
        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue

            msg_type = data.get("messageType")
            if msg_type == "ping":
                await websocket.send_json({"messageType": "pong"})
            elif msg_type == "subscribe":
                channel = data.get("channel")
                if channel and isinstance(channel, str):
                    manager.subscribe_ws(websocket, channel)
            elif msg_type == "unsubscribe":
                channel = data.get("channel")
                if channel and isinstance(channel, str):
                    manager.unsubscribe_ws(websocket, channel)

    except WebSocketDisconnect:
        manager.disconnect_ws(websocket)
    except Exception as exc:
        logger.debug("WebSocket client error: %s", exc)
        manager.disconnect_ws(websocket)


@router.get("/ws/sse")
async def sse_fallback_endpoint(
    request: Request,
    channels: str = Query("", description="Comma-separated list of channel names"),
) -> StreamingResponse:
    """Server-Sent Events fallback bridge when WebSockets are unavailable."""
    channel_list = [ch.strip() for ch in channels.split(",") if ch.strip()]
    queue: asyncio.Queue = asyncio.Queue()

    for ch in channel_list:
        manager.subscribe_sse(queue, ch)

    async def event_generator():
        try:
            # Yield initial connection confirmation
            init_frame = {
                "messageType": "connected",
                "transport": "sse",
                "occurredAt": datetime.now(timezone.utc).isoformat(),
            }
            yield f"data: {json.dumps(init_frame)}\n\n"

            while True:
                if await request.is_disconnected():
                    break
                try:
                    envelope = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"data: {json.dumps(envelope)}\n\n"
                except asyncio.TimeoutError:
                    # Keepalive comment
                    yield ": ping\n\n"
        finally:
            for ch in channel_list:
                manager.unsubscribe_sse(queue, ch)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
