import { apiRequest } from './client';
import {
  McpCallLogListResponse,
  McpConnectionListResponse,
  McpCredentialCreateRequest,
  McpCredentialCreateResponse,
  McpToolCatalogResponse,
} from './types';

export const mcpQueryKeys = {
  tools: ['mcp', 'tools'] as const,
  connections: ['mcp', 'connections'] as const,
  callLogs: ['mcp', 'callLogs'] as const,
};

export function listMcpTools(): Promise<McpToolCatalogResponse> {
  return apiRequest<McpToolCatalogResponse>('/mcp/tools');
}

export function listMcpConnections(): Promise<McpConnectionListResponse> {
  return apiRequest<McpConnectionListResponse>('/mcp/connections');
}

export function createMcpServerCredential(
  request: McpCredentialCreateRequest,
): Promise<McpCredentialCreateResponse> {
  return apiRequest<McpCredentialCreateResponse>('/mcp/server-credentials', {
    body: request,
    method: 'POST',
  });
}

export function revokeMcpConnection(connectionId: string): Promise<void> {
  return apiRequest<void>(`/mcp/connections/${connectionId}`, {
    method: 'DELETE',
  });
}

export function listMcpCallLogs(): Promise<McpCallLogListResponse> {
  return apiRequest<McpCallLogListResponse>('/mcp/call-logs?page=0&size=20');
}
