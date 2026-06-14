import random
import string
import time
import asyncio
from typing import Dict, List, Optional

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
                "active": True
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

            # Determine role
            role = "viewer"
            if len(room["participants"]) == 0:
                role = "host"
                room["hostId"] = socket_id
                room["hostName"] = display_name

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
            room["participants"] = [p for p in room["participants"] if p["socketId"] != socket_id]
            
            # If the leaving participant was host, reassign host role to next participant (if any)
            if room["hostId"] == socket_id:
                if len(room["participants"]) > 0:
                    next_host = room["participants"][0]
                    next_host["role"] = "host"
                    room["hostId"] = next_host["socketId"]
                    room["hostName"] = next_host["displayName"]
                else:
                    room["hostId"] = None
                    room["hostName"] = None

            # If room is empty, delete it
            if len(room["participants"]) == 0:
                del self._rooms[code]
                return None

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
                    room["participants"] = [p for p in room["participants"] if p["socketId"] != socket_id]
                    
                    if room["hostId"] == socket_id:
                        if len(room["participants"]) > 0:
                            next_host = room["participants"][0]
                            next_host["role"] = "host"
                            room["hostId"] = next_host["socketId"]
                            room["hostName"] = next_host["displayName"]
                        else:
                            room["hostId"] = None
                            room["hostName"] = None
                    
                    if len(room["participants"]) == 0:
                        del self._rooms[code]
                        affected.append((code, None))
                    else:
                        affected.append((code, room))
        return affected

# Centralized singleton instance
room_manager = RoomManager()
