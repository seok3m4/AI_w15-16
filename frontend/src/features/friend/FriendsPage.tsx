import { Icon } from '@iconify/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  acceptFriendship,
  deleteFriendship,
  friendshipQueryKeys,
  listFriendships,
  rejectFriendship,
  requestFriend,
} from '../../lib/api/friendships';
import { FriendshipListItemResponse } from '../../lib/api/types';
import { getErrorMessage } from '../post/utils';

export function FriendsPage() {
  const queryClient = useQueryClient();
  const [friendUserId, setFriendUserId] = useState('');
  const [message, setMessage] = useState('');
  const acceptedQuery = useQuery({
    queryKey: friendshipQueryKeys.list({ status: 'accepted' }),
    queryFn: () => listFriendships({ status: 'accepted' }),
  });
  const pendingQuery = useQuery({
    queryKey: friendshipQueryKeys.list({ status: 'pending' }),
    queryFn: () => listFriendships({ status: 'pending' }),
  });
  const invalidateFriends = async () => {
    await queryClient.invalidateQueries({ queryKey: friendshipQueryKeys.all });
  };
  const requestMutation = useMutation({
    mutationFn: (addresseeUserId: string) => requestFriend({ addresseeUserId }),
    onSuccess: async () => {
      setFriendUserId('');
      setMessage('친구 요청을 보냈습니다.');
      await invalidateFriends();
    },
  });
  const acceptMutation = useMutation({
    mutationFn: acceptFriendship,
    onSuccess: async () => {
      setMessage('친구 요청을 수락했습니다.');
      await invalidateFriends();
    },
  });
  const rejectMutation = useMutation({
    mutationFn: rejectFriendship,
    onSuccess: async () => {
      setMessage('친구 요청을 거절했습니다.');
      await invalidateFriends();
    },
  });
  const deleteMutation = useMutation({
    mutationFn: deleteFriendship,
    onSuccess: async () => {
      setMessage('친구 관계를 정리했습니다.');
      await invalidateFriends();
    },
  });

  function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const addresseeUserId = friendUserId.trim();
    if (!addresseeUserId) {
      return;
    }
    requestMutation.mutate(addresseeUserId);
  }

  const accepted = acceptedQuery.data?.items ?? [];
  const pending = pendingQuery.data?.items ?? [];

  return (
    <section className="social-page" aria-labelledby="friends-title">
      <div className="page-toolbar">
        <div>
          <p className="eyebrow">Friends</p>
          <h2 id="friends-title">친구</h2>
        </div>
        <Link className="button button-secondary" to="/app/friends/feed">
          친구 기록
          <span className="button-icon">
            <Icon icon="solar:documents-linear" aria-hidden="true" />
          </span>
        </Link>
      </div>

      <form className="friend-request-form" onSubmit={submitRequest}>
        <label className="sr-only" htmlFor="friend-user-id">
          친구 사용자 UUID
        </label>
        <div className="search-input-shell">
          <Icon icon="solar:user-plus-rounded-linear" aria-hidden="true" />
          <input
            aria-label="친구 사용자 UUID"
            id="friend-user-id"
            onChange={(event) => setFriendUserId(event.target.value)}
            placeholder="친구 사용자 UUID"
            value={friendUserId}
          />
        </div>
        <button
          className="button button-primary"
          disabled={requestMutation.isPending || friendUserId.trim().length === 0}
          type="submit"
        >
          친구 요청
        </button>
      </form>

      {message ? <p className="alert alert-success">{message}</p> : null}
      {requestMutation.isError ? (
        <p className="alert alert-error" role="alert">
          {getErrorMessage(requestMutation.error, '친구 요청을 보내지 못했습니다.')}
        </p>
      ) : null}

      <div className="social-grid">
        <FriendList
          emptyText="아직 친구가 없습니다."
          items={accepted}
          loading={acceptedQuery.isLoading}
          title="친구 목록"
          onDelete={(id) => deleteMutation.mutate(id)}
        />
        <FriendList
          emptyText="받은 요청이 없습니다."
          items={pending}
          loading={pendingQuery.isLoading}
          title={`받은 요청 ${pending.length}`}
          onAccept={(id) => acceptMutation.mutate(id)}
          onDelete={(id) => deleteMutation.mutate(id)}
          onReject={(id) => rejectMutation.mutate(id)}
        />
      </div>
    </section>
  );
}

type FriendListProps = {
  emptyText: string;
  items: FriendshipListItemResponse[];
  loading: boolean;
  title: string;
  onAccept?: (friendshipId: string) => void;
  onDelete: (friendshipId: string) => void;
  onReject?: (friendshipId: string) => void;
};

function FriendList({
  emptyText,
  items,
  loading,
  title,
  onAccept,
  onDelete,
  onReject,
}: FriendListProps) {
  return (
    <section className="social-panel" aria-labelledby={title}>
      <h3 id={title}>{title}</h3>
      {loading ? <p className="comment-state">친구 정보를 불러오고 있습니다.</p> : null}
      {!loading && items.length === 0 ? <p className="comment-state">{emptyText}</p> : null}
      <div className="friend-list">
        {items.map((item) => (
          <article className="friend-card" key={item.id}>
            <div>
              <p className="friend-name">{item.user.nickname}</p>
              <span className="memory-badge">
                {item.user.friendAiSharingEnabled === true ? 'AI 공유 동의' : 'AI 공유 미확인'}
              </span>
            </div>
            <div className="friend-actions">
              {item.status === 'accepted' ? (
                <>
                  <Link className="button button-secondary" to="/app/friends/feed">
                    기록 보기
                  </Link>
                  <button
                    className="button button-danger"
                    onClick={() => onDelete(item.id)}
                    type="button"
                  >
                    친구 해제
                  </button>
                </>
              ) : item.direction === 'incoming' ? (
                <>
                  <button
                    className="button button-primary"
                    onClick={() => onAccept?.(item.id)}
                    type="button"
                  >
                    수락
                  </button>
                  <button
                    className="button button-secondary"
                    onClick={() => onReject?.(item.id)}
                    type="button"
                  >
                    거절
                  </button>
                </>
              ) : (
                <button
                  className="button button-secondary"
                  onClick={() => onDelete(item.id)}
                  type="button"
                >
                  요청 취소
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
