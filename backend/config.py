"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # AI Provider
    model_provider: str = "vercel"
    model_name: str = "deepseek/deepseek-v3.2"

    # Vercel AI Gateway
    vercel_api_key: Optional[str] = None

    # Fireworks
    fireworks_api_key: Optional[str] = None

    # Gemini
    gemini_api_key: Optional[str] = None

    # Ollama
    ollama_base_url: str = "http://localhost:11434"

    # OpenAI Compatible
    openai_api_key: Optional[str] = None
    openai_base_url: str = "https://api.openai.com/v1"

    # Solana / DeFi
    birdeye_api_key: Optional[str] = None
    helius_api_key: Optional[str] = None
    helius_api_key_2: Optional[str] = None
    helius_api_key_3: Optional[str] = None

    # Database
    database_url: str = "postgresql+asyncpg://agent_user:agent_pass@localhost:5432/agent_platform"
    database_sync_url: str = "postgresql://agent_user:agent_pass@localhost:5432/agent_platform"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # Telegram
    telegram_bot_token: Optional[str] = None
    telegram_admin_chat_id: Optional[str] = None
    telegram_channel_id: Optional[str] = None

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    api_secret_key: str = "change_this_to_a_random_secret_key"

    # Dashboard
    dashboard_url: str = "http://localhost:3000"
    cors_origins: str = "*"

    # Observability
    log_level: str = "INFO"
    enable_metrics: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
