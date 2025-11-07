"""Chat-related data models."""
from pydantic import BaseModel, Field


class Question(BaseModel):
    """Question request model."""
    query: str = Field(..., description="User query string", min_length=1)


class Response(BaseModel):
    """Response model."""
    answer: str = Field(..., description="Answer to the query")

    def fetch_answer(self) -> dict:
        """Get answer as dictionary."""
        return {"answer": self.answer}


class ChatRequest(BaseModel):
    """Chat request model."""
    message: str = Field(..., description="User message", min_length=1)
    thread_id: str | None = Field(default=None, description="Thread ID for conversation continuity")


class ToolCall(BaseModel):
    """Tool call model."""
    name: str = Field(..., description="Tool name")
    args: dict = Field(default_factory=dict, description="Tool arguments")
    tool_schema: dict | None = Field(
        default=None, 
        serialization_alias="schema",
        description="Tool schema"
    )


class ChatResponse(BaseModel):
    """Chat response model."""
    answer: str = Field(..., description="Answer from the assistant")
    status: str = Field(default="success", description="Response status")
    thread_id: str | None = Field(default=None, description="Thread ID used for this conversation")
    tool_calls: list[ToolCall] | None = Field(default=None, description="List of tool calls made")
