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

@app.on_event("startup")
async def startup_event():
    logger.info("Initializing OmniSync backend modules...")
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down OmniSync backend modules...")
    await close_mongo_connection()

@app.get("/health")
async def health_check():
    return {"status": "ok", "app": "omnisync", "version": "1.0.0"}
