import type { LocaleCode } from "../../../i18n/i18n";
import { xsrfToken } from "../../../api/backend";

export interface AgentTraceStep {
  agent: string;
  action: string;
  guardrail: string;
  result: string;
}

export interface AgentMessage {
  id: number;
  role: "user" | "assistant" | string;
  content: string;
  answerStatus: "answered" | "insufficient_evidence" | "fallback" | string | null;
  evidenceMetricIds: string[];
  evidenceEventIds: string[];
  evidenceNewsIds: string[];
  evidenceRagChunkIds: string[];
  evidenceItems: AgentEvidenceItem[];
  steps: AgentTraceStep[];
  createdAt: string;
}

export interface AgentEvidenceItem {
  id: string;
  type: "news" | "rag" | string;
  title: string;
  sourceName: string;
  sourceUrl: string;
  observedAt: string | null;
  snippet: string;
  payload: string;
}

export interface AgentRunSummary {
  id: number;
  runType: string;
  status: string;
  summary: string;
  statusLabel: string;
  koreaImpact: string;
  risks: string[];
  evidenceMetricIds: string[];
  evidenceEventIds: string[];
  evidenceNewsIds: string[];
  evidenceRagChunkIds: string[];
  model: string;
  locale: string;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface AgentRunDetail {
  run: AgentRunSummary;
  steps: AgentTraceStep[];
  messages: AgentMessage[];
  evidenceItems: AgentEvidenceItem[];
}

export interface AgentDefinition {
  id: string;
  name: string;
  description: string;
  focus: string;
}

export interface AgentChatResponse {
  message: AgentMessage;
  run: AgentRunDetail;
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "";

function localeQuery(locale?: LocaleCode) {
  return locale ? `?locale=${encodeURIComponent(locale)}` : "";
}

function xsrfHeader(): Record<string, string> {
  const token = xsrfToken();
  return token ? { "X-XSRF-TOKEN": decodeURIComponent(token) } : {};
}

export async function fetchAgentRuns(locale?: LocaleCode): Promise<AgentRunSummary[]> {
  const response = await fetch(`${apiBaseUrl}/api/agents/runs${localeQuery(locale)}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...xsrfHeader(),
    },
  });

  if (!response.ok) {
    throw new Error(`Agent runs request failed: ${response.status}`);
  }

  return response.json() as Promise<AgentRunSummary[]>;
}

export async function createAgentBriefingRun(locale?: LocaleCode): Promise<AgentRunDetail> {
  const response = await fetch(`${apiBaseUrl}/api/agents/runs/briefing${localeQuery(locale)}`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...xsrfHeader(),
    },
  });

  if (!response.ok) {
    throw new Error(`Agent briefing request failed: ${response.status}`);
  }

  return response.json() as Promise<AgentRunDetail>;
}

export async function fetchAgentSummary(locale?: LocaleCode): Promise<AgentRunDetail> {
  const response = await fetch(`${apiBaseUrl}/api/agents/summary${localeQuery(locale)}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...xsrfHeader(),
    },
  });

  if (!response.ok) {
    throw new Error(`Agent summary request failed: ${response.status}`);
  }

  return response.json() as Promise<AgentRunDetail>;
}

export async function refreshAgentSummary(locale?: LocaleCode): Promise<AgentRunDetail> {
  const response = await fetch(`${apiBaseUrl}/api/agents/summary/refresh${localeQuery(locale)}`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...xsrfHeader(),
    },
  });

  if (!response.ok) {
    throw new Error(`Agent summary refresh failed: ${response.status}`);
  }

  return response.json() as Promise<AgentRunDetail>;
}

export async function fetchAgentCatalog(locale?: LocaleCode): Promise<AgentDefinition[]> {
  const response = await fetch(`${apiBaseUrl}/api/agents/catalog${localeQuery(locale)}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...xsrfHeader(),
    },
  });

  if (!response.ok) {
    throw new Error(`Agent catalog request failed: ${response.status}`);
  }

  return response.json() as Promise<AgentDefinition[]>;
}

export async function fetchAgentRun(runId: number): Promise<AgentRunDetail> {
  const response = await fetch(`${apiBaseUrl}/api/agents/runs/${runId}`, {
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...xsrfHeader(),
    },
  });

  if (!response.ok) {
    throw new Error(`Agent run request failed: ${response.status}`);
  }

  return response.json() as Promise<AgentRunDetail>;
}

export async function deleteAgentRun(runId: number): Promise<void> {
  const response = await fetch(`${apiBaseUrl}/api/agents/runs/${runId}`, {
    method: "DELETE",
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...xsrfHeader(),
    },
  });

  if (!response.ok) {
    throw new Error(`Agent run delete request failed: ${response.status}`);
  }
}

export async function sendCatalogAgentMessage(
  agentId: string,
  message: string,
  runId?: number,
  locale?: LocaleCode,
): Promise<AgentChatResponse> {
  const response = await fetch(`${apiBaseUrl}/api/agents/chat`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...xsrfHeader(),
    },
    body: JSON.stringify({ agentId, message, runId, locale }),
  });

  if (!response.ok) {
    throw new Error(`Agent chat request failed: ${response.status}`);
  }

  return response.json() as Promise<AgentChatResponse>;
}

export async function sendAgentChatMessage(
  runId: number,
  message: string,
  locale?: LocaleCode,
): Promise<AgentChatResponse> {
  const response = await fetch(`${apiBaseUrl}/api/agents/runs/${runId}/chat`, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...xsrfHeader(),
    },
    body: JSON.stringify({ message, locale }),
  });

  if (!response.ok) {
    throw new Error(`Agent chat request failed: ${response.status}`);
  }

  return response.json() as Promise<AgentChatResponse>;
}
