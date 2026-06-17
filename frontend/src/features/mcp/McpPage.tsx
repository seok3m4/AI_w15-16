import { Icon } from '@iconify/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import {
  createMcpServerCredential,
  listMcpCallLogs,
  listMcpConnections,
  listMcpTools,
  mcpQueryKeys,
  revokeMcpConnection,
} from '../../lib/api/mcp';
import {
  McpConnectionSummaryResponse,
  McpCredentialCreateResponse,
  McpToolCatalogItem,
} from '../../lib/api/types';
import { formatDate, getErrorMessage } from '../post/utils';

const AVAILABLE_SCOPES = ['memory:read', 'capsule:read', 'friend_memory:read'];

export function McpPage() {
  const queryClient = useQueryClient();
  const [name, setName] = useState('Claude Desktop');
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['memory:read']);
  const [latestCredential, setLatestCredential] = useState<McpCredentialCreateResponse | null>(null);
  const toolsQuery = useQuery({
    queryFn: listMcpTools,
    queryKey: mcpQueryKeys.tools,
  });
  const connectionsQuery = useQuery({
    queryFn: listMcpConnections,
    queryKey: mcpQueryKeys.connections,
  });
  const callLogsQuery = useQuery({
    queryFn: listMcpCallLogs,
    queryKey: mcpQueryKeys.callLogs,
  });
  const createMutation = useMutation({
    mutationFn: createMcpServerCredential,
    onSuccess: (credential) => {
      setLatestCredential(credential);
      queryClient.invalidateQueries({ queryKey: mcpQueryKeys.connections });
    },
  });
  const revokeMutation = useMutation({
    mutationFn: revokeMcpConnection,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mcpQueryKeys.connections });
    },
  });
  const activeConnections = useMemo(
    () => connectionsQuery.data?.items.filter((connection) => connection.status === 'active') ?? [],
    [connectionsQuery.data],
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim() || selectedScopes.length === 0) {
      return;
    }
    createMutation.mutate({
      name: name.trim(),
      scopes: selectedScopes,
    });
  }

  function toggleScope(scope: string) {
    setSelectedScopes((current) =>
      current.includes(scope)
        ? current.filter((item) => item !== scope)
        : [...current, scope],
    );
  }

  return (
    <section className="post-page" aria-labelledby="mcp-title">
      <div className="page-toolbar">
        <div>
          <p className="eyebrow">MCP Integration</p>
          <h2 id="mcp-title">MCP connections</h2>
        </div>
        <button
          className="button button-secondary"
          onClick={() => {
            toolsQuery.refetch();
            connectionsQuery.refetch();
            callLogsQuery.refetch();
          }}
          type="button"
        >
          <Icon icon="solar:refresh-linear" aria-hidden="true" />
          Refresh
        </button>
      </div>

      <section className="ai-summary-panel" aria-labelledby="mcp-create-title">
        <div className="ai-summary-heading">
          <div>
            <p className="eyebrow">Server credential</p>
            <h3 id="mcp-create-title">Issue scoped token</h3>
          </div>
        </div>
        <form className="mcp-credential-form" onSubmit={submit}>
          <label className="field" htmlFor="mcp-name">
            <span>Client name</span>
            <input
              id="mcp-name"
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </label>
          <div className="mcp-scope-grid" role="group" aria-label="MCP scopes">
            {AVAILABLE_SCOPES.map((scope) => (
              <label className="mcp-scope-option" key={scope}>
                <input
                  checked={selectedScopes.includes(scope)}
                  onChange={() => toggleScope(scope)}
                  type="checkbox"
                />
                <span>{scope}</span>
              </label>
            ))}
          </div>
          {createMutation.isError ? (
            <p className="alert alert-error" role="alert">
              {getErrorMessage(createMutation.error, 'Could not issue MCP credential.')}
            </p>
          ) : null}
          <div className="form-actions">
            <button
              className="button button-primary"
              disabled={createMutation.isPending || selectedScopes.length === 0}
              type="submit"
            >
              Issue token
            </button>
          </div>
        </form>
        {latestCredential ? (
          <div className="mcp-token-panel" role="status">
            <span className="memory-badge success">one-time token</span>
            <code>{latestCredential.oneTimeToken}</code>
          </div>
        ) : null}
      </section>

      <div className="mcp-grid">
        <section className="ai-summary-panel" aria-labelledby="mcp-tools-title">
          <div className="ai-summary-heading">
            <div>
              <p className="eyebrow">Tools</p>
              <h3 id="mcp-tools-title">Server tool catalog</h3>
            </div>
          </div>
          {toolsQuery.data?.items.length ? (
            <ul className="memory-result-list">
              {toolsQuery.data.items.map((tool) => (
                <McpToolItem key={tool.name} tool={tool} />
              ))}
            </ul>
          ) : (
            <div className="empty-state">No MCP tools loaded.</div>
          )}
        </section>

        <section className="ai-summary-panel" aria-labelledby="mcp-connections-title">
          <div className="ai-summary-heading">
            <div>
              <p className="eyebrow">Connections</p>
              <h3 id="mcp-connections-title">Active credentials</h3>
            </div>
            <span className="memory-badge">{activeConnections.length} active</span>
          </div>
          {connectionsQuery.data?.items.length ? (
            <ul className="memory-result-list">
              {connectionsQuery.data.items.map((connection) => (
                <McpConnectionItem
                  connection={connection}
                  key={connection.id}
                  onRevoke={() => revokeMutation.mutate(connection.id)}
                  revokeDisabled={revokeMutation.isPending || connection.status !== 'active'}
                />
              ))}
            </ul>
          ) : (
            <div className="empty-state">No MCP connections yet.</div>
          )}
        </section>
      </div>

      <section className="ai-summary-panel" aria-labelledby="mcp-log-title">
        <div className="ai-summary-heading">
          <div>
            <p className="eyebrow">History</p>
            <h3 id="mcp-log-title">Recent MCP calls</h3>
          </div>
        </div>
        {callLogsQuery.data?.items.length ? (
          <ul className="memory-result-list">
            {callLogsQuery.data.items.map((log) => (
              <li className="memory-result-item" key={log.id}>
                <p className="memory-result-title">{log.toolName}</p>
                <div className="memory-result-meta">
                  <span>{log.direction}</span>
                  <span>{log.status}</span>
                  {log.errorCode ? <span>{log.errorCode}</span> : null}
                  <time dateTime={log.createdAt}>{formatDate(log.createdAt)}</time>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">No MCP calls recorded.</div>
        )}
      </section>
    </section>
  );
}

function McpToolItem({ tool }: { tool: McpToolCatalogItem }) {
  return (
    <li className="memory-result-item">
      <p className="memory-result-title">{tool.name}</p>
      <p className="memory-result-snippet">{tool.description}</p>
      <div className="tag-row">
        {tool.requiredScopes.map((scope) => (
          <span className="tag-chip" key={scope}>
            {scope}
          </span>
        ))}
      </div>
    </li>
  );
}

function McpConnectionItem({
  connection,
  onRevoke,
  revokeDisabled,
}: {
  connection: McpConnectionSummaryResponse;
  onRevoke: () => void;
  revokeDisabled: boolean;
}) {
  return (
    <li className="memory-result-item">
      <div className="mcp-connection-row">
        <div>
          <p className="memory-result-title">{connection.name}</p>
          <div className="memory-result-meta">
            <span>{connection.provider}</span>
            <span>{connection.direction}</span>
            <span>{connection.status}</span>
            <time dateTime={connection.updatedAt}>{formatDate(connection.updatedAt)}</time>
          </div>
        </div>
        <button
          aria-label={`Revoke ${connection.name}`}
          className="icon-button danger"
          disabled={revokeDisabled}
          onClick={onRevoke}
          type="button"
        >
          <Icon icon="solar:trash-bin-trash-linear" aria-hidden="true" />
        </button>
      </div>
      <div className="tag-row">
        {connection.scopes.map((scope) => (
          <span className="tag-chip" key={scope}>
            {scope}
          </span>
        ))}
      </div>
    </li>
  );
}
