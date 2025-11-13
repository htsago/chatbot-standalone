from pydantic import BaseModel, Field
from typing import Optional
from dataclasses import dataclass


@dataclass
class Question:
    query: str


@dataclass
class Response:
    answer: str

    def fetch_answer(self) -> dict:
        return {"answer": self.answer}


class ChatRequest(BaseModel):
    """Chat request model."""
    message: str = Field(..., description="User message", min_length=1, max_length=10000)
    thread_id: Optional[str] = Field(default=None, description="Thread ID for conversation continuity")
    debug_mode: bool = Field(default=False, description="Enable debug mode for detailed tool inspection")
    model: Optional[str] = Field(default=None, description="LLM model to use for this request")


@dataclass
class ToolExecution:
    """Tool execution model for debug tracking."""
    tool_name: str
    args: dict
    result: str
    execution_time_ms: float
    timestamp: str
    error: Optional[str] = None


class ToolCall(BaseModel):
    """Tool call model."""
    name: str = Field(..., description="Tool name")
    args: dict = Field(default_factory=dict, description="Tool arguments")
    mcp: bool = Field(default=False, description="MCP tool flag")
    tool_schema: Optional[dict] = Field(default=None, description="Tool schema")


class DebugInfo(BaseModel):
    """Debug information model."""
    tool_executions: list[dict] = Field(default_factory=list, description="Tool execution details")
    model_responses: list[str] = Field(default_factory=list, description="Model responses")
    agent_response: Optional[dict] = Field(default=None, description="Full agent response object")
    total_tool_calls: int = Field(default=0, description="Total number of tool calls")
    total_model_responses: int = Field(default=0, description="Total number of model responses")


class ChatResponse(BaseModel):
    """Chat response model."""
    answer: str = Field(..., description="Answer from the assistant")
    status: str = Field(default="success", description="Response status")
    thread_id: Optional[str] = Field(default=None, description="Thread ID used for this conversation")
    tool_calls: Optional[list[ToolCall]] = Field(default=None, description="List of tool calls made")
    debug_info: Optional[dict] = Field(default=None, description="Debug information (only in debug mode)")
