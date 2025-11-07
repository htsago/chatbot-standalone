
import logging
from functools import lru_cache
from typing import Optional

from app.services.llm_service import LLMService
from app.services.gmail_service import GmailService
from app.services.tool_manager import ToolManager
from app.services.vector_store_service import VectorStoreService
from app.services.debug_service import DebugService
from app.core.exceptions import LLMServiceError

logger = logging.getLogger(__name__)


class DIContainer:
    """Dependency Injection Container for managing service instances."""
    
    def __init__(self):
        self._llm_service: Optional[LLMService] = None
        self._gmail_service: Optional[GmailService] = None
        self._tool_manager: Optional[ToolManager] = None
        self._vector_store: Optional[VectorStoreService] = None
        self._debug_service: Optional[DebugService] = None
    
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
    
    def get_gmail_service(self) -> GmailService:
        """Get or create Gmail service instance."""
        if self._gmail_service is None:
            try:
                llm_service = self.get_llm_service()
                self._gmail_service = llm_service.tool_manager._get_gmail_service()
                logger.info("Gmail service initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Gmail service: {str(e)}")
                raise
        return self._gmail_service
    
    def get_tool_manager(self) -> ToolManager:
        """Get or create ToolManager instance."""
        if self._tool_manager is None:
            llm_service = self.get_llm_service()
            self._tool_manager = llm_service.tool_manager
        return self._tool_manager
    
    def get_vector_store(self) -> VectorStoreService:
        """Get or create VectorStoreService instance."""
        if self._vector_store is None:
            llm_service = self.get_llm_service()
            self._vector_store = llm_service.vector_store
        return self._vector_store
    
    def get_debug_service(self) -> DebugService:
        """Get or create DebugService instance."""
        if self._debug_service is None:
            llm_service = self.get_llm_service()
            self._debug_service = llm_service.debug_service
        return self._debug_service
    
    def reset(self):
        """Reset all service instances (useful for testing)."""
        self._llm_service = None
        self._gmail_service = None
        self._tool_manager = None
        self._vector_store = None
        self._debug_service = None


# Global container instance
_container: Optional[DIContainer] = None


def get_container() -> DIContainer:
    """Get the global DI container instance."""
    global _container
    if _container is None:
        _container = DIContainer()
    return _container


def reset_container():
    """Reset the global DI container (useful for testing)."""
    global _container
    if _container is not None:
        _container.reset()
    _container = None


# FastAPI dependency functions
@lru_cache()
def get_llm_service() -> LLMService:
    """FastAPI dependency for LLM service."""
    return get_container().get_llm_service()


def get_gmail_service() -> GmailService:
    """FastAPI dependency for Gmail service."""
    return get_container().get_gmail_service()


def get_tool_manager() -> ToolManager:
    """FastAPI dependency for ToolManager."""
    return get_container().get_tool_manager()

