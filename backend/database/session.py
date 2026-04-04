"""Async database session management.

On Vercel serverless, database is optional. All state is in-memory.
"""

engine = None
async_session = None

try:
    from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
    from backend.config import settings

    if settings.database_url and "localhost" not in settings.database_url:
        engine = create_async_engine(
            settings.database_url,
            echo=False,
            pool_size=5,
            max_overflow=5,
            pool_pre_ping=True,
        )
        async_session = async_sessionmaker(
            engine, class_=AsyncSession, expire_on_commit=False
        )
except Exception:
    pass


async def get_db():
    """Dependency that yields an async database session."""
    if async_session is None:
        yield None
        return
    async with async_session() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
