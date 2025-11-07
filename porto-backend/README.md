# Portfolio Chatbot Backend

FastAPI backend with LangChain agent, RAG pipeline, and tool integration.

## Features

- **RAG Pipeline**: Retrieval Augmented Generation with FAISS vector database
- **LangChain Agent**: Intelligent tool selection based on queries
- **Thread Management**: Conversation context across multiple messages
- **Web Search**: Tavily API integration
- **Secure Code Execution**: Sandboxed Python code execution

## Setup

1. **Install dependencies:**
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

2. **Configure environment:**
```bash
cp env.example .env
# Add your API keys to .env
```

3. **Run:**
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8090 --reload
```

## Environment Variables

- `GROQ_API_KEY`: Groq API key for LLM
- `OPENAI_API_KEY`: OpenAI API key for embeddings
- `TAVILY_API_KEY`: Tavily API key for web search (optional)

## API Endpoints

- `POST /api/v1/chat` - Send chat message
- `GET /api/v1/tools` - Get available tools
- `GET /health` - Health check

## Project Structure

```
app/
├── api/              # API routes
├── controllers/      # Business logic
├── core/            # Configuration
├── models/          # Pydantic models
├── services/        # Service layer
│   ├── llm_service.py
│   ├── tool_manager.py
│   └── vector_store_service.py
└── main.py          # FastAPI app
```

