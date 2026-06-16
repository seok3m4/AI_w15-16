import { Navigate, Route } from 'react-router-dom';
import { PostDetailPage } from './PostDetailPage';
import { PostEditorPage } from './PostEditorPage';
import { PostFeedPage } from './PostFeedPage';
import { PostSearchPage } from './PostSearchPage';

export const postRoutes = (
  <>
    <Route index element={<PostFeedPage />} />
    <Route path="search" element={<PostSearchPage />} />
    <Route path="posts/new" element={<PostEditorPage mode="create" />} />
    <Route path="posts/:postId" element={<PostDetailPage />} />
    <Route path="posts/:postId/edit" element={<PostEditorPage mode="edit" />} />
    <Route path="*" element={<Navigate to="/app" replace />} />
  </>
);
