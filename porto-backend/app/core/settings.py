"""Application settings and configuration management."""
from typing import Optional
from functools import lru_cache
from pydantic import Field

try:
    from pydantic_settings import BaseSettings
except ImportError:
    from pydantic import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    
    # API Settings
    api_base_url: str = "http://localhost:8090"
    api_version: str = "v1"
    
    # LLM Settings
    groq_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    default_model: str = "llama-3.1-70b-versatile"
    default_temperature: float = 0.1
    
    # Vector Store Settings
    portfolio_db_path: str = "portfolio-db"
    knowledge_base_path: str = "data/portfolio-knowledge.json"
    
    # Gmail Settings
    google_client_id: Optional[str] = Field(
        default=None,
        description="Gmail OAuth Client ID (from GOOGLE_CLIENT_ID env var)"
    )
    google_client_secret: Optional[str] = Field(
        default=None,
        description="Gmail OAuth Client Secret (from GOOGLE_CLIENT_SECRET env var)"
    )
    
    @property
    def gmail_client_id(self) -> Optional[str]:
        """Alias for google_client_id for backward compatibility."""
        return self.google_client_id
    
    @property
    def gmail_client_secret(self) -> Optional[str]:
        """Alias for google_client_secret for backward compatibility."""
        return self.google_client_secret
    gmail_token_path: str = "gmail_token.json"
    gmail_callback_path: str = "/api/v1/gmail/callback"
    
    # Tavily Settings
    tavily_api_key: Optional[str] = None
    
    # Application Settings
    debug_mode: bool = True
    log_level: str = "INFO"
    
    # CORS Settings
    cors_origins: str = "*"
    cors_allow_credentials: bool = True
    cors_allow_methods: str = "*"
    cors_allow_headers: str = "*"
    
    class Config:
        env_file = ".env"
        case_sensitive = False
        populate_by_name = True
        extra = "ignore"
    
    @property
    def cors_origins_list(self) -> list[str]:
        """Get CORS origins as a list."""
        return self.cors_origins.split(",") if self.cors_origins != "*" else ["*"]
    
    @property
    def cors_allow_methods_list(self) -> list[str]:
        """Get CORS methods as a list."""
        return self.cors_allow_methods.split(",") if self.cors_allow_methods != "*" else ["*"]
    
    @property
    def cors_allow_headers_list(self) -> list[str]:
        """Get CORS headers as a list."""
        return self.cors_allow_headers.split(",") if self.cors_allow_headers != "*" else ["*"]


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()

