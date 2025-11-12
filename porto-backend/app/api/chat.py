"""Chat API routes."""
import time
from datetime import datetime
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.controllers.chat_controller import ChatController, get_chat_controller
from app.models.chat import ChatRequest, ChatResponse, Question
from app.core.dependencies import get_llm_service, get_tool_manager

router = APIRouter(prefix="/api/v1", tags=["chat"])


@router.post("/chat", response_model=ChatResponse)
def process_chat_message(
    request: ChatRequest,
    controller: ChatController = Depends(get_chat_controller)
):
    """Process a chat message."""
    return controller.process_chat_message(request)


@router.post("/process_query")
def process_query(
    request: Question,
    controller: ChatController = Depends(get_chat_controller)
):
    """Process a simple query."""
    return controller.process_query(request)


@router.get("/tools")
def get_tools(tool_manager=Depends(get_tool_manager)):
    """Get all available tools with their schemas."""
    return {
        "tools": tool_manager.get_all_tools()
    }


class SandboxToolRequest(BaseModel):
    """Request model for sandbox tool execution."""
    tool_name: str = Field(..., description="Name of the tool to execute")
    args: dict = Field(default_factory=dict, description="Tool arguments")


@router.post("/sandbox/execute")
def execute_tool_in_sandbox(
    request: SandboxToolRequest,
    tool_manager=Depends(get_tool_manager)
):
    """Execute a tool in sandbox mode for testing and experimentation."""
    tool_name = request.tool_name
    args = request.args
    
    tool_impl_map = {
        "retriever_tool": tool_manager._retriever_impl,
        "get_current_datetime": lambda: datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "web_search_tool": tool_manager._web_search_impl,
    }
    
    if tool_name not in tool_impl_map:
        return {
            "success": False,
            "error": f"Tool '{tool_name}' not found",
            "available_tools": list(tool_impl_map.keys()),
            "timestamp": datetime.now().isoformat()
        }
    
    start_time = time.time()
    try:
        tool_func = tool_impl_map[tool_name]
        
        if tool_name == "get_current_datetime":
            result = tool_func()
        else:
            query = args.get("query", "")
            result = tool_func(query)
        
        execution_time_ms = (time.time() - start_time) * 1000
        
        return {
            "success": True,
            "tool_name": tool_name,
            "args": args,
            "result": result,
            "execution_time_ms": execution_time_ms,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        execution_time_ms = (time.time() - start_time) * 1000
        return {
            "success": False,
            "tool_name": tool_name,
            "args": args,
            "error": str(e),
            "execution_time_ms": execution_time_ms,
            "timestamp": datetime.now().isoformat()
        }
