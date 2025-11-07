"""Custom exceptions for the application."""


class ChatbotException(Exception):
    """Base exception for all chatbot-related errors."""
    pass


class VectorStoreError(ChatbotException):
    """Exception raised for vector store errors."""
    pass


class ToolError(ChatbotException):
    """Exception raised for tool-related errors."""
    pass


class LLMServiceError(ChatbotException):
    """Exception raised for LLM service errors."""
    pass


class ValidationError(ChatbotException):
    """Exception raised for validation errors."""
    pass



