"""Database layer - optional on Vercel serverless."""

try:
    from .models import Base, Agent, AgentLog, Signal, Strategy, Position, Provider, Session
    from .session import get_db, engine, async_session
except ImportError:
    # SQLAlchemy not available (Vercel serverless mode)
    Base = None
    Agent = None
    AgentLog = None
    Signal = None
    Strategy = None
    Position = None
    Provider = None
    Session = None
    get_db = None
    engine = None
    async_session = None
