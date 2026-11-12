import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { Loading } from './ui.jsx';

/** Blocks the page until the session is known. role="admin" additionally requires an administrator. */
export default function ProtectedRoute({ role, children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Loading text="Checking your session..." />;
  if (!user) return <Navigate to={role === 'admin' ? '/admin/login' : '/login'} state={{ from: loc.pathname }} replace />;
  if (role === 'admin' && user.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return children;
}
