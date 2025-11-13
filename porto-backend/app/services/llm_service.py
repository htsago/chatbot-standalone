import logging
import uuid
from typing import Optional

from langchain.agents import create_agent
from langchain_groq import ChatGroq
from langgraph.checkpoint.memory import InMemorySaver
from pydantic import BaseModel, Field
from dotenv import load_dotenv

from app.core.prompts import SYSTEM_PROMPT
from app.core.constants import DEFAULT_MODEL, DEFAULT_TEMPERATURE
from app.core.exceptions import LLMServiceError
from app.services.tool_manager import ToolManager
from app.services.vector_store_service import VectorStoreService
from app.services.message_parser import MessageParser
from app.services.debug_service import DebugService

load_dotenv()
logger = logging.getLogger(__name__)


class Context(BaseModel):
    """Context schema for agent conversations."""
    user_id: Optional[str] = Field(default=None, description="User identifier")
    session_id: Optional[str] = Field(default=None, description="Session identifier")


class LLMService:
    """Service for LLM agent interactions."""
    
    def __init__(self):
        try:
            self.vector_store = VectorStoreService.initialize()
            self.tool_manager = ToolManager()
            self.tool_manager.set_vector_store(self.vector_store)
            
            self.current_model = DEFAULT_MODEL
            self.llm = ChatGroq(model=DEFAULT_MODEL, temperature=DEFAULT_TEMPERATURE)
            self.checkpointer = InMemorySaver()
            self.message_parser = MessageParser()
            self.debug_service = DebugService()
            self.agent = self._create_agent()
            self._last_debug_mode = False
            logger.info("LLM service initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing LLM service: {str(e)}")
            raise LLMServiceError(f"Failed to initialize LLM service: {str(e)}") from e

    def _create_agent(self, debug_mode: bool = False):
        """Create LangChain agent with tools."""
        try:
            tools = self.tool_manager.create_langchain_tools(debug_mode=debug_mode, debug_service=self.debug_service if debug_mode else None)
            agent = create_agent(
                model=self.llm,
                tools=tools,
                context_schema=Context,
                system_prompt=SYSTEM_PROMPT,
                checkpointer=self.checkpointer
            )
            logger.info(f"Agent created successfully with {len(tools)} tools")
            return agent
        except Exception as e:
            logger.error(f"Error creating agent: {str(e)}")
            raise LLMServiceError(f"Failed to create agent: {str(e)}") from e

    @staticmethod
    def _get_or_create_thread_id(thread_id: Optional[str] = None) -> str:
        """Get existing thread ID or create a new one."""
        return thread_id if thread_id else str(uuid.uuid4())

    def _get_messages_before_count(self, config: dict) -> int:
        """Get the number of messages before current invocation."""
        try:
            state = self.checkpointer.get(config)
            if isinstance(state, dict):
                return len(state.get("channel_values", {}).get("messages", []))
        except Exception:
            pass
        return 0

    def invoke(self, query: str, thread_id: Optional[str] = None, debug_mode: bool = False, model: Optional[str] = None) -> tuple[str, str, list[dict], Optional[dict]]:
        """Invoke the agent with a query."""
        try:
            if debug_mode:
                self.debug_service.enable()
                self.debug_service.reset()
            else:
                self.debug_service.disable()
            
            # Update LLM if model is provided and different from current
            if model and model != self.current_model:
                self.current_model = model
                self.llm = ChatGroq(model=model, temperature=DEFAULT_TEMPERATURE)
                # Recreate agent with new model
                self.agent = self._create_agent(debug_mode=debug_mode)
                logger.info(f"Switched to model: {model}")
            
            if debug_mode != self._last_debug_mode:
                self.agent = self._create_agent(debug_mode=debug_mode)
                self._last_debug_mode = debug_mode
            
            thread_id = self._get_or_create_thread_id(thread_id)
            config = {"configurable": {"thread_id": thread_id}}
            messages_before = self._get_messages_before_count(config)
            
            result = self.agent.invoke(
                {"messages": [{"role": "user", "content": query}]},
                config=config
            )
            
            if debug_mode:
                self.debug_service.track_agent_response(result)
            
            answer = self.message_parser.extract_message_content(result)
            
            if debug_mode:
                self.debug_service.track_model_response(answer)
            
            tool_calls = self.message_parser.extract_tool_calls(
                result,
                messages_before,
                tool_schema_getter=self.tool_manager.get_tool_schema
            )
            
            debug_info = self.debug_service.get_debug_info() if debug_mode else None
            return answer, thread_id, tool_calls, debug_info
        except Exception as e:
            logger.error(f"Error invoking agent: {str(e)}")
            raise LLMServiceError(f"Failed to process query: {str(e)}") from e
