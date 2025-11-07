import { type Message } from '../types';

// Use environment variable if set, otherwise use relative path for production or localhost for development
// In production with Nginx, set VITE_API_BASE_URL to empty string or '/api' to use relative paths
// For local development, leave unset to use 'http://localhost:8090'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.PROD ? '' : 'http://localhost:8090');

interface ChatRequest {
  message: string;
  thread_id?: string | null;
  debug_mode?: boolean;
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
  debug_info?: {
    tool_executions?: Array<{
      tool_name: string;
      args: Record<string, any>;
      result: string;
      execution_time_ms: number;
      timestamp: string;
      error?: string | null;
    }>;
    model_responses?: string[];
    agent_response?: Record<string, any> | null;
    total_tool_calls?: number;
    total_model_responses?: number;
  } | null;
}

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, { type?: string; description?: string }>;
  required: string[];
}

export async function sendChatMessage(
  message: string,
  threadId?: string | null,
  debugMode?: boolean
): Promise<{ answer: string; threadId: string | null; toolCalls?: ToolCall[] | null; debugInfo?: any }> {
  try {
    const requestBody: ChatRequest = {
      message,
      thread_id: threadId || null,
      debug_mode: debugMode || false,
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
      debugInfo: data.debug_info || null,
    };
  } catch (error) {
    console.error('Error sending chat message:', error);
    throw error;
  }
}

export interface SandboxExecutionRequest {
  tool_name: string;
  args: Record<string, any>;
}

export interface SandboxExecutionResponse {
  success: boolean;
  tool_name: string;
  args: Record<string, any>;
  result?: string;
  error?: string;
  execution_time_ms: number;
  timestamp: string;
}

export async function executeToolInSandbox(
  request: SandboxExecutionRequest
): Promise<SandboxExecutionResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/sandbox/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: SandboxExecutionResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error executing tool in sandbox:', error);
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

export interface GmailAuthResponse {
  auth_url: string;
}

export interface GmailStatusResponse {
  authenticated: boolean;
  has_credentials: boolean;
  status: string;
  error?: string;
}

export async function getGmailAuthUrl(redirectUri: string): Promise<GmailAuthResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/gmail/auth?redirect_uri=${encodeURIComponent(redirectUri)}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting Gmail auth URL:', error);
    throw error;
  }
}

export async function getGmailStatus(): Promise<GmailStatusResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/gmail/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting Gmail status:', error);
    throw error;
  }
}


