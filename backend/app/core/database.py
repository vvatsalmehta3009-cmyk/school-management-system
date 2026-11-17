from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from app.core.config import settings


class DatabaseManager:
    """
    Manages SQLAlchemy engine and session lifecycle.
    """
    def __init__(self, db_url: str = settings.DATABASE_URL) -> None:
        self.engine = create_engine(
            db_url,
            pool_pre_ping=True,  # Automatically verifies connection health
            echo=False            # Set to True for SQL query logging during debugging
        )
        self.session_factory = sessionmaker(
            autocommit=False,
            autoflush=False,
            bind=self.engine
        )

    def get_session(self) -> Generator[Session, None, None]:
        """
        Provides a transactional database session for FastAPI dependency injection.
        Ensures the session is safely closed after each HTTP request.
        """
        session: Session = self.session_factory()
        try:
            yield session
        finally:
            session.close()


db_manager = DatabaseManager()

# Base class for SQLAlchemy ORM models
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """FastAPI route dependency to obtain a database session."""
    yield from db_manager.get_session()

