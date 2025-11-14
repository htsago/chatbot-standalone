import json
import logging
import os
import time
from datetime import datetime
from functools import wraps
from typing import Optional, Any, Callable

from langchain.tools import tool
from langchain_community.vectorstores import FAISS
from tavily import TavilyClient

from app.core.constants import RETRIEVAL_K, WEB_SEARCH_MAX_RESULTS, WEB_SEARCH_CONTENT_MAX_LENGTH
from app.core.exceptions import ToolError, VectorStoreError

logger = logging.getLogger(__name__)


class ToolManager:
    """Manages LangChain tools creation."""

    def __init__(self):
        self._vector_store: Optional[FAISS] = None

    def set_vector_store(self, vector_store: FAISS):
        """Set the vector store for retrieval tools."""
        self._vector_store = vector_store

    @staticmethod
    def _extract_answer(content: str) -> str:
        """Extract answer from document content."""
        try:
            data = json.loads(content) if isinstance(content, str) else content
            return data.get("answer", content).strip() if isinstance(data, dict) else str(content).strip()
        except Exception:
            return str(content).strip()

    def _retriever_impl(self, query: str) -> str:
        """Implementation: Retrieve information from portfolio knowledge base."""
        if self._vector_store is None:
            raise VectorStoreError("Vector store not initialized.")
        try:
            docs = self._vector_store.similarity_search(query, k=RETRIEVAL_K)
            answers = [self._extract_answer(doc.page_content) for doc in docs]
            return "\n\n".join(answers) if answers else ""
        except Exception as e:
            logger.error(f"Retrieval error: {e}")
            raise ToolError(f"Error retrieving information: {e}") from e

    def _web_search_impl(self, query: str) -> str:
        """Implementation: Search the web using Tavily API."""
        try:
            api_key = os.getenv("TAVILY_API_KEY")
            if not api_key:
                return "Web search unavailable. Configure TAVILY_API_KEY."

            response = TavilyClient(api_key=api_key).search(query=query, max_results=WEB_SEARCH_MAX_RESULTS)
            results = response.get("results", [])
            if not results:
                return "No search results found."

            formatted = []
            links = []
            for i, r in enumerate(results[:WEB_SEARCH_MAX_RESULTS], 1):
                title = r.get("title", "No title")
                content = r.get("content", "")
                url = r.get("url", "")

                content_preview = content[:WEB_SEARCH_CONTENT_MAX_LENGTH]
                content_suffix = "..." if len(content) > WEB_SEARCH_CONTENT_MAX_LENGTH else ""
                formatted.append(
                    f"[{i}] {title}\n{content_preview}{content_suffix}\nSource: {url}"
                )
                links.append({"title": title, "url": url})

            return "\n\n".join(formatted) + f"\n\n__LINKS__:{json.dumps({'links': links})}"
        except Exception as e:
            logger.error(f"Web search error: {e}")
            raise ToolError(f"Error performing web search: {e}") from e

    def get_all_tools(self) -> list[dict]:
        """Get all available tools with their schemas."""
        tools_data = [
            {
                "name": "retriever_tool",
                "description": "Retrieve information from portfolio knowledge base about Herman Tsago. USE THIS TOOL EXCLUSIVELY for questions about Herman Tsago (projects, skills, experience, contact, portfolio). DO NOT use web_search_tool for Herman Tsago questions.",
                "parameters": {
                    "query": {
                        "type": "string",
                        "description": "Search query to find relevant information about Herman Tsago"
                    }
                },
                "required": ["query"]
            },
            {
                "name": "get_current_datetime",
                "description": "Get current date and time. Use this tool ONLY for questions about date/time.",
                "parameters": {},
                "required": []
            },
            {
                "name": "web_search_tool",
                "description": "Search the web using Tavily API for general IT questions and technical topics. DO NOT use this tool for questions about Herman Tsago - use retriever_tool instead.",
                "parameters": {
                    "query": {
                        "type": "string",
                        "description": "Search query for web search"
                    }
                },
                "required": ["query"]
            }
        ]
        return tools_data

    def get_tool_schema(self, tool_name: str) -> Optional[dict]:
        """Get schema for a specific tool by name."""
        base_name = tool_name.replace("_lc", "")
        tools = self.get_all_tools()
        for tool in tools:
            if tool["name"] == base_name or tool["name"] == tool_name:
                return {
                    "description": tool.get("description", ""),
                    "parameters": tool.get("parameters", {}),
                    "required": tool.get("required", [])
                }
        return None

    def create_langchain_tools(self, debug_mode: bool = False, debug_service: Optional[Any] = None) -> list[Any]:
        """Create LangChain tools."""
        def create_tracked_impl(impl_func: Callable, tool_name: str, param_names: Optional[list[str]] = None) -> Callable:
            if not debug_mode or debug_service is None:
                return impl_func
            
            @wraps(impl_func)
            def tracked_impl(*args, **kwargs):
                start_time = time.time()
                error = None
                result = None
                
                tool_args = kwargs.copy() if kwargs else {}
                if args:
                    if param_names:
                        for i, arg in enumerate(args):
                            if i < len(param_names):
                                tool_args[param_names[i]] = arg if isinstance(arg, (dict, list, int, float, bool)) or arg is None else str(arg)
                            else:
                                tool_args[f'_arg{i}'] = str(arg) if not isinstance(arg, (dict, list)) else arg
                    else:
                        for i, arg in enumerate(args):
                            tool_args[f'_arg{i}'] = str(arg) if not isinstance(arg, (dict, list)) else arg
                
                try:
                    result = impl_func(*args, **kwargs)
                    return result
                except Exception as e:
                    error = str(e)
                    logger.error(f"Tool {tool_name} error: {e}")
                    raise
                finally:
                    execution_time_ms = (time.time() - start_time) * 1000
                    debug_service.track_tool_execution(
                        tool_name=tool_name,
                        args=tool_args,
                        result=str(result) if result is not None else "",
                        execution_time_ms=execution_time_ms,
                        error=error
                    )
            
            return tracked_impl

        retriever_impl = create_tracked_impl(self._retriever_impl, "retriever_tool", ["query"])
        
        def datetime_impl() -> str:
            """Implementation for get_current_datetime."""
            return datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        datetime_impl = create_tracked_impl(datetime_impl, "get_current_datetime", [])
        
        web_search_impl = create_tracked_impl(self._web_search_impl, "web_search_tool", ["query"])

        @tool
        def retriever_tool(query: str) -> str:
            """Retrieve information from portfolio knowledge base about Herman Tsago. USE THIS TOOL EXCLUSIVELY for questions about Herman Tsago (projects, skills, experience, contact, portfolio). DO NOT use web_search_tool for Herman Tsago questions."""
            return retriever_impl(query)

        @tool
        def get_current_datetime() -> str:
            """Get current date and time. Use this tool ONLY for questions about date/time."""
            return datetime_impl()

        @tool
        def web_search_tool(query: str) -> str:
            """Search the web using Tavily API for general IT questions and technical topics. DO NOT use this tool for questions about Herman Tsago - use retriever_tool instead."""
            return web_search_impl(query)

        return [retriever_tool, get_current_datetime, web_search_tool]