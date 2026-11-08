import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load env variables (useful in standalone scripts/testing)
load_dotenv()

logger = logging.getLogger("interact.database")

# Centralized MongoDB Client references
client: AsyncIOMotorClient = None
database = None

from fastapi import HTTPException, status

def get_database():
    """
    Returns the shared database instance.
    Raises HTTPException 503 if the database connection has not been initialized.
    """
    global database
    if database is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is unavailable. Please verify MONGODB_URI and MongoDB Atlas Network Access."
        )
    return database

async def connect_to_mongo():
    """
    Initializes the shared AsyncIOMotorClient and database connection using environment configurations.
    """
    global client, database
    
    mongodb_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    database_name = os.getenv("DATABASE_NAME", "interact")
    
    safe_host = mongodb_uri.split('@')[-1] if '@' in mongodb_uri else mongodb_uri
    logger.info(f"Connecting to MongoDB at {safe_host}...")
    try:
        client = AsyncIOMotorClient(
            mongodb_uri,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=5000
        )
        database = client[database_name]
        # Ping to verify authentication and connection
        await client.admin.command('ping')

        # Create indexes
        await database["messages"].create_index([("roomCode", 1), ("timestamp", 1)])
        await database["transcripts"].create_index([("session_id", 1), ("timestamp", 1)])
        await database["sessions"].create_index("id", unique=True)
        await database["users"].create_index("email", unique=True)
        logger.info(f"Successfully connected to MongoDB Database: {database_name} (indexes verified)")
        
        # Seed mock transcripts & sessions for development
        await seed_mock_transcripts(database)
    except Exception as e:
        logger.error(f"MongoDB connection failed: {e}. Server will continue running, but database operations will return 503 until a valid MONGODB_URI is provided.")
        database = None

async def close_mongo_connection():
    """
    Closes the shared AsyncIOMotorClient connection during application shutdown.
    """
    global client, database
    if client:
        logger.info("Closing MongoDB connection...")
        client.close()
        client = None
        database = None
        logger.info("MongoDB connection closed.")

async def seed_mock_transcripts(db):
    """
    Seed mock transcript and session entries if the environment is development
    and the collections are empty.
    """
    env = os.getenv("ENVIRONMENT", "development")
    if env != "development":
        logger.info("Not in development environment. Skipping transcript seeding.")
        return

    try:
        # Seed sessions first
        sess_count = await db["sessions"].count_documents({})
        from datetime import datetime
        if sess_count == 0:
            logger.info("Seeding mock sessions...")
            mock_sessions = [
                {
                    "id": "s1",
                    "roomName": "Q3 Strategy Alignment",
                    "dateString": "Oct 24, 2023 • 10:00 AM",
                    "durationString": "1h 12m",
                    "participantsCount": 7,
                    "hostName": "Alex Smith",
                    "status": "completed",
                    "createdAt": datetime(2023, 10, 24, 10, 0, 0)
                },
                {
                    "id": "s2",
                    "roomName": "Design Critique: CollabOS v2",
                    "dateString": "Oct 23, 2023 • 02:30 PM",
                    "durationString": "45m 00s",
                    "participantsCount": 4,
                    "hostName": "Girish K",
                    "status": "ended",
                    "createdAt": datetime(2023, 10, 23, 14, 30, 0)
                },
                {
                    "id": "s3",
                    "roomName": "API Integration Debugging",
                    "dateString": "Oct 22, 2023 • 11:15 AM",
                    "durationString": "2h 05m",
                    "participantsCount": 2,
                    "hostName": "Marco Rossi",
                    "status": "completed",
                    "createdAt": datetime(2023, 10, 22, 11, 15, 0)
                },
                {
                    "id": "s4",
                    "roomName": "Marketing Launch Sync",
                    "dateString": "Oct 21, 2023 • 09:00 AM",
                    "durationString": "30m 12s",
                    "participantsCount": 13,
                    "hostName": "Sarah Johnson",
                    "status": "completed",
                    "createdAt": datetime(2023, 10, 21, 9, 0, 0)
                }
            ]
            await db["sessions"].insert_many(mock_sessions)
            logger.info("Successfully seeded mock sessions.")

        count = await db["transcripts"].count_documents({})
        if count > 0:
            logger.info("Transcripts collection is not empty. Skipping seeding.")
            return

        logger.info("Seeding mock transcripts for development...")
        from datetime import datetime
        
        mock_entries = [
            # Session s1: Q3 Strategy Alignment (Oct 24, 2023 at 10:00 AM)
            {
                "room_id": "ABC-123",
                "session_id": "s1",
                "user_id": "u1",
                "username": "Girish K",
                "text": "Hello everyone, welcome to our Q3 Strategy Alignment session. Today we want to review our product objectives and align on timeline priorities.",
                "timestamp": datetime(2023, 10, 24, 10, 0, 15),
                "speaker_id": "u1",
                "speaker_color": "bg-indigo-500",
                "metadata": {}
            },
            {
                "room_id": "ABC-123",
                "session_id": "s1",
                "user_id": "u2",
                "username": "Alex Smith",
                "text": "Hi Girish, glad to be here. I've drafted the slide deck for the Q3 objectives and key milestones.",
                "timestamp": datetime(2023, 10, 24, 10, 1, 5),
                "speaker_id": "u2",
                "speaker_color": "bg-emerald-500",
                "metadata": {}
            },
            {
                "room_id": "ABC-123",
                "session_id": "s1",
                "user_id": "u3",
                "username": "Sarah Johnson",
                "text": "Let's make sure we also discuss the marketing budget and campaigns aligned with the launch timeline.",
                "timestamp": datetime(2023, 10, 24, 10, 1, 40),
                "speaker_id": "u3",
                "speaker_color": "bg-rose-500",
                "metadata": {}
            },
            {
                "room_id": "ABC-123",
                "session_id": "s1",
                "user_id": "u4",
                "username": "Gunjan",
                "text": "I agree, especially since we're aiming to release the new Mobile App features next month.",
                "timestamp": datetime(2023, 10, 24, 10, 2, 20),
                "speaker_id": "u4",
                "speaker_color": "bg-amber-500",
                "metadata": {}
            },
            {
                "room_id": "ABC-123",
                "session_id": "s1",
                "user_id": "u1",
                "username": "Girish K",
                "text": "Perfect. Let's start by walking through the product roadmap milestones. Alex, do you want to share your screen?",
                "timestamp": datetime(2023, 10, 24, 10, 3, 10),
                "speaker_id": "u1",
                "speaker_color": "bg-indigo-500",
                "metadata": {}
            },
            {
                "room_id": "ABC-123",
                "session_id": "s1",
                "user_id": "u2",
                "username": "Alex Smith",
                "text": "Sure, sharing screen now. For the core real-time syncing, we are tracking on schedule. We should finish it by mid-quarter.",
                "timestamp": datetime(2023, 10, 24, 10, 4, 2),
                "speaker_id": "u2",
                "speaker_color": "bg-emerald-500",
                "metadata": {}
            },
            {
                "room_id": "ABC-123",
                "session_id": "s1",
                "user_id": "u3",
                "username": "Sarah Johnson",
                "text": "Excellent. That gives the marketing team enough lead time to prepare customer communications.",
                "timestamp": datetime(2023, 10, 24, 10, 5, 12),
                "speaker_id": "u3",
                "speaker_color": "bg-rose-500",
                "metadata": {}
            },
            
            # Session s2: Design Critique: CollabOS v2 (Oct 23, 2023 at 02:30 PM)
            {
                "room_id": "XYZ-789",
                "session_id": "s2",
                "user_id": "u1",
                "username": "Girish K",
                "text": "Welcome to the design critique for CollabOS v2. Let's inspect the new dashboard mockup first.",
                "timestamp": datetime(2023, 10, 23, 14, 30, 20),
                "speaker_id": "u1",
                "speaker_color": "bg-indigo-500",
                "metadata": {}
            },
            {
                "room_id": "XYZ-789",
                "session_id": "s2",
                "user_id": "u5",
                "username": "Marco Rossi",
                "text": "The overall interface layout looks very clean, but I'm slightly concerned about the contrast ratio on the dark mode buttons.",
                "timestamp": datetime(2023, 10, 23, 14, 31, 10),
                "speaker_id": "u5",
                "speaker_color": "bg-violet-500",
                "metadata": {}
            },
            {
                "room_id": "XYZ-789",
                "session_id": "s2",
                "user_id": "u3",
                "username": "Sarah Johnson",
                "text": "Good catch Marco. The indigo accents might need to be a shade lighter to meet WCAG AA contrast standards.",
                "timestamp": datetime(2023, 10, 23, 14, 32, 5),
                "speaker_id": "u3",
                "speaker_color": "bg-rose-500",
                "metadata": {}
            },
            {
                "room_id": "XYZ-789",
                "session_id": "s2",
                "user_id": "u2",
                "username": "Alex Smith",
                "text": "What if we adjust the CSS custom property for `--primary` container color? We can increase its brightness slightly.",
                "timestamp": datetime(2023, 10, 23, 14, 32, 45),
                "speaker_id": "u2",
                "speaker_color": "bg-emerald-500",
                "metadata": {}
            },
            {
                "room_id": "XYZ-789",
                "session_id": "s2",
                "user_id": "u1",
                "username": "Girish K",
                "text": "Let's do that. I'll make the code change in `index.css` and check the hot-reloaded dev build.",
                "timestamp": datetime(2023, 10, 23, 14, 33, 30),
                "speaker_id": "u1",
                "speaker_color": "bg-indigo-500",
                "metadata": {}
            },
            
            # Session s3: API Integration Debugging (Oct 22, 2023 at 11:15 AM)
            {
                "room_id": "DEF-456",
                "session_id": "s3",
                "user_id": "u5",
                "username": "Marco Rossi",
                "text": "I'm running into a 500 error when sending a POST request to create a room. The server log is complaining about connection timeout.",
                "timestamp": datetime(2023, 10, 22, 11, 15, 30),
                "speaker_id": "u5",
                "speaker_color": "bg-violet-500",
                "metadata": {}
            },
            {
                "room_id": "DEF-456",
                "session_id": "s3",
                "user_id": "u1",
                "username": "Girish K",
                "text": "Let me look at the backend env. Are we sure the MONGODB_URI is correctly parsed from the environment file?",
                "timestamp": datetime(2023, 10, 22, 11, 16, 15),
                "speaker_id": "u1",
                "speaker_color": "bg-indigo-500",
                "metadata": {}
            },
            {
                "room_id": "DEF-456",
                "session_id": "s3",
                "user_id": "u5",
                "username": "Marco Rossi",
                "text": "Ah! You're right. The `.env` file in backend was named `.env.example` in my local check.",
                "timestamp": datetime(2023, 10, 22, 11, 17, 2),
                "speaker_id": "u5",
                "speaker_color": "bg-violet-500",
                "metadata": {}
            },
            {
                "room_id": "DEF-456",
                "session_id": "s3",
                "user_id": "u1",
                "username": "Girish K",
                "text": "Copy that. Rename it, configure your database credentials, and start uvicorn again.",
                "timestamp": datetime(2023, 10, 22, 11, 17, 45),
                "speaker_id": "u1",
                "speaker_color": "bg-indigo-500",
                "metadata": {}
            },
            {
                "room_id": "DEF-456",
                "session_id": "s3",
                "user_id": "u5",
                "username": "Marco Rossi",
                "text": "Awesome, that resolved it! Connection established successfully and rooms are now creating.",
                "timestamp": datetime(2023, 10, 22, 11, 18, 20),
                "speaker_id": "u5",
                "speaker_color": "bg-violet-500",
                "metadata": {}
            },
            
            # Session s4: Marketing Launch Sync (Oct 21, 2023 at 09:00 AM)
            {
                "room_id": "MKT-999",
                "session_id": "s4",
                "user_id": "u3",
                "username": "Sarah Johnson",
                "text": "Hey Alex, let's quickly review the release schedule for our marketing channels next week.",
                "timestamp": datetime(2023, 10, 21, 9, 0, 45),
                "speaker_id": "u3",
                "speaker_color": "bg-rose-500",
                "metadata": {}
            },
            {
                "room_id": "MKT-999",
                "session_id": "s4",
                "user_id": "u2",
                "username": "Alex Smith",
                "text": "Sounds good. We need to coordinate the newsletter broadcast, the Twitter announcements, and the Product Hunt page launch.",
                "timestamp": datetime(2023, 10, 21, 9, 1, 30),
                "speaker_id": "u2",
                "speaker_color": "bg-emerald-500",
                "metadata": {}
            },
            {
                "room_id": "MKT-999",
                "session_id": "s4",
                "user_id": "u3",
                "username": "Sarah Johnson",
                "text": "Let's schedule them for Tuesday morning at 9:00 AM EST. That's usually the highest engagement window.",
                "timestamp": datetime(2023, 10, 21, 9, 2, 15),
                "speaker_id": "u3",
                "speaker_color": "bg-rose-500",
                "metadata": {}
            }
        ]
        await db["transcripts"].insert_many(mock_entries)
        logger.info(f"Successfully seeded {len(mock_entries)} mock transcripts.")
    except Exception as e:
        logger.error(f"Failed to seed mock transcripts: {e}")
