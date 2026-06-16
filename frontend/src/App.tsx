import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { ProtectedRoute } from './app/ProtectedRoute';
import { LoginPage, SignupPage } from './features/auth/AuthPages';
import { postRoutes } from './features/post/postRoutes';
import { clearAccessToken, getAccessToken } from './lib/auth/tokenStorage';
import './styles/globals.css';

function App() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <UnauthorizedListener />
        <div className="grain" aria-hidden="true" />
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/app" element={<ProtectedRoute />}>
            {postRoutes}
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function RootRedirect() {
  return <Navigate to={getAccessToken() ? '/app' : '/login'} replace />;
}

function UnauthorizedListener() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    function handleUnauthorized() {
      clearAccessToken();
      queryClient.clear();
      navigate('/login', { replace: true });
    }

    window.addEventListener('memento:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('memento:unauthorized', handleUnauthorized);
  }, [navigate, queryClient]);

  return null;
}

export default App;
