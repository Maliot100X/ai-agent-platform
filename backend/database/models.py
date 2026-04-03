"""SQLAlchemy database models for the agent platform."""

import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Enum, Float, ForeignKey,
    Integer, String, Text, JSON,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class Agent(Base):
    __tablename__ = "agents"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, unique=True)
    goal = Column(Text, nullable=False)
    status = Column(String(50), default="idle")  # idle, running, paused, error
    provider = Column(String(100), default="fireworks")
    model = Column(String(255), default="accounts/fireworks/routers/kimi-k2p5-turbo")
    config = Column(JSON, default=dict)
    memory = Column(JSON, default=dict)
    skills = Column(JSON, default=list)  # list of skill names
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    logs = relationship("AgentLog", back_populates="agent", lazy="dynamic")
    signals = relationship("Signal", back_populates="agent", lazy="dynamic")


class AgentLog(Base):
    __tablename__ = "agent_logs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("agents.id"), nullable=False)
    level = Column(String(20), default="info")  # debug, info, warning, error
    action = Column(String(255), nullable=False)
    message = Column(Text)
    data = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    agent = relationship("Agent", back_populates="logs")


class Signal(Base):
    __tablename__ = "signals"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    agent_id = Column(UUID(as_uuid=True), ForeignKey("agents.id"), nullable=True)
    symbol = Column(String(50), nullable=False)
    signal_type = Column(String(50), nullable=False)  # buy, sell, hold
    strength = Column(Float, default=0.0)  # 0.0 to 1.0
    price = Column(Float)
    reasoning = Column(Text)
    strategy = Column(String(255))
    metadata_ = Column("metadata", JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    agent = relationship("Agent", back_populates="signals")


class Strategy(Base):
    __tablename__ = "strategies"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False, unique=True)
    type = Column(String(100), nullable=False)  # momentum, mean_reversion, breakout
    status = Column(String(50), default="inactive")  # active, inactive, backtesting
    config = Column(JSON, default=dict)
    performance = Column(JSON, default=dict)  # win_rate, total_pnl, etc.
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    positions = relationship("Position", back_populates="strategy", lazy="dynamic")


class Position(Base):
    __tablename__ = "positions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    strategy_id = Column(UUID(as_uuid=True), ForeignKey("strategies.id"), nullable=True)
    symbol = Column(String(50), nullable=False)
    side = Column(String(10), nullable=False)  # long, short
    entry_price = Column(Float, nullable=False)
    current_price = Column(Float)
    quantity = Column(Float, nullable=False)
    stop_loss = Column(Float)
    take_profit = Column(Float)
    pnl = Column(Float, default=0.0)
    pnl_percent = Column(Float, default=0.0)
    status = Column(String(50), default="open")  # open, closed, stopped
    opened_at = Column(DateTime, default=datetime.utcnow)
    closed_at = Column(DateTime)
    metadata_ = Column("metadata", JSON, default=dict)

    strategy = relationship("Strategy", back_populates="positions")


class Provider(Base):
    __tablename__ = "providers"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(100), nullable=False, unique=True)
    type = Column(String(50), nullable=False)  # fireworks, gemini, ollama, openai
    is_active = Column(Boolean, default=True)
    config = Column(JSON, default=dict)
    usage_stats = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)


class Session(Base):
    __tablename__ = "sessions"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user = Column(String(255), nullable=False)
    token_hash = Column(String(512))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime)
