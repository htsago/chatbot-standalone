"""Message parsing and extraction utilities."""
import json
import logging
from typing import Any, Optional, Callable

logger = logging.getLogger(__name__)


class MessageParser:
    """Parses and extracts information from agent messages."""
    
    @staticmethod
    def _get_attr(obj: Any, *keys: str) -> Any:
        """Get attribute or dict key, trying multiple keys."""
        for key in keys:
            if isinstance(obj, dict):
                if key in obj:
                    return obj[key]
            elif hasattr(obj, key):
                return getattr(obj, key)
        return None
    
    @staticmethod
    def extract_message_content(result: Any) -> str:
        """Extract the final message content from agent result."""
        if not isinstance(result, dict) or not result.get("messages"):
            return str(result)
        
        messages = result["messages"]
        for msg in reversed(messages):
            msg_type = MessageParser._get_attr(msg, "type")
            if msg_type in ("ai", "assistant"):
                content = (
                    getattr(msg, "content", "") 
                    or (msg.get("content") if isinstance(msg, dict) else "")
                )
                if content:
                    return MessageParser._deduplicate_sentences(content)
        
        if messages:
            msg = messages[-1]
            content = (
                getattr(msg, "content", "") 
                or (msg.get("content") if isinstance(msg, dict) else str(msg))
            )
            return content
        
        return str(result)
    
    @staticmethod
    def _deduplicate_sentences(content: str) -> str:
        """Remove duplicate sentences from content."""
        sentences = content.split('. ')
        unique_sentences = []
        seen = set()
        for sentence in sentences:
            sentence_clean = sentence.strip().lower()
            if sentence_clean and sentence_clean not in seen:
                unique_sentences.append(sentence.strip())
                seen.add(sentence_clean)
        
        result_text = '. '.join(unique_sentences)
        if content.endswith('.') and not result_text.endswith('.'):
            result_text += '.'
        return result_text
    
    @staticmethod
    def extract_links_from_tool_result(tool_result: str) -> list[dict]:
        """Extract links from tool result if it contains __LINKS__ marker."""
        try:
            if "__LINKS__:" in tool_result:
                links_data = json.loads(tool_result.split("__LINKS__:")[-1].strip())
                return links_data.get("links", [])
        except Exception as e:
            logger.debug(f"Error extracting links: {e}")
        return []
    
    @staticmethod
    def collect_tool_call_ids(messages: list, start_idx: int) -> dict[str, str]:
        """Collect tool call IDs and map them to tool names."""
        id_to_name = {}
        for msg in messages[start_idx:]:
            tc_list = MessageParser._get_attr(msg, "tool_calls")
            if not tc_list:
                continue
            for tc in tc_list:
                tc_id = MessageParser._get_attr(tc, "id", "tool_call_id")
                name = (
                    MessageParser._get_attr(tc, "name") 
                    or MessageParser._get_attr(MessageParser._get_attr(tc, "function"), "name")
                )
                if tc_id and name:
                    id_to_name[tc_id] = name
        return id_to_name
    
    @staticmethod
    def collect_tool_results(
        messages: list, 
        start_idx: int, 
        id_to_name: dict[str, str]
    ) -> dict[str, str]:
        """Collect tool results mapped by tool name."""
        results_map = {}
        for msg in messages[start_idx:]:
            msg_type = MessageParser._get_attr(msg, "type")
            tool_call_id = MessageParser._get_attr(msg, "tool_call_id")
            tool_name = MessageParser._get_attr(msg, "name")
            tool_content = MessageParser._get_attr(msg, "content")
            
            if (msg_type == "tool" or tool_call_id or tool_name) and tool_content:
                if tool_call_id and tool_call_id in id_to_name:
                    results_map[id_to_name[tool_call_id]] = str(tool_content)
                elif tool_name:
                    results_map[tool_name] = str(tool_content)
        return results_map
    
    @staticmethod
    def extract_tool_calls(
        result: Any, 
        messages_before: int = 0,
        tool_schema_getter: Optional[Callable[[str], dict]] = None
    ) -> list[dict]:
        """Extract tool calls only from current invocation."""
        if not isinstance(result, dict) or not result.get("messages"):
            return []
        
        messages = result["messages"]
        if not messages:
            return []
        
        id_to_name = MessageParser.collect_tool_call_ids(messages, messages_before)
        tool_results_map = MessageParser.collect_tool_results(messages, messages_before, id_to_name)
        
        tool_calls = []
        for msg in messages[messages_before:]:
            tc_list = MessageParser._get_attr(msg, "tool_calls")
            if not tc_list:
                continue
            
            for tc in tc_list:
                name = (
                    MessageParser._get_attr(tc, "name") 
                    or MessageParser._get_attr(MessageParser._get_attr(tc, "function"), "name")
                )
                args = (
                    MessageParser._get_attr(tc, "args") 
                    or MessageParser._get_attr(MessageParser._get_attr(tc, "function"), "arguments") 
                    or {}
                )
                
                if isinstance(args, str):
                    try:
                        args = json.loads(args)
                    except Exception:
                        args = {}
                
                if not name:
                    continue
                
                tool_base_name = name.replace("_lc", "")
                
                if tool_base_name == "web_search_tool":
                    result_key = name if name in tool_results_map else tool_base_name
                    if result_key in tool_results_map:
                        links = MessageParser.extract_links_from_tool_result(
                            tool_results_map[result_key]
                        )
                        if links:
                            args["links"] = links
                
                tool_call = {
                    "name": name,
                    "args": args,
                    "mcp": False,
                }
                
                if tool_schema_getter:
                    schema = tool_schema_getter(tool_base_name)
                    if schema:
                        tool_call["tool_schema"] = schema
                
                tool_calls.append(tool_call)
        
        return tool_calls

