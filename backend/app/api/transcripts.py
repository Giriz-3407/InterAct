from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel, Field, BeforeValidator
from datetime import datetime
from typing import List, Optional, Annotated, Dict, Any
from app.database.mongodb import get_database
from app.api.auth import get_current_user

router = APIRouter(prefix="/api/transcripts", tags=["Transcripts"])

PyObjectId = Annotated[str, BeforeValidator(str)]

class TranscriptCreate(BaseModel):
    room_id: str
    session_id: str
    user_id: str
    username: str
    text: str
    timestamp: Optional[datetime] = None
    speaker_id: Optional[str] = None
    speaker_color: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class TranscriptResponse(BaseModel):
    id: PyObjectId = Field(alias="_id")
    room_id: str
    session_id: str
    user_id: str
    username: str
    text: str
    timestamp: datetime
    speaker_id: Optional[str] = None
    speaker_color: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True
    }

class SessionResponse(BaseModel):
    id: str
    roomName: str
    dateString: str
    durationString: str
    participantsCount: int
    hostName: str
    status: str
    owner_user_id: Optional[str] = None

@router.get("/sessions", response_model=List[SessionResponse])
async def get_all_sessions(current_user: dict = Depends(get_current_user)):
    """
    Get sessions belonging to the authenticated user, sorted by createdAt descending.
    """
    try:
        db = get_database()
        user_id = str(current_user["_id"])
        cursor = db["sessions"].find({"owner_user_id": user_id}).sort("createdAt", -1)
        sessions = []
        async for doc in cursor:
            sessions.append(SessionResponse(
                id=doc["id"],
                roomName=doc["roomName"],
                dateString=doc["dateString"],
                durationString=doc["durationString"],
                participantsCount=doc["participantsCount"],
                hostName=doc["hostName"],
                status=doc["status"],
                owner_user_id=doc.get("owner_user_id")
            ))
        return sessions
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not load sessions: {str(e)}"
        )

@router.post("", response_model=TranscriptResponse, status_code=status.HTTP_201_CREATED)
async def create_transcript_entry(entry: TranscriptCreate):
    """
    Create and store a new transcript record.
    """
    try:
        db = get_database()
        doc = entry.model_dump()
        if doc.get("timestamp") is None:
            doc["timestamp"] = datetime.utcnow()
        
        # Populate optional fields with defaults if not present
        if doc.get("speaker_id") is None:
            doc["speaker_id"] = None
        if doc.get("speaker_color") is None:
            doc["speaker_color"] = None
        if doc.get("metadata") is None:
            doc["metadata"] = {}

        result = await db["transcripts"].insert_one(doc)
        created_doc = await db["transcripts"].find_one({"_id": result.inserted_id})
        if not created_doc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve created transcript entry."
            )
        return created_doc
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not create transcript entry: {str(e)}"
        )

@router.get("/session/{session_id}", response_model=List[TranscriptResponse])
async def get_transcript_by_session(session_id: str):
    """
    Returns transcript entries for a session ordered by timestamp.
    """
    try:
        db = get_database()
        cursor = db["transcripts"].find({"session_id": session_id}).sort("timestamp", 1)
        entries = []
        async for doc in cursor:
            entries.append(doc)
        return entries
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not load transcripts for session: {str(e)}"
        )

@router.get("/session/{session_id}/export")
async def export_transcript(session_id: str, filename: Optional[str] = None):
    """
    Exports transcript as text.
    """
    try:
        db = get_database()
        cursor = db["transcripts"].find({"session_id": session_id}).sort("timestamp", 1)
        
        lines = []
        async for doc in cursor:
            ts: datetime = doc["timestamp"]
            # Format timestamp as 12-hour: [HH:MM AM/PM]
            ts_formatted = ts.strftime("%I:%M %p")
            if ts_formatted.startswith('0'):
                ts_formatted = ts_formatted[1:]
                
            speaker = doc["username"]
            text = doc["text"]
            lines.append(f"[{ts_formatted}] {speaker}:\n{text}")
        
        export_text = "\n\n".join(lines)
        
        final_filename = filename if filename else f"transcript_{session_id}.txt"
        headers = {
            "Content-Disposition": f"attachment; filename={final_filename}"
        }
        return PlainTextResponse(content=export_text, headers=headers)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error exporting transcript: {str(e)}"
        )
