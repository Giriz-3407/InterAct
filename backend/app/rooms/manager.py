import random
import string
import time
import asyncio
from typing import Dict, List, Optional

import random
import string
import time
import asyncio
import logging
from typing import Dict, List, Optional

logger = logging.getLogger("interact.rooms")

class RoomManager:
    def __init__(self):
        # Maps room_code -> room_dict
        # Thread/asyncio safety is handled using an asyncio.Lock
        self._rooms: Dict[str, dict] = {}
        self._lock = asyncio.Lock()

    def _generate_room_code(self) -> str:
        """
        Generate a unique 6-character room code containing uppercase letters and digits.
        """
        characters = string.ascii_uppercase + string.digits
        while True:
            code = ''.join(random.choices(characters, k=6))
            if code not in self._rooms:
                return code

    async def create_room(self) -> dict:
        """
        Create a new room in memory and return its details.
        """
        async with self._lock:
            code = self._generate_room_code()
            room = {
                "roomCode": code,
                "owner_client_id": None,
                "owner_name": None,
                "participants": [],
                "createdAt": time.time(),
                "active": True,
                "auto_delete_when_empty": True,
                "host_last_seen_at": None,
                "pending_deletion_at": None,
                "empty_since": None,
                "pending_empty_deletion_at": None,
                "client_names": {},
                
                # Keep these for compatibility if frontend/WebRTC references them
                "hostId": None,
                "hostName": None,
                "autoDelete": True,
                "emptyAt": None,
                "lastHostName": None
            }
            self._rooms[code] = room
            return room

    async def get_room(self, room_code: str) -> Optional[dict]:
        """
        Retrieve a room's configuration.
        """
        async with self._lock:
            return self._rooms.get(room_code.upper())

    async def join_room(self, room_code: str, socket_id: str, display_name: str, client_id: str) -> Optional[dict]:
        """
        Add a participant to the room. The first user to join becomes the host.
        """
        async with self._lock:
            code = room_code.upper()
            if code not in self._rooms:
                return None
            
            room = self._rooms[code]
            
            # Check if user already exists with this socket_id
            existing = next((p for p in room["participants"] if p["socketId"] == socket_id), None)
            if existing:
                return room

            # Set owner if not already set
            if room["owner_client_id"] is None:
                room["owner_client_id"] = client_id
                room["owner_name"] = display_name

            # Determine role
            is_owner = room["owner_client_id"] == client_id
            if is_owner:
                role = "host"
                room["hostId"] = socket_id
                room["hostName"] = display_name
                # Restore owner privileges, cancel pending deletion
                room["pending_deletion_at"] = None
                room["host_last_seen_at"] = None
            else:
                role = "viewer"

            # Detect display name change for this client
            old_name = room["client_names"].get(client_id)
            if old_name and old_name != display_name:
                room["_rename_info"] = {"old_name": old_name, "new_name": display_name}
            room["client_names"][client_id] = display_name

            # Cancel any pending empty-room deletion when anyone rejoins
            room["empty_since"] = None
            room["pending_empty_deletion_at"] = None

            participant = {
                "socketId": socket_id,
                "clientId": client_id,
                "displayName": display_name,
                "joinedAt": time.time(),
                "role": role,
                "status": "active"
            }
            
            room["participants"].append(participant)
            return room

    async def leave_room(self, room_code: str, socket_id: str) -> Optional[dict]:
        """
        Remove a participant from the room.
        If the room becomes empty, clean it up.
        """
        async with self._lock:
            code = room_code.upper()
            if code not in self._rooms:
                return None
                
            room = self._rooms[code]
            
            # Find the participant
            participant = next((p for p in room["participants"] if p["socketId"] == socket_id), None)
            if not participant:
                return room
            
            client_id = participant["clientId"]
            is_owner = room["owner_client_id"] == client_id
            
            # Remove participant
            room["participants"] = [p for p in room["participants"] if p["socketId"] != socket_id]
            
            # If the leaving participant was the owner:
            if is_owner:
                room["hostId"] = None
                room["hostName"] = None
                if not room.get("auto_delete_when_empty", True):
                    now = time.time()
                    room["host_last_seen_at"] = now
                    room["pending_deletion_at"] = now + 86400  # 24 hours

            # When room becomes empty, start 30-second grace period before deletion
            if len(room["participants"]) == 0:
                if room.get("auto_delete_when_empty", True):
                    now = time.time()
                    room["empty_since"] = now
                    room["pending_empty_deletion_at"] = now + 30
                    logger.info(f"Room {code} is now empty. 30s grace period started.")

            return room

    async def remove_socket(self, socket_id: str) -> List[tuple]:
        """
        Finds all rooms this socket is in and removes them.
        Returns a list of tuples: (room_code, updated_room_dict_or_None)
        """
        affected = []
        async with self._lock:
            rooms_to_check = list(self._rooms.keys())
            for code in rooms_to_check:
                room = self._rooms[code]
                participant = next((p for p in room["participants"] if p["socketId"] == socket_id), None)
                if participant:
                    client_id = participant["clientId"]
                    is_owner = room["owner_client_id"] == client_id
                    
                    room["participants"] = [p for p in room["participants"] if p["socketId"] != socket_id]
                    
                    if is_owner:
                        room["hostId"] = None
                        room["hostName"] = None
                        if not room.get("auto_delete_when_empty", True):
                            now = time.time()
                            room["host_last_seen_at"] = now
                            room["pending_deletion_at"] = now + 86400  # 24 hours
                    
                    if len(room["participants"]) == 0:
                        if room.get("auto_delete_when_empty", True):
                            now = time.time()
                            room["empty_since"] = now
                            room["pending_empty_deletion_at"] = now + 30
                            affected.append((code, room))
                        else:
                            affected.append((code, room))
                    else:
                        affected.append((code, room))
        return affected

    async def transfer_host(self, room_code: str, host_socket_id: str, target_socket_id: str) -> Optional[dict]:
        """
        Transfer the host role to another participant.
        """
        async with self._lock:
            code = room_code.upper()
            if code not in self._rooms:
                return None
            
            room = self._rooms[code]
            
            # Check if host_socket_id is the owner of the room
            owner_participant = next((p for p in room["participants"] if p["socketId"] == host_socket_id), None)
            if not owner_participant or owner_participant["clientId"] != room["owner_client_id"]:
                return None
            
            # Find target participant
            target = next((p for p in room["participants"] if p["socketId"] == target_socket_id), None)
            if not target:
                return None
            
            # Make the old host a viewer
            current_host = next((p for p in room["participants"] if p["socketId"] == host_socket_id), None)
            if current_host:
                current_host["role"] = "viewer"
                
            # Make the target the host
            target["role"] = "host"
            room["hostId"] = target_socket_id
            room["hostName"] = target["displayName"]
            
            # Update ownership
            room["owner_client_id"] = target["clientId"]
            room["owner_name"] = target["displayName"]
            
            # Cancel pending deletion since owner is now active
            room["pending_deletion_at"] = None
            room["host_last_seen_at"] = None
            
            return room

    async def start_cleanup_loop(self):
        """
        Periodic background task that runs indefinitely to clean up rooms that
        have expired their deletion criteria.
        """
        logger.info("Room expiry cleanup background task started.")
        while True:
            try:
                await asyncio.sleep(60)  # Check every 60 seconds
                async with self._lock:
                    now = time.time()
                    to_delete = []
                    for code, room in self._rooms.items():
                        if room.get("auto_delete_when_empty", True):
                            if len(room["participants"]) == 0:
                                pending_deletion = room.get("pending_empty_deletion_at")
                                if pending_deletion and now > pending_deletion:
                                    to_delete.append(code)
                        else:
                            pending_deletion_at = room.get("pending_deletion_at")
                            if pending_deletion_at and now > pending_deletion_at:
                                to_delete.append(code)
                    for code in to_delete:
                        logger.info(f"Room {code} has expired. Deleting room.")
                        if code in self._rooms:
                            del self._rooms[code]
            except Exception as e:
                logger.error(f"Error in RoomManager cleanup loop: {e}")

# Centralized singleton instance
room_manager = RoomManager()
