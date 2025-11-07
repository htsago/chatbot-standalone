import os

INDEX_PATH = "portfolio-db"
DATABASE_PATH = "data/portfolio-knowledge.json"

DEFAULT_MODEL = "openai/gpt-oss-20b"
DEFAULT_TEMPERATURE = 0.7
RETRIEVAL_K = 2
STREAM_DELAY = 0.01

# Gmail OAuth constants
DEFAULT_API_BASE_URL = "http://localhost:8090"
GMAIL_CALLBACK_PATH = "/api/v1/gmail/callback"


def get_gmail_redirect_uri() -> str:
    """Get Gmail OAuth redirect URI."""
    api_base_url = os.getenv("API_BASE_URL", DEFAULT_API_BASE_URL)
    return f"{api_base_url}{GMAIL_CALLBACK_PATH}"
