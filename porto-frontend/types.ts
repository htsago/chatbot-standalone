
export type MessageRole = 'user' | 'model' | 'tool';

export interface FunctionCall {
  name: string;
  args: Record<string, any>;
  mcp?: boolean; // Tool indicator (kept for backward compatibility)
  schema?: {
    description?: string;
    parameters?: Record<string, { type?: string; description?: string }>;
    required?: string[];
  } | null; // Tool schema
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  in_stock: boolean;
  rating: number;
}

export interface Order {
  order_id: string;
  customer_id: string;
  status: string;
  order_date: string;
  estimated_delivery: string;
  total_amount: number;
  tracking_number: string;
  items_count: number;
}

export interface CartItem {
    product_id: string;
    name: string;
    quantity: number;
    price: number;
}

export interface Cart {
    cart_id: string;
    customer_id: string;
    items: CartItem[];
    item_count: number;
    subtotal: number;
    tax: number;
    total: number;
}

export interface Recommendation {
    id: string;
    name: string;
    price: number;
    reason: string;
}

export type ToolResultContent = Product[] | Order | { status: string } | Cart | { valid: boolean } | Recommendation[];

export interface Message {
  id: string;
  role: MessageRole;
  text?: string;
  timestamp?: Date;
  isStreaming?: boolean;
  toolCalls?: FunctionCall[];
  toolResult?: {
    name: string;
    result: ToolResultContent;
  };
}
