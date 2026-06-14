import os
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

# Load env variables (useful in standalone scripts/testing)
load_dotenv()

logger = logging.getLogger("omnisync.database")

# Centralized MongoDB Client references
client: AsyncIOMotorClient = None
database = None

def get_database():
    """
    Returns the shared database instance.
    Raises RuntimeError if the database connection has not been initialized.
    """
    global database
    if database is None:
        raise RuntimeError("MongoDB Database has not been initialized. Call connect_to_mongo() first.")
    return database

async def connect_to_mongo():
    """
    Initializes the shared AsyncIOMotorClient and database connection using environment configurations.
    """
    global client, database
    
    mongodb_uri = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    database_name = os.getenv("DATABASE_NAME", "omnisync")
    
    logger.info(f"Connecting to MongoDB Atlas at {mongodb_uri.split('@')[-1]}...") # Safe logging: hides auth credentials
    try:
        client = AsyncIOMotorClient(mongodb_uri)
        database = client[database_name]
        # Create indexes
        await database["messages"].create_index([("roomCode", 1), ("timestamp", 1)])
        logger.info(f"Successfully connected to MongoDB Database: {database_name} (indexes verified)")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise e

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
