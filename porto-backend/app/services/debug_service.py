"""Debug service for tracking tool executions and debug information."""
import logging
import json
from datetime import datetime
from typing import Optional, Any

from app.models.chat import ToolExecution

logger = logging.getLogger(__name__)


class DebugService:
    """Service for tracking and storing debug information."""
    
    def __init__(self):
        """Initialize debug service."""
        self.tool_executions: list[ToolExecution] = []
        self.model_responses: list[str] = []
        self.agent_response: Optional[dict] = None
        self.is_enabled = False
    
    def enable(self):
        """Enable debug mode."""
        self.is_enabled = True
        self.tool_executions.clear()
        self.model_responses.clear()
        logger.info("Debug mode enabled")
    
    def disable(self):
        """Disable debug mode."""
        self.is_enabled = False
        logger.info("Debug mode disabled")
    
    def reset(self):
        """Reset debug information."""
        self.tool_executions.clear()
        self.model_responses.clear()
        self.agent_response = None
    
    def track_tool_execution(
        self,
        tool_name: str,
        args: dict,
        result: str,
        execution_time_ms: float,
        error: Optional[str] = None
    ):
        """Track a tool execution."""
        if not self.is_enabled:
            return
        
        execution = ToolExecution(
            tool_name=tool_name,
            args=args,
            result=result,
            execution_time_ms=execution_time_ms,
            timestamp=datetime.now().isoformat(),
            error=error
        )
        self.tool_executions.append(execution)
        logger.debug(f"Tracked tool execution: {tool_name}")
    
    def track_model_response(self, response: str):
        """Track a model response."""
        if not self.is_enabled:
            return
        self.model_responses.append(response)
    
    def track_agent_response(self, response: Any):
        """Track the full agent response object."""
        if not self.is_enabled:
            return
        try:
            if isinstance(response, dict):
                self.agent_response = self._serialize_response(response)
            else:
                self.agent_response = {"raw": str(response)}
        except Exception as e:
            logger.error(f"Error serializing agent response: {e}")
            self.agent_response = {"error": f"Could not serialize response: {str(e)}"}
    
    def _serialize_response(self, response: dict) -> dict:
        """Serialize response object to JSON-serializable format."""
        def serialize_value(value):
            if isinstance(value, (str, int, float, bool, type(None))):
                return value
            elif isinstance(value, dict):
                return {k: serialize_value(v) for k, v in value.items()}
            elif isinstance(value, list):
                return [serialize_value(item) for item in value]
            elif hasattr(value, '__dict__'):
                try:
                    return serialize_value(value.__dict__)
                except:
                    return str(value)
            else:
                try:
                    json.dumps(value)
                    return value
                except:
                    return str(value)
        
        return serialize_value(response)
    
    def get_debug_info(self) -> dict:
        """Get all debug information."""
        if not self.is_enabled:
            return {}
        
        return {
            "tool_executions": [
                {
                    "tool_name": ex.tool_name,
                    "args": ex.args,
                    "result": ex.result,
                    "execution_time_ms": ex.execution_time_ms,
                    "timestamp": ex.timestamp,
                    "error": ex.error
                }
                for ex in self.tool_executions
            ],
            "model_responses": self.model_responses,
            "agent_response": self.agent_response,
            "total_tool_calls": len(self.tool_executions),
            "total_model_responses": len(self.model_responses)
        }

