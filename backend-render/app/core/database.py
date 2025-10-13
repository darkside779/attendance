from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
import logging

# Fix DATABASE_URL if it's malformed (Render sometimes provides HTTP URLs)
def get_database_url():
    db_url = settings.DATABASE_URL
    
    # If DATABASE_URL starts with http/https, it's likely malformed
    if db_url.startswith(("http://", "https://")):
        logging.warning(f"⚠️ Invalid DATABASE_URL detected: {db_url[:50]}...")
        logging.info("🔄 Falling back to SQLite database")
        return "sqlite:///./attendance.db"
    
    # If no DATABASE_URL provided, use SQLite
    if not db_url or db_url == "":
        logging.info("📁 No DATABASE_URL provided, using SQLite")
        return "sqlite:///./attendance.db"
    
    return db_url

# Get the corrected database URL
DATABASE_URL = get_database_url()
logging.info(f"🔗 Using database: {DATABASE_URL.split('://')[0]}://...")

# Create database engine with conditional connect_args
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}  # SQLite specific

engine = create_engine(
    DATABASE_URL,
    echo=settings.DEBUG,  # Log SQL queries in debug mode
    pool_pre_ping=True,   # Verify connections before use
    pool_recycle=300,     # Recycle connections every 5 minutes
    connect_args=connect_args
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
