from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from encore_location.config import settings

Base = declarative_base()

engine = create_engine(
    settings.database_url,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800,
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
