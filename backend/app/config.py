"""
Application settings loaded from environment variables.

Depends on: pydantic-settings
Used by: main.py, knowledge_service.py
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    knowledge_base_path: str = "app/knowledge/knowledge_base.json"
    sessions_log_path: str = "app/knowledge/sessions.json"
    procedures_dir: str = "app/knowledge/procedures"
    cors_origins: str = "*"
    gemini_api_key: str = ""


settings = Settings()
