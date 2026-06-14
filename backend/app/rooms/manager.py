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

logger = logging.getLogger("omnisync.rooms")

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
                "hostId": None,
                "hostName": None,
                "participants": [],
                "createdAt": time.time(),
                "active": True,
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

    async def join_room(self, room_code: str, socket_id: str, display_name: str) -> Optional[dict]:
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

            # If room was empty, reset emptyAt (restarting the counter)
            was_empty = len(room["participants"]) == 0
            if was_empty:
                room["emptyAt"] = None

            # Determine role
            role = "viewer"
            last_host_name = room.get("lastHostName")

            if was_empty:
                if last_host_name:
                    # Only the last host can be the host
                    if display_name == last_host_name:
                        role = "host"
                        room["hostId"] = socket_id
                        room["hostName"] = display_name
                    else:
                        role = "viewer"
                        # hostId and hostName remain None
                else:
                    # No last host name recorded (first time joining the created room)
                    role = "host"
                    room["hostId"] = socket_id
                    room["hostName"] = display_name
            else:
                # Room is not empty. Is there currently a host?
                # If there's no host yet (e.g. last host hasn't joined), can a new joiner be the host?
                # Only if their display name matches lastHostName
                if room.get("hostId") is None:
                    if last_host_name and display_name == last_host_name:
                        role = "host"
                        room["hostId"] = socket_id
                        room["hostName"] = display_name
                    else:
                        role = "viewer"
                else:
                    role = "viewer"

            participant = {
                "socketId": socket_id,
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
            
            # Save if the leaving participant was host
            leaving_is_host = room["hostId"] == socket_id
            leaving_host_name = None
            if leaving_is_host:
                leaving_host_name = room["hostName"]
            
            # Remove participant
            room["participants"] = [p for p in room["participants"] if p["socketId"] != socket_id]
            
            # If the leaving participant was host, reassign host role to next participant (if any)
            if leaving_is_host:
                room["lastHostName"] = leaving_host_name
                if len(room["participants"]) > 0:
                    next_host = room["participants"][0]
                    next_host["role"] = "host"
                    room["hostId"] = next_host["socketId"]
                    room["hostName"] = next_host["displayName"]
                else:
                    room["hostId"] = None
                    room["hostName"] = None

            # If room is empty, decide based on autoDelete
            if len(room["participants"]) == 0:
                if room.get("autoDelete", True):
                    if code in self._rooms:
                        del self._rooms[code]
                    return None
                else:
                    room["emptyAt"] = time.time()
                    return room

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
                if any(p["socketId"] == socket_id for p in room["participants"]):
                    leaving_is_host = room["hostId"] == socket_id
                    leaving_host_name = None
                    if leaving_is_host:
                        leaving_host_name = room["hostName"]
                        
                    room["participants"] = [p for p in room["participants"] if p["socketId"] != socket_id]
                    
                    if leaving_is_host:
                        room["lastHostName"] = leaving_host_name
                        if len(room["participants"]) > 0:
                            next_host = room["participants"][0]
                            next_host["role"] = "host"
                            room["hostId"] = next_host["socketId"]
                            room["hostName"] = next_host["displayName"]
                        else:
                            room["hostId"] = None
                            room["hostName"] = None
                    
                    if len(room["participants"]) == 0:
                        if room.get("autoDelete", True):
                            if code in self._rooms:
                                del self._rooms[code]
                            affected.append((code, None))
                        else:
                            room["emptyAt"] = time.time()
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
            if room["hostId"] != host_socket_id:
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
            room["lastHostName"] = target["displayName"]
            
            return room

    async def start_cleanup_loop(self):
        """
        Periodic background task that runs indefinitely to clean up rooms that
        have been empty for more than 24 hours (86400 seconds).
        """
        logger.info("Room expiry cleanup background task started.")
        while True:
            try:
                await asyncio.sleep(60)  # Check every 60 seconds
                async with self._lock:
                    now = time.time()
                    to_delete = []
                    for code, room in self._rooms.items():
                        if not room.get("autoDelete", True) and len(room["participants"]) == 0:
                            empty_at = room.get("emptyAt")
                            if empty_at and (now - empty_at >= 86400):
                                to_delete.append(code)
                    for code in to_delete:
                        logger.info(f"Room {code} has been empty for > 24 hours. Deleting room.")
                        if code in self._rooms:
                            del self._rooms[code]
            except Exception as e:
                logger.error(f"Error in RoomManager cleanup loop: {e}")

# Centralized singleton instance
room_manager = RoomManager()
