import { apiRequest } from './client';
import {
  AgentApprovalDecisionResponse,
  AgentRunResponse,
  AgentRunStartRequest,
  AgentStepListResponse,
} from './types';

export const agentQueryKeys = {
  run: (runId: string) => ['agent', 'run', runId] as const,
  steps: (runId: string) => ['agent', 'steps', runId] as const,
};

export function startAgentRun(request: AgentRunStartRequest): Promise<AgentRunResponse> {
  return apiRequest<AgentRunResponse>('/agent-runs', {
    body: request,
    method: 'POST',
  });
}

export function getAgentRun(runId: string): Promise<AgentRunResponse> {
  return apiRequest<AgentRunResponse>(`/agent-runs/${runId}`);
}

export function listAgentSteps(runId: string): Promise<AgentStepListResponse> {
  return apiRequest<AgentStepListResponse>(`/agent-runs/${runId}/steps?page=0&size=20`);
}

export function approveAgentRun(
  runId: string,
  approvalId: string,
): Promise<AgentApprovalDecisionResponse> {
  return apiRequest<AgentApprovalDecisionResponse>(
    `/agent-runs/${runId}/approvals/${approvalId}/approve`,
    { method: 'POST' },
  );
}

export function rejectAgentRun(
  runId: string,
  approvalId: string,
): Promise<AgentApprovalDecisionResponse> {
  return apiRequest<AgentApprovalDecisionResponse>(
    `/agent-runs/${runId}/approvals/${approvalId}/reject`,
    { method: 'POST' },
  );
}
