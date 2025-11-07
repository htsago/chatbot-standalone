"""Application configuration and dependency injection."""
import logging
from functools import lru_cache

from app.services.llm_service import LLMService
from app.core.exceptions import LLMServiceError

logger = logging.getLogger(__name__)

_llm_service: LLMService | None = None


@lru_cache()
def get_llm_service() -> LLMService:
    """
    Get or create LLM service instance (singleton pattern).
    
    Returns:
        LLMService instance
    """
    global _llm_service
    if _llm_service is None:
        try:
            _llm_service = LLMService()
            logger.info("LLM service initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize LLM service: {str(e)}")
            raise LLMServiceError(f"Failed to initialize LLM service: {str(e)}") from e
    return _llm_service


def set_llm_service(service: LLMService):
    """Set LLM service instance (useful for testing)."""
    global _llm_service
    _llm_service = service
