import { Icon } from '@iconify/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useState } from 'react';
import {
  agentQueryKeys,
  approveAgentRun,
  getAgentRun,
  listAgentSteps,
  rejectAgentRun,
  startAgentRun,
} from '../../lib/api/agent';
import { AgentRunResponse, AgentStepResponse } from '../../lib/api/types';
import { getErrorMessage, formatDate } from '../post/utils';

const DEFAULT_TOOLS = ['search_memories', 'summarize', 'notion_export'];

export function AgentRunPage() {
  const [goal, setGoal] = useState('');
  const [runId, setRunId] = useState<string | null>(null);
  const startMutation = useMutation({
    mutationFn: startAgentRun,
    onSuccess: (run) => setRunId(run.id),
  });
  const runQuery = useQuery({
    enabled: runId !== null,
    queryFn: () => getAgentRun(runId ?? ''),
    queryKey: runId ? agentQueryKeys.run(runId) : agentQueryKeys.run(''),
    refetchInterval: (queryState) => {
      const status = queryState.state.data?.status;
      return status && ['succeeded', 'failed', 'approval_required', 'rejected'].includes(status)
        ? false
        : 500;
    },
  });
  const stepsQuery = useQuery({
    enabled: runId !== null,
    queryFn: () => listAgentSteps(runId ?? ''),
    queryKey: runId ? agentQueryKeys.steps(runId) : agentQueryKeys.steps(''),
    refetchInterval: runQuery.data && ['succeeded', 'failed', 'approval_required', 'rejected'].includes(runQuery.data.status)
      ? false
      : 500,
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedGoal = goal.trim();
    if (!normalizedGoal) {
      return;
    }
    startMutation.mutate({
      goal: normalizedGoal,
      allowedTools: DEFAULT_TOOLS,
    });
  }

  const run = runQuery.data ?? (startMutation.data as AgentRunResponse | undefined);

  return (
    <section className="post-page" aria-labelledby="agent-run-title">
      <div className="page-toolbar">
        <div>
          <p className="eyebrow">Agent Workflow</p>
          <h2 id="agent-run-title">Agent 실행</h2>
        </div>
      </div>

      <form className="post-form" onSubmit={submit}>
        <label htmlFor="agent-goal">Agent 목표</label>
        <textarea
          id="agent-goal"
          onChange={(event) => setGoal(event.target.value)}
          placeholder="최근 기록으로 주간 회고를 만들고 Notion에 저장"
          rows={4}
          value={goal}
        />
        {startMutation.isError ? (
          <p className="alert alert-error" role="alert">
            {getErrorMessage(startMutation.error, 'Agent 실행을 시작하지 못했습니다.')}
          </p>
        ) : null}
        <div className="form-actions">
          <button className="button button-primary" disabled={startMutation.isPending} type="submit">
            실행 시작
          </button>
        </div>
      </form>

      {run ? <AgentRunStatusBlock run={run} /> : null}

      {runQuery.isError ? (
        <div className="state-panel" role="alert">
          <Icon icon="solar:danger-circle-linear" aria-hidden="true" />
          <p>{getErrorMessage(runQuery.error, 'Agent 상태를 불러오지 못했습니다.')}</p>
        </div>
      ) : null}

      {stepsQuery.data?.items.length ? (
        <section className="ai-summary-panel" aria-labelledby="agent-steps-title">
          <div className="ai-summary-heading">
            <div>
              <p className="eyebrow">Steps</p>
              <h3 id="agent-steps-title">실행 단계</h3>
            </div>
          </div>
          <ul className="memory-result-list" aria-label="Agent step timeline">
            {stepsQuery.data.items.map((step) => (
              <AgentStepItem key={step.id} step={step} />
            ))}
          </ul>
        </section>
      ) : null}
    </section>
  );
}

export function AgentApprovalPage() {
  const { runId = '' } = useParams();
  const runQuery = useQuery({
    enabled: Boolean(runId),
    queryFn: () => getAgentRun(runId),
    queryKey: agentQueryKeys.run(runId),
  });
  const approveMutation = useMutation({
    mutationFn: (approvalId: string) => approveAgentRun(runId, approvalId),
    onSuccess: () => runQuery.refetch(),
  });
  const rejectMutation = useMutation({
    mutationFn: (approvalId: string) => rejectAgentRun(runId, approvalId),
    onSuccess: () => runQuery.refetch(),
  });
  const approvals = runQuery.data?.pendingApprovals ?? [];

  return (
    <section className="post-page" aria-labelledby="agent-approval-title">
      <div className="page-toolbar">
        <div>
          <p className="eyebrow">Agent Approval</p>
          <h2 id="agent-approval-title">승인 대기</h2>
        </div>
        <Link className="button button-secondary" to="/app/agent">
          Agent로
        </Link>
      </div>

      {runQuery.isLoading ? <div className="empty-state">승인 요청을 불러오고 있습니다.</div> : null}
      {approvals.map((approval) => (
        <article className="ai-summary-panel" key={approval.id}>
          <div className="ai-summary-heading">
            <div>
              <p className="eyebrow">{approval.type}</p>
              <h3>{approval.description}</h3>
            </div>
            <time dateTime={approval.createdAt}>{formatDate(approval.createdAt)}</time>
          </div>
          <div className="form-actions">
            <button
              className="button button-primary"
              disabled={approveMutation.isPending}
              onClick={() => approveMutation.mutate(approval.id)}
              type="button"
            >
              승인
            </button>
            <button
              className="button button-danger"
              disabled={rejectMutation.isPending}
              onClick={() => rejectMutation.mutate(approval.id)}
              type="button"
            >
              거절
            </button>
          </div>
        </article>
      ))}
      {runQuery.data && approvals.length === 0 ? (
        <div className="empty-state">
          <Icon icon="solar:check-circle-linear" aria-hidden="true" />
          <p className="empty-title">대기 중인 승인이 없습니다</p>
        </div>
      ) : null}
    </section>
  );
}

function AgentRunStatusBlock({ run }: { run: AgentRunResponse }) {
  return (
    <section className="ai-summary-panel" aria-labelledby="agent-status-title">
      <div className="ai-summary-heading">
        <div>
          <p className="eyebrow">Run status</p>
          <h3 id="agent-status-title">{run.status}</h3>
        </div>
        {run.requiresApproval ? (
          <Link className="button button-secondary" to={`/app/agent/approvals/${run.id}`}>
            승인 화면으로
          </Link>
        ) : null}
      </div>
      <p>{run.goal}</p>
      {run.pendingApprovals.map((approval) => (
        <div className="state-panel compact" key={approval.id}>
          <Icon icon="solar:shield-warning-linear" aria-hidden="true" />
          <p>{approval.description}</p>
        </div>
      ))}
      {run.failureReason ? <p className="alert alert-error">{run.failureReason}</p> : null}
    </section>
  );
}

function AgentStepItem({ step }: { step: AgentStepResponse }) {
  return (
    <li className="memory-result-item">
      <p className="memory-result-title">{step.toolName}</p>
      <div className="memory-result-meta">
        <span>#{step.stepOrder}</span>
        <span>{step.status}</span>
        <time dateTime={step.updatedAt}>{formatDate(step.updatedAt)}</time>
      </div>
      {step.inputSummary ? <p className="memory-result-snippet">{step.inputSummary}</p> : null}
      {step.outputSummary ? <p className="memory-result-snippet">{step.outputSummary}</p> : null}
    </li>
  );
}
