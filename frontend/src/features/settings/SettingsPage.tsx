import { Icon } from '@iconify/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { me, updateAiSharing } from '../../lib/api/auth';
import { UserPrivateResponse } from '../../lib/api/types';
import { getErrorMessage } from '../post/utils';

export function SettingsPage() {
  const queryClient = useQueryClient();
  const userQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: me,
  });
  const aiSharingEnabled = Boolean(userQuery.data?.friendAiSharingEnabled);
  const mutation = useMutation({
    mutationFn: (enabled: boolean) => updateAiSharing(enabled),
    onSuccess: (setting) => {
      queryClient.setQueryData<UserPrivateResponse>(['auth', 'me'], (current) =>
        current ? { ...current, friendAiSharingEnabled: setting.friendAiSharingEnabled } : current,
      );
    },
  });
  const nextEnabled = mutation.data?.friendAiSharingEnabled ?? aiSharingEnabled;

  return (
    <section className="settings-page" aria-labelledby="settings-title">
      <div className="page-toolbar">
        <div>
          <p className="eyebrow">Settings</p>
          <h2 id="settings-title">설정</h2>
        </div>
      </div>

      <div className="settings-panel">
        <div>
          <p className="settings-label">계정</p>
          <h3>{userQuery.data?.nickname ?? '사용자'}</h3>
          <p className="comment-state">{userQuery.data?.email ?? '이메일을 불러오고 있습니다.'}</p>
        </div>

        <div className="setting-row">
          <div>
            <p className="settings-label">친구 AI 공유 동의</p>
            <p className="comment-state">
              켜면 친구가 향후 AI 기능에서 내 공개 가능한 기록을 근거로 사용할 수 있습니다.
            </p>
          </div>
          <button
            aria-checked={nextEnabled}
            aria-label="친구 AI 공유 동의"
            className={`switch${nextEnabled ? ' on' : ''}`}
            disabled={mutation.isPending || userQuery.isLoading}
            onClick={() => mutation.mutate(!nextEnabled)}
            role="switch"
            type="button"
          >
            <span />
          </button>
        </div>

        {mutation.isSuccess ? (
          <p className="alert alert-success">
            {nextEnabled ? 'AI 공유 동의를 켰습니다.' : 'AI 공유 동의를 껐습니다.'}
          </p>
        ) : null}
        {mutation.isError ? (
          <p className="alert alert-error" role="alert">
            {getErrorMessage(mutation.error, 'AI 공유 동의를 변경하지 못했습니다.')}
          </p>
        ) : null}
        {userQuery.isError ? (
          <p className="alert alert-error" role="alert">
            <Icon icon="solar:danger-circle-linear" aria-hidden="true" />
            {getErrorMessage(userQuery.error, '내 정보를 불러오지 못했습니다.')}
          </p>
        ) : null}
      </div>
    </section>
  );
}
