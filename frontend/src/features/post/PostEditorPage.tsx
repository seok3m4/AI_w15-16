import { zodResolver } from '@hookform/resolvers/zod';
import { Icon } from '@iconify/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { SubmitHandler, useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { z } from 'zod';
import { createPost, getPost, postQueryKeys, updatePost } from '../../lib/api/posts';
import { listTags, tagQueryKeys } from '../../lib/api/tags';
import {
  applyServerFieldErrors,
  getErrorMessage,
  isNotFound,
  memoryStatusLabel,
} from './utils';

const TAG_LIST_PAGE_SIZE = 50;
const TAG_SUGGESTION_LIMIT = 8;

const postFormSchema = z.object({
  content: z.string().trim().min(1, '본문을 입력해 주세요.'),
  tagNames: z.array(z.string().trim().max(50, '태그는 50자 이하여야 합니다.')),
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
  const [tagInput, setTagInput] = useState('');
  const [tagInputError, setTagInputError] = useState('');
  const postQuery = useQuery({
    enabled: isEdit && Boolean(postId),
    queryKey: postQueryKeys.detail(postId ?? ''),
    queryFn: () => getPost(requiredPostId(postId)),
  });
  const tagsQuery = useQuery({
    queryKey: tagQueryKeys.list(0, TAG_LIST_PAGE_SIZE),
    queryFn: () => listTags(0, TAG_LIST_PAGE_SIZE),
  });
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
    setError,
    setValue,
    watch,
  } = useForm<PostFormValues>({
    defaultValues: {
      content: '',
      tagNames: [],
      title: '',
    },
    resolver: zodResolver(postFormSchema),
  });
  const selectedTags = watch('tagNames') ?? [];
  const tagSuggestions = useMemo(() => {
    const selectedKeys = new Set(selectedTags.map(toTagKey));
    const inputKey = toTagKey(tagInput);

    return (tagsQuery.data?.items ?? [])
      .filter((tag) => !selectedKeys.has(toTagKey(tag.name)))
      .filter((tag) => inputKey === '' || toTagKey(tag.name).includes(inputKey))
      .slice(0, TAG_SUGGESTION_LIMIT);
  }, [selectedTags, tagInput, tagsQuery.data?.items]);
  const saveMutation = useMutation({
    mutationFn: (values: PostFormValues) => {
      const request = {
        content: values.content.trim(),
        tagNames: values.tagNames,
        title: values.title.trim(),
      };

      if (isEdit) {
        return updatePost(requiredPostId(postId), request);
      }
      return createPost(request);
    },
    onError: (error) => applyServerFieldErrors(error, setError),
    onSuccess: async (post) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: postQueryKeys.all }),
        queryClient.invalidateQueries({ queryKey: tagQueryKeys.all }),
      ]);
      navigate(`/app/posts/${post.id}`);
    },
  });
  const rootError = getErrorMessage(saveMutation.error, '');

  useEffect(() => {
    if (postQuery.data) {
      reset({
        content: postQuery.data.content,
        tagNames: postQuery.data.tags,
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

  const addTag = (value: string) => {
    const nextTag = cleanTagName(value);

    if (nextTag.length === 0) {
      setTagInput('');
      setTagInputError('');
      return;
    }

    if (nextTag.length > 50) {
      setTagInputError('태그는 50자 이하여야 합니다.');
      return;
    }

    if (selectedTags.some((tag) => toTagKey(tag) === toTagKey(nextTag))) {
      setTagInput('');
      setTagInputError('이미 추가한 태그입니다.');
      return;
    }

    setValue('tagNames', [...selectedTags, nextTag], {
      shouldDirty: true,
      shouldValidate: true,
    });
    setTagInput('');
    setTagInputError('');
  };

  const removeTag = (tagToRemove: string) => {
    setValue(
      'tagNames',
      selectedTags.filter((tag) => toTagKey(tag) !== toTagKey(tagToRemove)),
      { shouldDirty: true, shouldValidate: true },
    );
    setTagInputError('');
  };

  const handleTagKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addTag(tagInput);
      return;
    }

    if (event.key === 'Backspace' && tagInput.length === 0 && selectedTags.length > 0) {
      removeTag(selectedTags[selectedTags.length - 1]);
    }
  };

  const onSubmit: SubmitHandler<PostFormValues> = (values) => {
    const nextTags = normalizeTagNames([...values.tagNames, tagInput]);
    if (nextTags.error) {
      setTagInputError(nextTags.error);
      return;
    }

    setTagInput('');
    setTagInputError('');
    setValue('tagNames', nextTags.tagNames, { shouldDirty: true, shouldValidate: true });
    saveMutation.mutate({
      ...values,
      tagNames: nextTags.tagNames,
    });
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

        <div className="field tag-field">
          <label htmlFor="post-tag-input">태그</label>
          <div className="tag-input-shell" aria-label="선택된 태그">
            {selectedTags.map((tag) => (
              <button
                aria-label={`${tag} 태그 제거`}
                className="tag-chip tag-chip-action"
                key={tag}
                onClick={() => removeTag(tag)}
                type="button"
              >
                #{tag}
                <Icon icon="solar:close-circle-linear" aria-hidden="true" />
              </button>
            ))}
            <div className="tag-input-control">
              <input
                aria-invalid={Boolean(tagInputError)}
                id="post-tag-input"
                onChange={(event) => {
                  setTagInput(event.target.value);
                  setTagInputError('');
                }}
                onKeyDown={handleTagKeyDown}
                placeholder="회고, 카페, 프로젝트"
                type="text"
                value={tagInput}
              />
              <button
                aria-label="태그 추가"
                className="icon-button tag-add-button"
                onClick={() => addTag(tagInput)}
                type="button"
              >
                <Icon icon="solar:add-circle-linear" aria-hidden="true" />
              </button>
            </div>
          </div>
          <p className="field-error">{tagInputError || errors.tagNames?.message || ''}</p>

          {tagsQuery.isError ? (
            <p className="tag-helper" role="alert">
              태그 목록을 불러오지 못했습니다.
            </p>
          ) : null}

          {tagSuggestions.length > 0 ? (
            <div className="tag-suggestions" aria-label="기존 태그 후보">
              {tagSuggestions.map((tag) => (
                <button
                  className="tag-suggestion"
                  key={tag.id}
                  onClick={() => addTag(tag.name)}
                  type="button"
                >
                  <span>#{tag.name}</span>
                  <small>{tag.postCount}개</small>
                </button>
              ))}
            </div>
          ) : null}
        </div>

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

function cleanTagName(value: string): string {
  return value.trim().replace(/^#+/, '').trim();
}

function toTagKey(value: string): string {
  return cleanTagName(value).toLowerCase();
}

function normalizeTagNames(values: string[]): { tagNames: string[]; error?: string } {
  const tagsByKey = new Map<string, string>();

  for (const value of values) {
    const tagName = cleanTagName(value);
    if (tagName.length === 0) {
      continue;
    }
    if (tagName.length > 50) {
      return { tagNames: Array.from(tagsByKey.values()), error: '태그는 50자 이하여야 합니다.' };
    }
    tagsByKey.set(toTagKey(tagName), tagsByKey.get(toTagKey(tagName)) ?? tagName);
  }

  return { tagNames: Array.from(tagsByKey.values()) };
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
