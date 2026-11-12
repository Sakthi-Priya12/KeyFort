import { Navigate, Route, Routes } from 'react-router-dom';
import { AdminLayout, PublicLayout, UserLayout } from './components/Layout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Home from './pages/Home.jsx';
import Checker from './pages/Checker.jsx';
import NetworkLab from './pages/NetworkLab.jsx';
import { Register, Login, AdminLogin, ForgotPassword, ResetPassword } from './pages/AuthPages.jsx';
import { Dashboard, Profile, ChangePassword, LoginHistory, SecuritySettings } from './pages/UserPages.jsx';
import { AdminDashboard, UserManagement, SecurityMonitoring } from './pages/AdminPages.jsx';

function NotFound() {
  return <div className="container page"><div className="card empty"><h2>Page not found</h2><p>The page you opened does not exist.</p><a className="btn" href="/">Go home</a></div></div>;
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/password-checker" element={<Checker />} />
        <Route path="/network" element={<NetworkLab />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route element={<ProtectedRoute><UserLayout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/change-password" element={<ChangePassword />} />
        <Route path="/login-history" element={<LoginHistory />} />
        <Route path="/security" element={<SecuritySettings />} />
      </Route>
      <Route element={<ProtectedRoute role="admin"><AdminLayout /></ProtectedRoute>}>
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<UserManagement />} />
        <Route path="/admin/security" element={<SecurityMonitoring />} />
      </Route>
      <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
