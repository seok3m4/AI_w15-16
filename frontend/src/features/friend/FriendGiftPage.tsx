import { Icon } from '@iconify/react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { recommendFriendGifts } from '../../lib/api/friendships';
import { getJob, memoryQueryKeys } from '../../lib/api/memory';
import { AsyncJobResponse, FriendGiftRecommendationResponse } from '../../lib/api/types';
import { getErrorMessage } from '../post/utils';

export function FriendGiftPage() {
  const { friendId = '' } = useParams();
  const [occasion, setOccasion] = useState('birthday');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [preferences, setPreferences] = useState('');
  const [result, setResult] = useState<FriendGiftRecommendationResponse | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () =>
      recommendFriendGifts(friendId, {
        occasion,
        budget: {
          min: numberOrNull(budgetMin),
          max: numberOrNull(budgetMax),
          currency: 'KRW',
        },
        preferences,
        maxSources: 5,
      }),
    onSuccess: (response) => {
      if (isAsyncJobResponse(response)) {
        setJobId(response.id);
        return;
      }
      setJobId(null);
      setResult(response);
    },
  });
  const jobQuery = useQuery({
    enabled: Boolean(jobId),
    queryFn: () => getJob(jobId ?? ''),
    queryKey: memoryQueryKeys.job(jobId ?? ''),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'succeeded' || status === 'failed' ? false : 1500;
    },
  });

  useEffect(() => {
    if (jobQuery.data?.status === 'succeeded' && isGiftResponse(jobQuery.data.result)) {
      setResult(jobQuery.data.result);
    }
  }, [jobQuery.data]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!friendId || mutation.isPending) {
      return;
    }
    mutation.mutate();
  }

  return (
    <section className="post-page" aria-labelledby="friend-gift-title">
      <div className="page-toolbar">
        <div>
          <p className="eyebrow">Friend AI</p>
          <h2 id="friend-gift-title">선물 추천</h2>
        </div>
        <Link className="button button-secondary" to="/app/friends">
          친구 목록
        </Link>
      </div>

      <form className="gift-form" onSubmit={submit}>
        <label className="field">
          <span>기념일</span>
          <input
            aria-label="기념일"
            onChange={(event) => setOccasion(event.target.value)}
            value={occasion}
          />
        </label>
        <div className="gift-budget-grid">
          <label className="field">
            <span>예산 최소</span>
            <input
              aria-label="예산 최소"
              inputMode="numeric"
              onChange={(event) => setBudgetMin(event.target.value)}
              value={budgetMin}
            />
          </label>
          <label className="field">
            <span>예산 최대</span>
            <input
              aria-label="예산 최대"
              inputMode="numeric"
              onChange={(event) => setBudgetMax(event.target.value)}
              value={budgetMax}
            />
          </label>
        </div>
        <label className="field">
          <span>추가 선호</span>
          <textarea
            aria-label="추가 선호"
            onChange={(event) => setPreferences(event.target.value)}
            placeholder="부담스럽지 않은 선물, 커피 관련 등"
            rows={4}
            value={preferences}
          />
        </label>
        <button className="button button-primary" disabled={mutation.isPending} type="submit">
          추천 받기
          <span className="button-icon">
            <Icon icon="solar:magic-stars-linear" aria-hidden="true" />
          </span>
        </button>
      </form>

      {mutation.isError ? (
        <div className="state-panel" role="alert">
          <Icon icon="solar:danger-circle-linear" aria-hidden="true" />
          <p>{getErrorMessage(mutation.error, '선물 추천을 불러오지 못했습니다.')}</p>
        </div>
      ) : null}

      {jobId && !result ? (
        <div className="state-panel" aria-live="polite">
          <Icon icon="solar:clock-circle-linear" aria-hidden="true" />
          <p>추천을 준비하고 있습니다. 작업 상태: {jobQuery.data?.status ?? 'pending'}</p>
        </div>
      ) : null}

      {result ? <GiftResult result={result} /> : null}
    </section>
  );
}

function GiftResult({ result }: { result: FriendGiftRecommendationResponse }) {
  return (
    <section className="gift-result" aria-label="선물 추천 결과">
      <div className="ai-answer-block">
        <Icon icon="solar:magic-stars-linear" aria-hidden="true" />
        <p>{result.answer}</p>
      </div>
      <div className="gift-result-grid">
        {result.recommendations.map((item) => (
          <article className="gift-card" key={`${item.title}-${item.reason}`}>
            <span className="memory-badge">{item.confidence}</span>
            <h3>{item.title}</h3>
            <p>{item.reason}</p>
          </article>
        ))}
      </div>
      <div className="source-list">
        <h3>근거 기록</h3>
        {result.sources.map((source) => (
          <Link
            aria-label={source.title}
            className="memory-result-item"
            key={`${source.postId}-${source.sourceType}`}
            to={`/app/posts/${source.postId}`}
          >
            <span className="memory-result-title">{source.title}</span>
            <span className="memory-result-meta">
              {source.ownerNickname} · {source.sourceType}
            </span>
            <span className="memory-result-snippet">{source.summary}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function numberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function isAsyncJobResponse(value: unknown): value is AsyncJobResponse {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'id' in value &&
      'status' in value &&
      'type' in value &&
      !('recommendations' in value),
  );
}

function isGiftResponse(value: unknown): value is FriendGiftRecommendationResponse {
  return Boolean(value && typeof value === 'object' && 'recommendations' in value && 'sources' in value);
}
