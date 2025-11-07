"""Chat API routes."""
from fastapi import APIRouter, Depends

from app.controllers.chat_controller import ChatController, get_chat_controller
from app.models.chat import ChatRequest, ChatResponse, Question
from app.core.config import get_llm_service

router = APIRouter(prefix="/api/v1", tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
def process_chat_message(
    request: ChatRequest,
    controller: ChatController = Depends(get_chat_controller)
):
    """
    Process a chat message.
    
    Args:
        request: Chat request with message and optional thread_id
        controller: Chat controller instance (injected)
        
    Returns:
        ChatResponse with answer and tool calls
    """
    return controller.process_chat_message(request)


@router.post("/process_query")
def process_query(
    request: Question,
    controller: ChatController = Depends(get_chat_controller)
):
    """
    Process a simple query.
    
    Args:
        request: Question request with query string
        controller: Chat controller instance (injected)
        
    Returns:
        Dictionary with answer
    """
    return controller.process_query(request)


@router.get("/tools")
def get_tools(llm_service=Depends(get_llm_service)):
    """
    Get all available tools with their schemas.
    
    Args:
        llm_service: LLM service instance (injected)
        
    Returns:
        Dictionary with tools
    """
    tool_manager = llm_service.tool_manager
    return {
        "tools": tool_manager.get_all_tools()
    }
