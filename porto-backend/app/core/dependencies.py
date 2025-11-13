
import logging
from functools import lru_cache
from typing import Optional

from app.services.llm_service import LLMService
from app.services.tool_manager import ToolManager
from app.core.exceptions import LLMServiceError

logger = logging.getLogger(__name__)


class DIContainer:
    """Dependency Injection Container for managing service instances."""
    
    def __init__(self):
        self._llm_service: Optional[LLMService] = None
        self._tool_manager: Optional[ToolManager] = None
    
    def get_llm_service(self) -> LLMService:
        """Get or create LLM service instance."""
        if self._llm_service is None:
            try:
                self._llm_service = LLMService()
                logger.info("LLM service initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize LLM service: {str(e)}")
                raise LLMServiceError(f"Failed to initialize LLM service: {str(e)}") from e
        return self._llm_service
    
    def get_tool_manager(self) -> ToolManager:
        """Get or create ToolManager instance."""
        if self._tool_manager is None:
            llm_service = self.get_llm_service()
            self._tool_manager = llm_service.tool_manager
        return self._tool_manager


# Global container instance
_container: Optional[DIContainer] = None


def get_container() -> DIContainer:
    """Get the global DI container instance."""
    global _container
    if _container is None:
        _container = DIContainer()
    return _container


# FastAPI dependency functions
@lru_cache()
def get_llm_service() -> LLMService:
    """FastAPI dependency for LLM service."""
    return get_container().get_llm_service()


def get_tool_manager() -> ToolManager:
    """FastAPI dependency for ToolManager."""
    return get_container().get_tool_manager()

