import json
import logging
import uuid
import asyncio
from fastapi import WebSocket, WebSocketDisconnect
from app.rooms.manager import room_manager

logger = logging.getLogger("omnisync.websocket")

class ConnectionManager:
    def __init__(self):
        # Maps socket_id -> WebSocket
        self.active_connections: dict[str, WebSocket] = {}
        # Maps socket_id -> room_code
        self.socket_room_map: dict[str, str] = {}
        # Maps socket_id -> display_name
        self.socket_name_map: dict[str, str] = {}

    async def connect(self, websocket: WebSocket) -> str:
        """
        Accept the WebSocket connection and generate a unique socket ID.
        """
        await websocket.accept()
        socket_id = str(uuid.uuid4())
        self.active_connections[socket_id] = websocket
        logger.info(f"WebSocket client connected. socketId: {socket_id}")
        return socket_id

    async def disconnect(self, socket_id: str):
        """
        Clean up connection state when a socket is closed.
        Notify other room participants.
        """
        if socket_id in self.active_connections:
            del self.active_connections[socket_id]

        room_code = self.socket_room_map.pop(socket_id, None)
        display_name = self.socket_name_map.pop(socket_id, None)

        if room_code:
            logger.info(f"Client {socket_id} ({display_name}) disconnected from room {room_code}")
            # Remove from room manager
            room = await room_manager.leave_room(room_code, socket_id)
            if room:
                # Notify remaining room participants
                await self.broadcast_to_room(
                    room_code,
                    {
                        "event": "participant_left",
                        "participantId": socket_id
                    }
                )
                await self.broadcast_to_room(
                    room_code,
                    {
                        "event": "participants_updated",
                        "participants": room["participants"]
                    }
                )

    async def broadcast_to_room(self, room_code: str, message: dict):
        """
        Send a JSON message to all WebSocket connections active in the given room.
        """
        code = room_code.upper()
        # Find all sockets mapped to this room
        sockets_in_room = [
            sid for sid, rcode in self.socket_room_map.items()
            if rcode == code
        ]
        
        if not sockets_in_room:
            return

        payload = json.dumps(message)
        logger.debug(f"Broadcasting to room {code} ({len(sockets_in_room)} clients): {payload}")
        
        # Gather all sends to perform them concurrently
        tasks = []
        for sid in sockets_in_room:
            ws = self.active_connections.get(sid)
            if ws:
                tasks.append(self._safe_send(ws, payload, sid))
        
        if tasks:
            await asyncio.gather(*tasks)

    async def _safe_send(self, websocket: WebSocket, payload: str, socket_id: str):
        try:
            await websocket.send_text(payload)
        except Exception as e:
            logger.error(f"Error sending to socket {socket_id}: {e}")

    async def handle_message(self, socket_id: str, data_str: str):
        """
        Parse and route incoming WebSocket JSON messages.
        """
        try:
            data = json.loads(data_str)
        except json.JSONDecodeError:
            logger.warning(f"Invalid JSON received from socket {socket_id}: {data_str}")
            return

        event = data.get("event")
        if not event:
            logger.warning(f"No event field in message from socket {socket_id}: {data}")
            return

        if event == "join_room":
            room_code = data.get("roomCode", "").upper()
            display_name = data.get("displayName", "")
            
            if not room_code or not display_name:
                await self._send_error(socket_id, "Missing roomCode or displayName")
                return
            
            # Register inside room manager
            room = await room_manager.join_room(room_code, socket_id, display_name)
            if not room:
                await self._send_error(socket_id, "Room not found or inactive")
                return

            self.socket_room_map[socket_id] = room_code
            self.socket_name_map[socket_id] = display_name
            
            is_host = room["hostId"] == socket_id
            
            # Send confirmation back to the joiner
            ws = self.active_connections.get(socket_id)
            if ws:
                join_confirmation = {
                    "event": "room_joined",
                    "roomCode": room_code,
                    "isHost": is_host,
                    "socketId": socket_id,
                    "participants": room["participants"],
                    "autoDelete": room.get("autoDelete", True)
                }
                await ws.send_text(json.dumps(join_confirmation))

            # Broadcast participant_joined to others in room
            participant_info = next(p for p in room["participants"] if p["socketId"] == socket_id)
            await self.broadcast_to_room(
                room_code,
                {
                    "event": "participant_joined",
                    "participant": participant_info
                }
            )

            # Broadcast participants_updated to everyone
            await self.broadcast_to_room(
                room_code,
                {
                    "event": "participants_updated",
                    "participants": room["participants"]
                }
            )
            
            logger.info(f"Client {socket_id} ({display_name}) joined room {room_code}")

        elif event == "leave_room":
            await self.disconnect(socket_id)

        elif event == "chat_message":
            message_text = data.get("message", "").strip()
            if not message_text:
                return
            
            room_code = self.socket_room_map.get(socket_id)
            display_name = self.socket_name_map.get(socket_id)
            
            if not room_code or not display_name:
                await self._send_error(socket_id, "Not associated with a room")
                return
            
            from datetime import datetime
            from app.database.mongodb import get_database
            
            try:
                db = get_database()
                timestamp = datetime.utcnow().isoformat() + "Z"
                doc = {
                    "roomCode": room_code,
                    "sender": display_name,
                    "message": message_text,
                    "timestamp": timestamp
                }
                await db["messages"].insert_one(doc)
                
                await self.broadcast_to_room(
                    room_code,
                    {
                        "event": "chat_message",
                        "sender": display_name,
                        "message": message_text,
                        "timestamp": timestamp
                    }
                )
            except Exception as e:
                logger.error(f"Failed to save/broadcast chat message: {e}")
                await self._send_error(socket_id, "Failed to send message")

        elif event in ("webrtc_offer", "webrtc_answer", "ice_candidate"):
            # --- WebRTC signaling relay ---
            # Server does NOT process media — it only forwards to the target peer.
            target_id = data.get("targetId")
            if not target_id:
                await self._send_error(socket_id, "Missing targetId for signaling message")
                return

            target_ws = self.active_connections.get(target_id)
            if not target_ws:
                logger.warning(f"Signaling target {target_id} not connected — dropping {event}")
                return

            # Forward the complete payload (including senderId) to the target
            relay_payload = {**data, "senderId": socket_id}
            await self._safe_send(target_ws, json.dumps(relay_payload), target_id)
            logger.debug(f"Relayed {event} from {socket_id} to {target_id}")

        elif event == "host_stop_share":
            # Host signals that screen sharing has ended — broadcast to room
            room_code = self.socket_room_map.get(socket_id)
            if room_code:
                await self.broadcast_to_room(
                    room_code,
                    {"event": "host_stop_share", "hostId": socket_id}
                )

        elif event == "toggle_auto_delete":
            room_code = self.socket_room_map.get(socket_id)
            if not room_code:
                await self._send_error(socket_id, "Not associated with a room")
                return
            
            room = await room_manager.get_room(room_code)
            if not room or room.get("hostId") != socket_id:
                await self._send_error(socket_id, "Unauthorized: Only the host can toggle room settings")
                return
            
            auto_delete = data.get("autoDelete", True)
            room["autoDelete"] = auto_delete
            
            await self.broadcast_to_room(
                room_code,
                {
                    "event": "room_settings_updated",
                    "autoDelete": auto_delete
                }
            )
            logger.info(f"Host {socket_id} updated autoDelete to {auto_delete} in room {room_code}")

        elif event == "transfer_host":
            target_id = data.get("targetId")
            if not target_id:
                await self._send_error(socket_id, "Missing targetId")
                return
            
            room_code = self.socket_room_map.get(socket_id)
            if not room_code:
                await self._send_error(socket_id, "Not associated with a room")
                return
            
            room = await room_manager.transfer_host(room_code, socket_id, target_id)
            if not room:
                await self._send_error(socket_id, "Failed to transfer host role")
                return
            
            await self.broadcast_to_room(
                room_code,
                {
                    "event": "participants_updated",
                    "participants": room["participants"]
                }
            )
            logger.info(f"Host {socket_id} transferred host role to {target_id} in room {room_code}")

        elif event == "remove_participant":
            target_id = data.get("targetId")
            if not target_id:
                await self._send_error(socket_id, "Missing targetId")
                return
            
            room_code = self.socket_room_map.get(socket_id)
            if not room_code:
                await self._send_error(socket_id, "Not associated with a room")
                return
            
            room = await room_manager.get_room(room_code)
            if not room or room.get("hostId") != socket_id:
                await self._send_error(socket_id, "Unauthorized: Only the host can remove participants")
                return
            
            if target_id == socket_id:
                await self._send_error(socket_id, "You cannot remove yourself")
                return
            
            target_ws = self.active_connections.get(target_id)
            if target_ws:
                try:
                    await target_ws.send_text(json.dumps({
                        "event": "kicked",
                        "reason": "You have been removed by the host."
                    }))
                    await target_ws.close(code=1000)
                    logger.info(f"Host {socket_id} kicked participant {target_id} from room {room_code}")
                except Exception as e:
                    logger.error(f"Failed to close websocket for kicked participant {target_id}: {e}")
            else:
                await self.disconnect(target_id)

        else:
            logger.warning(f"Unhandled WebSocket event '{event}' from socket {socket_id}")

    async def _send_error(self, socket_id: str, message: str):
        ws = self.active_connections.get(socket_id)
        if ws:
            try:
                await ws.send_text(json.dumps({
                    "event": "system:error",
                    "message": message
                }))
            except Exception as e:
                logger.error(f"Failed to send error message: {e}")

# Centralized manager singleton instance
connection_manager = ConnectionManager()
