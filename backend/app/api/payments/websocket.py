"""
WebSocket support for real-time payment status updates
"""

from __future__ import annotations

import json
import asyncio
from typing import Dict, Set, Any
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, HTTPException
from fastapi.responses import HTMLResponse

from ...services.db_service import db_service

router = APIRouter(prefix="/ws", tags=["websocket"], include_in_schema=True)


class ConnectionManager:
    """Manages WebSocket connections."""
    
    def __init__(self):
        # Store connections by order_id
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        # Store connection metadata
        self.connection_metadata: Dict[WebSocket, Dict[str, Any]] = {}
    
    async def connect(self, websocket: WebSocket, order_id: str, connection_type: str = "payment_status"):
        """Connect a WebSocket client."""
        await websocket.accept()
        
        if order_id not in self.active_connections:
            self.active_connections[order_id] = set()
        
        self.active_connections[order_id].add(websocket)
        self.connection_metadata[websocket] = {
            "order_id": order_id,
            "connection_type": connection_type,
            "connected_at": datetime.utcnow().isoformat(),
        }
        
        # Store connection in database
        if db_service.is_available():
            try:
                connection_id = f"ws_{order_id}_{int(datetime.utcnow().timestamp())}"
                connection_data = {
                    "connection_id": connection_id,
                    "order_id": order_id,
                    "connection_type": connection_type,
                    "is_active": True,
                    "connected_at": datetime.utcnow().isoformat(),
                }
                db_service.admin_create("websocket_connections", connection_data)
            except Exception as e:
                print(f"Error storing connection: {e}")
    
    def disconnect(self, websocket: WebSocket):
        """Disconnect a WebSocket client."""
        metadata = self.connection_metadata.get(websocket, {})
        order_id = metadata.get("order_id")
        
        if order_id and order_id in self.active_connections:
            self.active_connections[order_id].discard(websocket)
            if not self.active_connections[order_id]:
                del self.active_connections[order_id]
        
        if websocket in self.connection_metadata:
            del self.connection_metadata[websocket]
        
        # Update connection in database
        if db_service.is_available() and order_id:
            try:
                connections = db_service.admin_get_all(
                    "websocket_connections",
                    filters={"order_id": order_id, "is_active": True}
                )
                if connections:
                    db_service.admin_update(
                        "websocket_connections",
                        connections[0].get("id"),
                        {
                            "is_active": False,
                            "disconnected_at": datetime.utcnow().isoformat(),
                        }
                    )
            except Exception as e:
                print(f"Error updating connection: {e}")
    
    async def send_personal_message(self, message: Dict[str, Any], websocket: WebSocket):
        """Send message to a specific WebSocket."""
        try:
            await websocket.send_json(message)
        except:
            pass
    
    async def broadcast_to_order(self, order_id: str, message: Dict[str, Any]):
        """Broadcast message to all connections for an order."""
        if order_id in self.active_connections:
            disconnected = set()
            for connection in self.active_connections[order_id]:
                try:
                    await connection.send_json(message)
                except:
                    disconnected.add(connection)
            
            # Remove disconnected connections
            for conn in disconnected:
                self.disconnect(conn)


manager = ConnectionManager()


@router.websocket("/payment-status/{order_id}")
async def payment_status_websocket(websocket: WebSocket, order_id: str):
    """WebSocket endpoint for real-time payment status updates."""
    await manager.connect(websocket, order_id, "payment_status")
    
    try:
        # Send initial status
        if db_service.is_available():
            try:
                orders = db_service.admin_get_all("orders", filters={"order_id": order_id})
                if orders:
                    order = orders[0]
                    await manager.send_personal_message({
                        "type": "payment_status",
                        "order_id": order_id,
                        "status": order.get("status"),
                        "payment_status": order.get("payment_status"),
                        "transaction_id": order.get("transaction_id"),
                    }, websocket)
            except:
                pass
        
        # Keep connection alive and listen for messages
        while True:
            try:
                data = await websocket.receive_text()
                # Handle ping/pong or other messages
                if data == "ping":
                    await websocket.send_text("pong")
            except WebSocketDisconnect:
                break
            except Exception as e:
                print(f"WebSocket error: {e}")
                break
                
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(websocket)


@router.get("/payment-status/{order_id}/poll")
async def poll_payment_status(order_id: str) -> Dict[str, Any]:
    """Poll payment status (alternative to WebSocket)."""
    if not db_service.is_available():
        raise HTTPException(status_code=503, detail="Database not available")
    
    try:
        # Get from payment session
        sessions = db_service.admin_get_all("payment_sessions", filters={"order_id": order_id})
        if sessions:
            session = sessions[0]
            return {
                "order_id": order_id,
                "gateway": session.get("gateway"),
                "status": session.get("status"),
                "payment_status": session.get("payment_status"),
                "transaction_id": session.get("transaction_id"),
                "amount": session.get("amount"),
            }
        
        # Get from order
        orders = db_service.admin_get_all("orders", filters={"order_id": order_id})
        if orders:
            order = orders[0]
            return {
                "order_id": order_id,
                "status": order.get("status"),
                "payment_status": order.get("payment_status"),
                "transaction_id": order.get("transaction_id"),
                "amount": order.get("amount"),
            }
        
        raise HTTPException(status_code=404, detail="Order not found")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Helper function to broadcast payment status updates
async def broadcast_payment_update(order_id: str, status: str, payment_status: str, transaction_id: str = None):
    """Broadcast payment status update to all connected clients."""
    message = {
        "type": "payment_status_update",
        "order_id": order_id,
        "status": status,
        "payment_status": payment_status,
        "transaction_id": transaction_id,
        "timestamp": datetime.utcnow().isoformat(),
    }
    await manager.broadcast_to_order(order_id, message)

