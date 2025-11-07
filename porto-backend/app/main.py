"""Main FastAPI application."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from app.api.chat import router as chat_router
from app.api.gmail import router as gmail_router
from app.core.middleware import LoggingMiddleware, SecurityHeadersMiddleware
from app.core.settings import get_settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Get settings
settings = get_settings()

# Create FastAPI app
app = FastAPI(
    title="Herman AI - Portfolio Chatbot API",
    description="AI-powered chatbot for Herman Tsago's portfolio",
    version="1.0.0"
)

# Add middleware (order matters - first added is outermost)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(LoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=settings.cors_allow_credentials,
    allow_methods=settings.cors_allow_methods_list,
    allow_headers=settings.cors_allow_headers_list,
)

# Include routers
app.include_router(chat_router)
app.include_router(gmail_router)

@app.get("/")
def root():
    return {"message": "Portfolio Chatbot API is running", "status": "healthy"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "portfolio-chatbot"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8090)
