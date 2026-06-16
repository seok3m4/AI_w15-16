import { zodResolver } from '@hookform/resolvers/zod';
import { Icon } from '@iconify/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { createPost, getPost, postQueryKeys, updatePost } from '../../lib/api/posts';
import {
  applyServerFieldErrors,
  getErrorMessage,
  isNotFound,
  memoryStatusLabel,
} from './utils';

const postFormSchema = z.object({
  content: z.string().trim().min(1, '본문을 입력해 주세요.'),
  title: z.string().trim().min(1, '제목을 입력해 주세요.').max(200, '제목은 200자 이하여야 합니다.'),
});

type PostFormValues = z.infer<typeof postFormSchema>;

type PostEditorPageProps = {
  mode: 'create' | 'edit';
};

export function PostEditorPage({ mode }: PostEditorPageProps) {
  const isEdit = mode === 'edit';
  const { postId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const postQuery = useQuery({
    enabled: isEdit && Boolean(postId),
    queryKey: postQueryKeys.detail(postId ?? ''),
    queryFn: () => getPost(requiredPostId(postId)),
  });
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
    setError,
  } = useForm<PostFormValues>({
    defaultValues: {
      content: '',
      title: '',
    },
    resolver: zodResolver(postFormSchema),
  });
  const saveMutation = useMutation({
    mutationFn: (values: PostFormValues) => {
      const request = {
        content: values.content.trim(),
        tagNames: isEdit ? (postQuery.data?.tags ?? []) : [],
        title: values.title.trim(),
      };

      if (isEdit) {
        return updatePost(requiredPostId(postId), request);
      }
      return createPost(request);
    },
    onError: (error) => applyServerFieldErrors(error, setError),
    onSuccess: async (post) => {
      await queryClient.invalidateQueries({ queryKey: postQueryKeys.all });
      navigate(`/app/posts/${post.id}`);
    },
  });
  const rootError = getErrorMessage(saveMutation.error, '');

  useEffect(() => {
    if (postQuery.data) {
      reset({
        content: postQuery.data.content,
        title: postQuery.data.title,
      });
    }
  }, [postQuery.data, reset]);

  if (isEdit && !postId) {
    return <PostEditorNotFound />;
  }

  if (isEdit && postQuery.isLoading) {
    return <EditorSkeleton />;
  }

  if (isEdit && postQuery.isError) {
    if (isNotFound(postQuery.error)) {
      return <PostEditorNotFound />;
    }

    return (
      <section className="post-page">
        <div className="state-panel" role="alert">
          <Icon icon="solar:danger-circle-linear" aria-hidden="true" />
          <p>{getErrorMessage(postQuery.error, '수정할 게시글을 불러오지 못했습니다.')}</p>
          <Link className="button button-secondary" to="/app">
            홈으로
          </Link>
        </div>
      </section>
    );
  }

  const onSubmit: SubmitHandler<PostFormValues> = (values) => {
    saveMutation.mutate(values);
  };

  return (
    <section className="post-editor" aria-labelledby="post-editor-title">
      <div className="page-toolbar">
        <div>
          <p className="eyebrow">{isEdit ? 'Edit Post' : 'New Post'}</p>
          <h2 id="post-editor-title">{isEdit ? '기록 수정' : '새 기록 작성'}</h2>
        </div>
        <Link className="button button-secondary" to={isEdit ? `/app/posts/${postId}` : '/app'}>
          취소
        </Link>
      </div>

      {rootError ? (
        <p className="alert alert-error" role="alert">
          {rootError}
        </p>
      ) : null}

      <form className="post-form" onSubmit={handleSubmit(onSubmit)}>
        <div className="field">
          <label htmlFor="post-title">제목</label>
          <input
            aria-invalid={Boolean(errors.title)}
            id="post-title"
            placeholder="오늘 기억하고 싶은 제목"
            type="text"
            {...register('title')}
          />
          <p className="field-error">{errors.title?.message ?? ''}</p>
        </div>

        <div className="field">
          <label htmlFor="post-content">본문</label>
          <textarea
            aria-invalid={Boolean(errors.content)}
            id="post-content"
            placeholder="텍스트로 남길 기억"
            rows={12}
            {...register('content')}
          />
          <p className="field-error">{errors.content?.message ?? ''}</p>
        </div>

        {postQuery.data?.tags.length ? (
          <div className="read-only-tags" aria-label="기존 태그">
            {postQuery.data.tags.map((tag) => (
              <span className="tag-chip" key={tag}>
                #{tag}
              </span>
            ))}
          </div>
        ) : null}

        {postQuery.data?.memoryStatus ? (
          <p className="editor-note">
            <Icon icon="solar:database-linear" aria-hidden="true" />
            {memoryStatusLabel(postQuery.data.memoryStatus)}
          </p>
        ) : null}

        <div className="form-actions">
          <button
            className="button button-primary"
            disabled={saveMutation.isPending}
            type="submit"
          >
            저장
            <span className="button-icon">
              <Icon icon="solar:diskette-linear" aria-hidden="true" />
            </span>
          </button>
        </div>
      </form>
    </section>
  );
}

function requiredPostId(postId: string | undefined): string {
  if (!postId) {
    throw new Error('postId is required.');
  }
  return postId;
}

function PostEditorNotFound() {
  return (
    <section className="post-page">
      <div className="state-panel">
        <Icon icon="solar:document-medicine-linear" aria-hidden="true" />
        <p>찾을 수 없는 게시물입니다</p>
        <Link className="button button-secondary" to="/app">
          홈으로
        </Link>
      </div>
    </section>
  );
}

function EditorSkeleton() {
  return (
    <section className="post-editor skeleton-detail" aria-label="게시글 수정 폼 로딩 중">
      <span />
      <strong />
      <p />
      <p />
      <p />
    </section>
  );
}
