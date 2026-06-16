import { Navigate, Route } from 'react-router-dom';
import { FriendFeedPage } from '../friend/FriendFeedPage';
import { FriendsPage } from '../friend/FriendsPage';
import { SettingsPage } from '../settings/SettingsPage';
import { PostDetailPage } from './PostDetailPage';
import { PostEditorPage } from './PostEditorPage';
import { PostFeedPage } from './PostFeedPage';
import { PostSearchPage } from './PostSearchPage';

export const postRoutes = (
  <>
    <Route index element={<PostFeedPage />} />
    <Route path="friends" element={<FriendsPage />} />
    <Route path="friends/feed" element={<FriendFeedPage />} />
    <Route path="search" element={<PostSearchPage />} />
    <Route path="settings" element={<SettingsPage />} />
    <Route path="posts/new" element={<PostEditorPage mode="create" />} />
    <Route path="posts/:postId" element={<PostDetailPage />} />
    <Route path="posts/:postId/edit" element={<PostEditorPage mode="edit" />} />
    <Route path="*" element={<Navigate to="/app" replace />} />
  </>
);
