import json
import logging
import os
import subprocess
import tempfile
import sys
from datetime import datetime
from typing import Optional

from langchain.tools import tool
from langchain_community.vectorstores import FAISS
from tavily import TavilyClient

from app.core.constants import RETRIEVAL_K
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

            response = TavilyClient(api_key=api_key).search(query=query, max_results=4)
            results = response.get("results", [])
            if not results:
                return "No search results found."

            formatted = []
            links = []
            for i, r in enumerate(results[:4], 1):
                title = r.get("title", "No title")
                content = r.get("content", "")
                url = r.get("url", "")

                formatted.append(
                    f"[{i}] {title}\n{content[:300]}{'...' if len(content) > 300 else ''}\nSource: {url}"
                )
                links.append({"title": title, "url": url})

            return "\n\n".join(formatted) + f"\n\n__LINKS__:{json.dumps({'links': links})}"
        except Exception as e:
            logger.error(f"Web search error: {e}")
            raise ToolError(f"Error performing web search: {e}") from e

    def _execute_python_impl(self, code: str, timeout: int = 10) -> str:
        """Implementation: Execute Python code in a safe sandboxed environment."""
        # Security: Block dangerous operations
        dangerous_patterns = [
            '__import__', 'eval(', 'exec(', 'compile(',
            'input(', 'raw_input(', 'execfile(',
            'reload(', '__builtins__', '__import__',
            'subprocess.', 'os.system', 'os.popen', 'os.exec',
            'shutil.', 'pickle.loads', 'marshal.loads',
        ]

        code_lower = code.lower()
        for pattern in dangerous_patterns:
            if pattern in code_lower:
                return f"Error: Security restriction - '{pattern}' is not allowed for safety reasons."

        # Block file write operations
        if any(op in code_lower for op in ['open(', 'file(', 'with open']):
            if any(mode in code_lower for mode in ['w', 'a', 'x', '+']):
                return "Error: File write operations are not allowed for safety reasons."

        # Cap timeout at 30 seconds
        timeout = min(timeout, 30)

        try:
            with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
                f.write(code)
                temp_file = f.name

            try:
                result = subprocess.run(
                    [sys.executable, temp_file],
                    capture_output=True,
                    text=True,
                    timeout=timeout,
                    cwd=tempfile.gettempdir(),
                    env={**os.environ, 'PYTHONPATH': ''}
                )

                output = []
                if result.stdout:
                    output.append(f"Output:\n{result.stdout}")
                if result.stderr:
                    output.append(f"Errors:\n{result.stderr}")
                if result.returncode != 0:
                    output.append(f"Exit code: {result.returncode}")

                return "\n".join(output) if output else "Code executed successfully (no output)."

            except subprocess.TimeoutExpired:
                return f"Error: Code execution timed out after {timeout} seconds."
            except Exception as e:
                return f"Error executing code: {str(e)}"
            finally:
                try:
                    os.unlink(temp_file)
                except Exception:
                    pass

        except Exception as e:
            logger.error(f"Python execution error: {e}")
            return f"Error: {str(e)}"

    def get_all_tools(self) -> list[dict]:
        """Get all available tools with their schemas."""
        tools_data = [
            {
                "name": "retriever_tool",
                "description": "Retrieve information from portfolio knowledge base.",
                "parameters": {
                    "query": {
                        "type": "string",
                        "description": "Search query to find relevant information"
                    }
                },
                "required": ["query"]
            },
            {
                "name": "get_current_datetime",
                "description": "Get current date and time.",
                "parameters": {},
                "required": []
            },
            {
                "name": "web_search_tool",
                "description": "Search the web using Tavily API.",
                "parameters": {
                    "query": {
                        "type": "string",
                        "description": "Search query for web search"
                    }
                },
                "required": ["query"]
            },
            {
                "name": "execute_python_code",
                "description": "Execute Python code in a safe sandboxed environment. Use this for calculations, data processing, or code examples.",
                "parameters": {
                    "code": {
                        "type": "string",
                        "description": "Python code to execute"
                    },
                    "timeout": {
                        "type": "integer",
                        "description": "Execution timeout in seconds (default: 10, max: 30)"
                    }
                },
                "required": ["code"]
            }
        ]
        return tools_data

    def get_tool_schema(self, tool_name: str) -> Optional[dict]:
        """Get schema for a specific tool by name.
        
        Args:
            tool_name: Tool name (may include LangChain suffixes like '_lc')
            
        Returns:
            Tool schema dict with description, parameters, and required fields, or None if not found
        """
      
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

    def create_langchain_tools(self) -> list:
        """Create LangChain tools."""

        @tool
        def retriever_tool(query: str) -> str:
            """Retrieve information from portfolio knowledge base about Herman Tsago.
            Use this tool ONLY for questions about Herman Tsago (projects, skills, experience, contact, portfolio)."""
            return self._retriever_impl(query)

        @tool
        def get_current_datetime() -> str:
            """Get current date and time. Use this tool ONLY for questions about date/time."""
            return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        @tool
        def web_search_tool(query: str) -> str:
            """Search the web using Tavily API for general IT questions and technical topics."""
            return self._web_search_impl(query)

        @tool
        def execute_python_code(code: str, timeout: int = 10) -> str:
            """Execute Python code in a safe sandboxed environment.
            Use this for calculations, data processing, or code examples.
            Timeout is in seconds (default: 10, max: 30)."""
            return self._execute_python_impl(code, min(timeout, 30))

        return [retriever_tool, get_current_datetime, web_search_tool, execute_python_code]