import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("interact")

app = FastAPI(
    title="InterAct API",
    description="Real-time Collaborative Screen Sharing Platform Backend API",
    version="1.0.0",
)

# CORS middleware configuration
import json

cors_origins_raw = os.getenv("CORS_ORIGINS", "*")
if cors_origins_raw == "*":
    cors_origins = ["*"]
else:
    try:
        cors_origins = json.loads(cors_origins_raw)
        if not isinstance(cors_origins, list):
            cors_origins = [str(cors_origins)]
    except Exception as e:
        logger.error(f"Failed to parse CORS_ORIGINS as JSON array: {e}. Falling back to '*'")
        cors_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.database.mongodb import connect_to_mongo, close_mongo_connection
from app.api.rooms import router as rooms_router
from app.api.transcripts import router as transcripts_router
from app.api.agent import router as agent_router
from app.websocket.connection import connection_manager
from fastapi import WebSocket, WebSocketDisconnect

app.include_router(rooms_router)
app.include_router(transcripts_router)
app.include_router(agent_router)

@app.on_event("startup")
async def startup_event():
    logger.info("Initializing InterAct backend modules...")
    await connect_to_mongo()
    import asyncio
    from app.rooms.manager import room_manager
    asyncio.create_task(room_manager.start_cleanup_loop())

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down InterAct backend modules...")
    await close_mongo_connection()

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    socket_id = await connection_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await connection_manager.handle_message(socket_id, data)
    except WebSocketDisconnect:
        logger.info(f"WebSocket socketId: {socket_id} disconnected")
        await connection_manager.disconnect(socket_id)
    except Exception as e:
        logger.error(f"Error in websocket loop for client {socket_id}: {e}")
        await connection_manager.disconnect(socket_id)

@app.websocket("/ws/audio")
async def websocket_audio_endpoint(websocket: WebSocket, roomCode: str, socketId: str):
    logger.info(f"[WS AUDIO] Entry — roomCode={roomCode} socketId={socketId}")
    from app.rooms.manager import room_manager
    from app.services.transcription.deepgram_service import DeepgramTranscriptionSession
    import asyncio
    
    room_code = roomCode.upper()
    room = await room_manager.get_room(room_code)
    if not room:
        logger.warning(f"[WS AUDIO] Rejecting: room {room_code} not found")
        await websocket.close(code=4004)
        logger.info(f"[WS AUDIO] Sent close(4004) for room {room_code}")
        return
        
    participant = next((p for p in room["participants"] if p["socketId"] == socketId), None)
    if not participant:
        logger.warning(f"[WS AUDIO] Rejecting: participant {socketId} not in room {room_code}")
        await websocket.close(code=4003)
        logger.info(f"[WS AUDIO] Sent close(4003) for socketId {socketId}")
        return
        
    display_name = participant.get("displayName", "Unknown")
    
    deepgram_api_key = os.getenv("DEEPGRAM_API_KEY")
    if not deepgram_api_key:
        logger.error("[WS AUDIO] Rejecting: DEEPGRAM_API_KEY not set")
        await websocket.close(code=4005)
        logger.info("[WS AUDIO] Sent close(4005)")
        return
    
    logger.info(f"[WS AUDIO] All checks passed — accepting websocket for {socketId} ({display_name}) in {room_code}")
    await websocket.accept()
    logger.info(f"[WS AUDIO] Accepted for client {socketId} ({display_name}) in room {room_code}")
    
    async def handle_dg_transcript(text: str, is_final: bool):
        # Broadcast to room via connection manager
        await connection_manager.broadcast_to_room(
            room_code,
            {
                "event": "live_transcript",
                "senderId": socketId,
                "senderName": display_name,
                "text": text,
                "isFinal": is_final
            }
        )
        
        # Persist final transcripts only
        if is_final:
            try:
                from datetime import datetime
                from app.database.mongodb import get_database
                db = get_database()
                # Re-fetch room to get latest session ID if changed
                room_data = await room_manager.get_room(room_code)
                session_id = room_data.get("session_id", room_code) if room_data else room_code
                
                transcript_doc = {
                    "room_id": room_code,
                    "session_id": session_id,
                    "user_id": socketId,
                    "username": display_name,
                    "text": text,
                    "timestamp": datetime.utcnow(),
                    "source": "speech",
                    "speaker_id": socketId,
                    "speaker_color": None,
                    "metadata": {}
                }
                await db["transcripts"].insert_one(transcript_doc)
            except Exception as e:
                logger.error(f"Failed to persist transcript for {display_name}: {e}")
                
    dg_session = DeepgramTranscriptionSession(
        room_code=room_code,
        socket_id=socketId,
        display_name=display_name,
        on_transcript=handle_dg_transcript,
        api_key=deepgram_api_key
    )
    
    try:
        await dg_session.connect()
    except Exception as conn_err:
        logger.error(f"Failed to connect to Deepgram for {display_name}: {conn_err}")
        await websocket.close(code=4006)
        return
        
    async def receive_client_audio():
        try:
            while True:
                data = await websocket.receive_bytes()
                await dg_session.send_audio(data)
        except WebSocketDisconnect:
            logger.info(f"Audio WebSocket disconnected for client {socketId} ({display_name})")
        except Exception as e:
            logger.error(f"Error in client audio receiver for {socketId} ({display_name}): {e}")
        finally:
            await dg_session.close()
            
    audio_task = asyncio.create_task(receive_client_audio())
    dg_task = asyncio.create_task(dg_session.receive_transcripts_loop())
    
    try:
        await asyncio.wait(
            [audio_task, dg_task],
            return_when=asyncio.FIRST_COMPLETED
        )
    finally:
        # Cleanup tasks and close sockets
        await dg_session.close()
        for t in [audio_task, dg_task]:
            if not t.done():
                t.cancel()
        try:
            await websocket.close()
        except Exception:
            pass


@app.get("/health")
async def health_check():
    return {"status": "ok", "app": "interact", "version": "1.0.0"}
