"""Chat controller for handling chat requests."""
import logging
from typing import Optional, Any

from fastapi import HTTPException, Depends

from app.core.dependencies import get_llm_service
from app.core.exceptions import ValidationError, LLMServiceError
from app.models.chat import ChatRequest, ChatResponse, Question, Response, ToolCall
from app.services.llm_service import LLMService

logger = logging.getLogger(__name__)


class ChatController:
    """Controller for chat-related operations."""
    
    def __init__(self, llm_service: LLMService):
        self.llm_service = llm_service
    
    def process_chat_message(self, request: ChatRequest) -> ChatResponse:
        """Process a chat message request."""
        try:
            message = self._validate_message(request.message)
            answer, used_thread_id, tool_calls, debug_info = self.llm_service.invoke(
                message, 
                thread_id=request.thread_id,
                debug_mode=request.debug_mode
            )
            
            tool_call_models = self._convert_tool_calls(tool_calls)
            
            return ChatResponse(
                answer=answer,
                status="success",
                thread_id=used_thread_id,
                tool_calls=tool_call_models,
                debug_info=debug_info
            )
        except ValidationError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except LLMServiceError as e:
            logger.error(f"LLM service error: {e}")
            raise HTTPException(status_code=500, detail="Error processing your message")
        except Exception as e:
            logger.error(f"Unexpected error: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="Internal server error")
    
    def process_query(self, request: Question) -> dict[str, Any]:
        """Process a simple query request."""
        try:
            query = self._validate_message(request.query)
            answer, _, _, _ = self.llm_service.invoke(query)
            return Response(answer=answer).fetch_answer()
        except ValidationError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except LLMServiceError as e:
            logger.error(f"LLM service error: {e}")
            raise HTTPException(status_code=500, detail="Error processing query")
        except Exception as e:
            logger.error(f"Unexpected error: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="Internal server error")
    
    @staticmethod
    def _convert_tool_calls(tool_calls: Optional[list[dict[str, Any]]]) -> Optional[list[ToolCall]]:
        """Convert tool calls from dict to ToolCall models."""
        if not tool_calls:
            return None
        return [
            ToolCall(
                name=tc["name"],
                args=tc["args"],
                mcp=tc.get("mcp", False),
                tool_schema=tc.get("tool_schema")
            )
            for tc in tool_calls
        ]
    
    @staticmethod
    def _validate_message(message: Optional[str]) -> str:
        """Validate message string."""
        if not message or not message.strip():
            raise ValidationError("Message cannot be empty")
        return message.strip()


def get_chat_controller(
    llm_service: LLMService = Depends(get_llm_service)
) -> ChatController:
    """Dependency injection for ChatController."""
    return ChatController(llm_service)

