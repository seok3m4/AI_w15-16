import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { createPost, fetchPosts } from './features/posts/api';
import type { Post, PostCreatePayload } from './features/posts/types';

const emptyForm: PostCreatePayload = {
  title: '',
  content: '',
  authorName: '',
};

function App() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [keyword, setKeyword] = useState('');
  const [form, setForm] = useState<PostCreatePayload>(emptyForm);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const canSubmit = useMemo(
    () => Boolean(form.title.trim() && form.content.trim() && form.authorName.trim()),
    [form],
  );

  const loadPosts = async (nextKeyword = keyword) => {
    setIsLoading(true);
    setErrorMessage('');

    try {
      const page = await fetchPosts(nextKeyword);
      setPosts(page.content);
    } catch {
      setErrorMessage('게시글을 불러오지 못했습니다. API 서버 상태를 확인해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadPosts('');
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    setIsLoading(true);
    setErrorMessage('');

    try {
      await createPost(form);
      setForm(emptyForm);
      await loadPosts(keyword);
    } catch {
      setErrorMessage('게시글을 저장하지 못했습니다. 입력값과 API 서버 상태를 확인해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Week15 Board</p>
            <h1>게시판</h1>
          </div>
          <form
            className="search"
            onSubmit={(event) => {
              event.preventDefault();
              void loadPosts(keyword);
            }}
          >
            <input
              aria-label="검색어"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="제목, 내용, 작성자 검색"
            />
            <button type="submit" disabled={isLoading}>
              검색
            </button>
          </form>
        </header>

        <div className="content-grid">
          <form className="editor" onSubmit={handleSubmit}>
            <h2>새 게시글</h2>
            <label>
              작성자
              <input
                value={form.authorName}
                maxLength={80}
                onChange={(event) => setForm((prev) => ({ ...prev, authorName: event.target.value }))}
                placeholder="이름"
              />
            </label>
            <label>
              제목
              <input
                value={form.title}
                maxLength={200}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="제목"
              />
            </label>
            <label>
              내용
              <textarea
                value={form.content}
                onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
                placeholder="내용"
                rows={10}
              />
            </label>
            <button type="submit" disabled={!canSubmit || isLoading}>
              등록
            </button>
          </form>

          <section className="post-panel" aria-live="polite">
            <div className="panel-header">
              <h2>게시글 목록</h2>
              <span>{isLoading ? '불러오는 중' : `${posts.length}개`}</span>
            </div>

            {errorMessage && <p className="error-message">{errorMessage}</p>}

            <div className="post-list">
              {posts.length === 0 && !isLoading ? (
                <p className="empty-state">등록된 게시글이 없습니다.</p>
              ) : (
                posts.map((post) => (
                  <article className="post-item" key={post.id}>
                    <div>
                      <h3>{post.title}</h3>
                      <p>{post.content}</p>
                    </div>
                    <footer>
                      <span>{post.authorName}</span>
                      <span>조회 {post.viewCount}</span>
                    </footer>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

export default App;
