import json
import logging
import os
import subprocess
import tempfile
import sys
import re
from datetime import datetime
from typing import Optional

from langchain.tools import tool
from langchain_community.vectorstores import FAISS
from tavily import TavilyClient

from app.core.constants import RETRIEVAL_K, get_gmail_redirect_uri
from app.core.exceptions import ToolError, VectorStoreError
from app.services.gmail_service import GmailService

logger = logging.getLogger(__name__)


class ToolManager:
    """Manages LangChain tools creation."""

    def __init__(self):
        self._vector_store: Optional[FAISS] = None
        self._gmail_service: Optional[GmailService] = None

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
        """Execute Python code in a safe sandboxed environment."""
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

        if any(op in code_lower for op in ['open(', 'file(', 'with open']):
            if any(mode in code_lower for mode in ['w', 'a', 'x', '+']):
                return "Error: File write operations are not allowed for safety reasons."

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

    @staticmethod
    def _validate_email(email: str) -> bool:
        """Validate email address format."""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))

    def _get_gmail_service(self) -> Optional[GmailService]:
        """Get or create Gmail service instance."""
        if self._gmail_service is None:
            self._gmail_service = GmailService()
        return self._gmail_service
    
    def _format_auth_required_message(self, sender_email: str, auth_url: str) -> str:
        """Format authentication required message with link."""
        return (
            f"GMAIL-AUTHENTIFIZIERUNG ERFORDERLICH\n\n"
            f"Das Gmail-Konto {sender_email} muss zuerst authentifiziert werden, "
            f"bevor E-Mails gesendet werden können.\n\n"
            f"🔗 AUTHENTIFIZIERUNGS-LINK:\n{auth_url}\n\n"
            f"📋 ANLEITUNG:\n"
            f"1. Klicke auf den Link oben\n"
            f"2. Melde dich mit {sender_email} bei Google an\n"
            f"3. Erlaube den Zugriff auf Gmail\n"
            f"4. Nach erfolgreicher Authentifizierung kannst du die E-Mail erneut senden\n\n"
            f"⚠️ WICHTIG: Der Link muss im Browser geöffnet werden."
        )
    
    def _send_email_impl(
        self,
        sender_email: str,
        recipient_email: str,
        subject: str,
        message: str,
        cc: Optional[str] = None,
        bcc: Optional[str] = None
    ) -> str:
        """Send email via Gmail API."""
        if not self._validate_email(sender_email):
            return f"Error: Invalid sender email address: {sender_email}"
        
        if not self._validate_email(recipient_email):
            return f"Error: Invalid recipient email address: {recipient_email}"
        
        if cc and not self._validate_email(cc):
            return f"Error: Invalid CC email address: {cc}"
        
        if bcc and not self._validate_email(bcc):
            return f"Error: Invalid BCC email address: {bcc}"
        
        if not subject or not subject.strip():
            return "Error: Subject cannot be empty"
        
        if not message or not message.strip():
            return "Error: Message cannot be empty"
        
        gmail_service = self._get_gmail_service()
        
        if not gmail_service.client_id or not gmail_service.client_secret:
            return "Error: Google Cloud credentials not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET."
        
        if not gmail_service.is_authenticated():
            redirect_uri = get_gmail_redirect_uri()
            auth_url = gmail_service.get_auth_url(redirect_uri)
            if auth_url:
                return self._format_auth_required_message(sender_email, auth_url)
            else:
                return (
                    f"Gmail-Authentifizierung erforderlich: Das Gmail-Konto {sender_email} "
                    f"muss zuerst authentifiziert werden. Bitte kontaktiere den Administrator."
                )
        
        try:
            result = gmail_service.send_email(
                sender_email, recipient_email, subject, message, cc, bcc
            )
            return result
        except ToolError as e:
            return f"Error: {str(e)}"
        except Exception as e:
            logger.error(f"Error sending email: {e}")
            return f"Error sending email: {str(e)}"

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
            },
            {
                "name": "send_email",
                "description": "Send an email via Gmail API. Use this when the user wants to send an email. Requires Gmail authentication.",
                "parameters": {
                    "sender_email": {
                        "type": "string",
                        "description": "Email address of the sender (must be authenticated Gmail account)"
                    },
                    "recipient_email": {
                        "type": "string",
                        "description": "Email address of the recipient"
                    },
                    "subject": {
                        "type": "string",
                        "description": "Email subject line"
                    },
                    "message": {
                        "type": "string",
                        "description": "Email message body"
                    },
                    "cc": {
                        "type": "string",
                        "description": "Optional CC (carbon copy) email address"
                    },
                    "bcc": {
                        "type": "string",
                        "description": "Optional BCC (blind carbon copy) email address"
                    }
                },
                "required": ["sender_email", "recipient_email", "subject", "message"]
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

    def create_langchain_tools(self, debug_mode: bool = False, debug_service=None) -> list:
        """Create LangChain tools."""
        import time
        from functools import wraps

        def create_tracked_impl(impl_func, tool_name: str, param_names: list = None):
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
        
        def python_impl(code: str, timeout: int = 10):
            return self._execute_python_impl(code, min(timeout, 30))
        python_impl = create_tracked_impl(python_impl, "execute_python_code", ["code", "timeout"])
        
        send_email_impl = create_tracked_impl(
            self._send_email_impl,
            "send_email",
            ["sender_email", "recipient_email", "subject", "message", "cc", "bcc"]
        )

        @tool
        def retriever_tool(query: str) -> str:
            """Retrieve information from portfolio knowledge base about Herman Tsago.
            Use this tool ONLY for questions about Herman Tsago (projects, skills, experience, contact, portfolio)."""
            return retriever_impl(query)

        @tool
        def get_current_datetime() -> str:
            """Get current date and time. Use this tool ONLY for questions about date/time."""
            return datetime_impl()

        @tool
        def web_search_tool(query: str) -> str:
            """Search the web using Tavily API for general IT questions and technical topics."""
            return web_search_impl(query)

        @tool
        def execute_python_code(code: str, timeout: int = 10) -> str:
            """Execute Python code in a safe sandboxed environment.
            Use this for calculations, data processing, or code examples.
            Timeout is in seconds (default: 10, max: 30)."""
            return python_impl(code, timeout)

        @tool
        def send_email(
            sender_email: str,
            recipient_email: str,
            subject: str,
            message: str,
            cc: Optional[str] = None,
            bcc: Optional[str] = None
        ) -> str:
            """Send an email via Gmail API.
            Use this tool when the user wants to send an email.
            Requires Gmail authentication. If not authenticated, returns authentication link.
            The tool validates email addresses and sends the email."""
            return send_email_impl(sender_email, recipient_email, subject, message, cc, bcc)

        return [retriever_tool, get_current_datetime, web_search_tool, execute_python_code, send_email]