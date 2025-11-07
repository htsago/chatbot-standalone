# Portfolio AI Assistant

A modern AI-powered chatbot assistant built with React (Frontend) and FastAPI (Backend). This document focuses on the core architectural concepts: how the agent works, conversation management, and memory handling.

## Core Concepts

### How the Agent Works

The system uses **LangChain's agent framework** with **LangGraph** for orchestration. The agent is an autonomous system that:

1. **Receives user queries** and analyzes them using the LLM (ChatGroq)
2. **Decides which tools to use** based on the query content
3. **Executes tools** and processes their results
4. **Generates responses** incorporating tool results

**Agent Architecture:**
```
User Query → LangChain Agent → Tool Selection → Tool Execution → Response Generation
```

**Key Components:**
- **LLM (ChatGroq)**: Processes queries and makes tool selection decisions
- **System Prompt**: Guides agent behavior and tool usage rules
- **Tool Manager**: Provides 4 tools (retriever, web_search, python_exec, datetime)
- **Checkpointer**: Manages conversation state and memory

**Tool Selection Logic:**
- Agent analyzes the query and system prompt
- Determines which tool(s) are needed
- Can use multiple tools in sequence
- Tool results are fed back to the agent for final response

### Conversation Management

Conversations are managed using **thread IDs** that maintain separate conversation contexts.

**Thread ID System:**
- Each conversation gets a unique `thread_id` (UUID)
- Frontend sends `thread_id` with each message to continue conversations
- If no `thread_id` is provided, a new one is generated
- Each thread maintains its own independent conversation history

**Flow:**
```
1. User sends message (with optional thread_id)
2. Backend creates/retrieves thread_id
3. Agent loads conversation state for that thread
4. New message is added to the conversation
5. Agent processes with full context
6. Response includes thread_id for next message
```

**Multi-Conversation Support:**
- Frontend can manage multiple tabs, each with its own `thread_id`
- Each tab maintains independent conversation context
- No cross-contamination between conversations

### Memory Management

Memory is handled by **LangGraph's InMemorySaver** checkpointer, which stores conversation state per thread.

**Memory Architecture:**
```
InMemorySaver (Checkpointer)
  ├── Thread 1: [msg1, msg2, msg3, ...]
  ├── Thread 2: [msg1, msg2, ...]
  └── Thread N: [msg1, ...]
```

**How Memory Works:**
1. **State Storage**: Each thread's state contains all messages in the conversation
2. **State Loading**: When a message arrives, the checkpointer loads the thread's state
3. **State Update**: New messages are appended to the existing state
4. **Message Extraction**: Only new messages/tool calls from current invocation are extracted for response

**Memory Components:**
- **Checkpointer**: `InMemorySaver()` - stores state in memory (lost on restart)
- **State Structure**: Contains `channel_values.messages` array with full conversation
- **Message Tracking**: `_get_messages_before_count()` tracks message count to extract only new tool calls

**Memory Limitations:**
- In-memory storage (not persistent across restarts)
- Each thread's memory grows with conversation length
- No automatic memory pruning (all messages retained)

## System Architecture

```
┌─────────────┐
│  Frontend   │
│  (React)    │
│             │
│ - Tabs      │
│ - Messages  │
│ - thread_id │
└──────┬──────┘
       │ HTTP/REST
       │ thread_id in request
       ▼
┌─────────────┐
│   Backend   │
│  (FastAPI)  │
│             │
│ - Controller│
│ - LLMService│
│ - Agent     │
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  LangChain      │
│  Agent          │
│                 │
│ - LLM (Groq)    │
│ - Checkpointer  │
│ - Tools         │
└─────────────────┘
```

## Data Flow

1. **User sends message** → Frontend includes `thread_id` (if continuing conversation)
2. **Controller validates** → Extracts message and thread_id
3. **LLMService processes**:
   - Creates/retrieves thread_id
   - Loads conversation state from checkpointer
   - Counts existing messages
4. **Agent invokes**:
   - Receives new message + full conversation context
   - Decides which tools to use
   - Executes tools
   - Generates response
5. **Message Parser extracts**:
   - Final answer from agent response
   - Only new tool calls (by comparing message count)
6. **Response sent** → Includes answer, thread_id, and tool_calls

## Tools

The agent has access to 5 tools:

1. **retriever_tool**: Searches portfolio knowledge base (FAISS vector store)
2. **web_search_tool**: Searches web using Tavily API
3. **execute_python_code**: Safely executes Python code in sandbox
4. **get_current_datetime**: Returns current date and time
5. **send_email**: Sends emails via Gmail API

**Tool Selection:**
- Agent decides autonomously based on query
- System prompt guides when to use each tool
- Can chain multiple tools if needed

## Quick Start

### Prerequisites
- Python 3.10+, Node.js 18+
- API Keys: Groq, OpenAI, Tavily (optional), Google Cloud (for Gmail)

### Getting API Keys

**Required:**
- **Groq API Key**: Get from [https://console.groq.com/](https://console.groq.com/) - Free tier available
- **OpenAI API Key**: Get from [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys) - For embeddings

**Optional:**
- **Tavily API Key**: Get from [https://tavily.com/](https://tavily.com/) - For web search functionality
- **Google Cloud Credentials**: 
  - Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
  - Create OAuth 2.0 credentials
  - Enable Gmail API
  - Get `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`

### Installation

**Backend:**
```bash
cd porto-backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp env.example .env
# Add API keys to .env
```

**Frontend:**
```bash
cd porto-frontend
npm install
```

### Running

**Backend:**
```bash
cd porto-backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8090 --reload
```

**Frontend:**
```bash
cd porto-frontend
npm run dev
```

## API

### `POST /api/v1/chat`
Send message with optional thread_id for conversation continuity.

**Request:**
```json
{
  "message": "What are your main projects?",
  "thread_id": "uuid-thread-id"  // optional
}
```

**Response:**
```json
{
  "answer": "My main projects are...",
  "status": "success",
  "thread_id": "uuid-thread-id",
  "tool_calls": [...]
}
```

## Tech Stack

**Frontend:** React 19, TypeScript, Vite, Tailwind CSS

**Backend:** FastAPI, LangChain, LangGraph, ChatGroq, FAISS, OpenAI Embeddings

## License

MIT License

## Author

**Herman Tsago** - AI Engineer & Master's Student
