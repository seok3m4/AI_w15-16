export interface RetrievedDocument {
  id: string;
  content: string;
  score: number;
  metadata: Record<string, unknown>;
}

export interface AgentTaskRequest {
  task: string;
  input: string;
  context?: Record<string, unknown>;
}

export interface McpToolCallRequest {
  serverName: string;
  toolName: string;
  arguments: Record<string, unknown>;
}

