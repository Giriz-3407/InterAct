from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv
import os
import asyncio

load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI")
DATABASE_NAME = os.getenv("DATABASE_NAME")

async def main():
    client = AsyncIOMotorClient(MONGODB_URI)

    db = client[DATABASE_NAME]

    collections = await db.list_collection_names()

    print("Connected Successfully")
    print(f"Database: {DATABASE_NAME}")
    print(collections)

asyncio.run(main())