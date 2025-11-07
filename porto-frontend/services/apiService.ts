import { type Message } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8090';

interface ChatRequest {
  message: string;
  thread_id?: string | null;
}

interface ToolCall {
  name: string;
  args: Record<string, any>;
  mcp?: boolean; // MCP-compatible tool indicator
  schema?: {
    description?: string;
    parameters?: Record<string, { type?: string; description?: string }>;
    required?: string[];
  } | null; // MCP tool schema
}

interface ChatResponse {
  answer: string;
  status: string;
  thread_id?: string | null;
  tool_calls?: ToolCall[] | null;
}

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, { type?: string; description?: string }>;
  required: string[];
}

export async function sendChatMessage(
  message: string,
  threadId?: string | null
): Promise<{ answer: string; threadId: string | null; toolCalls?: ToolCall[] | null }> {
  try {
    const requestBody: ChatRequest = {
      message,
      thread_id: threadId || null,
    };

    const response = await fetch(`${API_BASE_URL}/api/v1/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: ChatResponse = await response.json();
    return {
      answer: data.answer,
      threadId: data.thread_id || null,
      toolCalls: data.tool_calls || null,
    };
  } catch (error) {
    console.error('Error sending chat message:', error);
    throw error;
  }
}

export interface ToolsResponse {
  tools: Tool[];
}

export async function getTools(): Promise<ToolsResponse> {
  try {
    const url = `${API_BASE_URL}/api/v1/tools`;
    console.log('Fetching tools from:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('Received data:', data);
    
    return {
      tools: Array.isArray(data.tools) ? data.tools : []
    };
  } catch (error) {
    console.error('Error fetching tools:', error);
    throw error;
  }
}


