export type ProviderId = 'openai' | 'anthropic' | 'gemini' | 'openrouter' | 'ollama' | 'lmstudio' | 'mock'

export interface ProviderConfig {
  id: ProviderId
  name: string
  endpoint?: string // custom baseURL
  apiKey?: string // stored via secure store, never in this object in logs
  model: string
  enabled: boolean
  streaming: boolean
  timeoutMs: number
  maxTokens?: number
  temperature?: number
  budget?: { monthlyUsd?: number }
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string
  toolCallId?: string
  toolCalls?: ToolCall[]
}

export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface ChatRequest {
  messages: ChatMessage[]
  model?: string
  stream?: boolean
  tools?: ProviderTool[]
  temperature?: number
  maxTokens?: number
}

export interface ProviderTool {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export interface ChatChunk {
  delta: string
  done: boolean
  usage?: { promptTokens: number; completionTokens: number; totalTokens: number }
  toolCalls?: ToolCall[]
}

export interface ProviderAdapter {
  id: ProviderId
  name: string
  capabilities: ('chat' | 'stream' | 'tools' | 'vision')[]
  chat(req: ChatRequest, signal?: AbortSignal): Promise<ChatChunk>
  chatStream(req: ChatRequest, onChunk: (c: ChatChunk)=>void, signal?: AbortSignal): Promise<ChatChunk>
  testConnection(): Promise<{ ok: boolean; latencyMs: number; error?: string; models?: string[] }>
  listModels(): Promise<string[]>
}
