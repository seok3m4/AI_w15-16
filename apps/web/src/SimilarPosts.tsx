// 📌 게시글 상세 하단에 표시하는 "비슷한 여행 코스" 추천 섹션.
// pgvector 임베딩 기반 RAG 추천(GET /posts/:id/similar) 결과를 카드로 보여준다.
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getSimilarPosts, type SimilarPost } from './api'

export function SimilarPosts({ postId }: { postId: string }) {
  const [posts, setPosts] = useState<SimilarPost[] | null>(null)

  useEffect(() => {
    let isMounted = true

    getSimilarPosts(postId, 4)
      .then((result) => {
        if (isMounted) setPosts(result)
      })
      .catch(() => {
        // 추천은 부가 기능이라 실패해도 조용히 숨긴다.
        if (isMounted) setPosts([])
      })

    return () => {
      isMounted = false
    }
  }, [postId])

  // 아직 로딩 중이거나 추천 결과가 없으면 섹션 자체를 그리지 않는다.
  if (!posts || posts.length === 0) {
    return null
  }

  return (
    <section className="similar-section" aria-labelledby="similar-title">
      <div className="similar-head">
        <h2 id="similar-title">비슷한 여행 코스</h2>
        <span className="similar-badge">AI 추천</span>
      </div>
      <p className="similar-sub">
        이 코스와 분위기가 비슷한 다른 여행 코스예요.
      </p>
      <div className="similar-grid">
        {posts.map((post) => (
          <Link className="similar-card" to={`/posts/${post.id}`} key={post.id}>
            {post.thumbnailUrl ? (
              <div className="similar-thumb">
                <img src={post.thumbnailUrl} alt="" loading="lazy" />
              </div>
            ) : (
              <div className="similar-thumb placeholder">
                <span>{post.city}</span>
              </div>
            )}
            <div className="similar-body">
              <p className="post-location">{post.city}</p>
              <h3>{post.title}</h3>
              <p className="similar-excerpt">{post.content}</p>
              <p className="similar-meta">
                작성자 {post.authorName}
                {post.duration ? ` · ${post.duration}일 코스` : ''}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}
