import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("omnisync")

app = FastAPI(
    title="OmniSync API",
    description="Real-time Collaborative Screen Sharing Platform Backend API",
    version="1.0.0",
)

# CORS middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.database.mongodb import connect_to_mongo, close_mongo_connection
from app.api.rooms import router as rooms_router
from app.websocket.connection import connection_manager
from fastapi import WebSocket, WebSocketDisconnect

app.include_router(rooms_router)

@app.on_event("startup")
async def startup_event():
    logger.info("Initializing OmniSync backend modules...")
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down OmniSync backend modules...")
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

@app.get("/health")
async def health_check():
    return {"status": "ok", "app": "omnisync", "version": "1.0.0"}
