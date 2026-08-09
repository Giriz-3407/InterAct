import os
from datetime import datetime, timedelta
import bcrypt
import jwt
from bson import ObjectId
from app.database.mongodb import get_database

# Load JWT config with defaults from environment
JWT_SECRET = os.getenv("JWT_SECRET", "interact-super-secret-development-key-1234567890")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080")) # Default 7 days

def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its bcrypt hash."""
    try:
        return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))
    except Exception:
        return False

def create_access_token(data: dict, expires_delta: timedelta = None) -> str:
    """Generate a signed JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_access_token(token: str) -> dict:
    """Decode a JWT access token. Returns payload or None if invalid/expired."""
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None

async def get_user_by_email(email: str) -> dict:
    """Retrieve user document from MongoDB by email (case-insensitive)."""
    db = get_database()
    return await db["users"].find_one({"email": email.strip().lower()})

async def get_user_by_id(user_id: str) -> dict:
    """Retrieve user document from MongoDB by its ObjectId string."""
    db = get_database()
    try:
        obj_id = ObjectId(user_id)
        return await db["users"].find_one({"_id": obj_id})
    except Exception:
        return None

async def create_user(full_name: str, email: str, password_plain: str) -> dict:
    """Insert a new user document with hashed password in the database."""
    db = get_database()
    hashed = hash_password(password_plain)
    user_doc = {
        "fullName": full_name.strip(),
        "email": email.strip().lower(),
        "passwordHash": hashed,
        "createdAt": datetime.utcnow()
    }
    result = await db["users"].insert_one(user_doc)
    user_doc["_id"] = result.inserted_id
    return user_doc

async def update_user_profile(user_id: str, full_name: str = None, email: str = None) -> dict:
    """Update user's full name and/or email."""
    db = get_database()
    update_fields = {}
    if full_name is not None and full_name.strip():
        update_fields["fullName"] = full_name.strip()
    if email is not None and email.strip():
        update_fields["email"] = email.strip().lower()
    
    if update_fields:
        await db["users"].update_one({"_id": ObjectId(user_id)}, {"$set": update_fields})
    return await get_user_by_id(user_id)

async def change_user_password(user_id: str, new_password_plain: str) -> bool:
    """Update user's password hash."""
    db = get_database()
    hashed = hash_password(new_password_plain)
    result = await db["users"].update_one({"_id": ObjectId(user_id)}, {"$set": {"passwordHash": hashed}})
    return result.modified_count > 0

