from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel
from typing import List, Optional
from app.rooms.manager import room_manager
from app.api.auth import get_current_user_optional

router = APIRouter(prefix="/api/rooms", tags=["Rooms"])

from app.database.mongodb import get_database

class CreateRoomResponse(BaseModel):
    roomCode: str

class RoomLookupResponse(BaseModel):
    roomCode: str
    active: bool
    participantCount: int

class MessageResponse(BaseModel):
    roomCode: str
    sender: str
    message: str
    timestamp: str
    type: str = "user"

@router.post("", response_model=CreateRoomResponse, status_code=status.HTTP_201_CREATED)
async def create_room(current_user: Optional[dict] = Depends(get_current_user_optional)):
    """
    Create a new temporary room and return its unique 6-character code.
    """
    try:
        owner_user_id = str(current_user["_id"]) if current_user and "_id" in current_user else None
        room = await room_manager.create_room(owner_user_id=owner_user_id)
        return CreateRoomResponse(roomCode=room["roomCode"])
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not create room: {str(e)}"
        )

@router.get("/{roomCode}", response_model=RoomLookupResponse)
async def lookup_room(roomCode: str):
    """
    Check if a room exists and return active status + participant count.
    """
    room = await room_manager.get_room(roomCode)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    return RoomLookupResponse(
        roomCode=room["roomCode"],
        active=room["active"],
        participantCount=len(room["participants"])
    )

@router.get("/{roomCode}/messages", response_model=List[MessageResponse])
async def get_room_messages(roomCode: str):
    """
    Load previous room messages sorted by timestamp in ascending order.
    """
    room = await room_manager.get_room(roomCode)
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Room not found"
        )
    
    try:
        db = get_database()
        cursor = db["messages"].find({"roomCode": roomCode.upper()}).sort("timestamp", 1)
        messages = []
        async for doc in cursor:
            messages.append(MessageResponse(
                roomCode=doc["roomCode"],
                sender=doc["sender"],
                message=doc["message"],
                timestamp=doc["timestamp"],
                type=doc.get("type", "user")
            ))
        return messages
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not load messages: {str(e)}"
        )
