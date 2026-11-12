import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import Icon from './Icon.jsx';

export function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const close = () => setOpen(false);
  const out = async () => { close(); await logout(); nav('/'); };
  return (
    <header className="nav">
      <div className="container nav-in">
        <Link to="/" className="brand" onClick={close}><span className="brand-mark"><Icon name="shield" size={18} /></span>KeyFort</Link>
        <button className="nav-toggle" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu" aria-expanded={open}><Icon name="menu" /></button>
        <nav className={`nav-links ${open ? 'open' : ''}`} aria-label="Main">
          <NavLink to="/" end onClick={close}>Home</NavLink>
          <NavLink to="/password-checker" onClick={close}>Password checker</NavLink>
          <NavLink to="/network" onClick={close}>Network lab</NavLink>
          {user ? (
            <>
              <NavLink to={user.role === 'admin' ? '/admin' : '/dashboard'} onClick={close}>{user.role === 'admin' ? 'Admin' : 'Dashboard'}</NavLink>
              <button className="link" onClick={out}>Sign out</button>
            </>
          ) : (
            <>
              <NavLink to="/login" onClick={close}>Sign in</NavLink>
              <Link className="btn sm" to="/register" onClick={close}>Create account</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-in">
        <div><b style={{ color: 'var(--navy)' }}>KeyFort</b><br />Password policy validation and secure authentication.</div>
        <div><Link to="/password-checker">Password checker</Link><Link to="/network">Network lab</Link><Link to="/login">Sign in</Link><Link to="/admin/login">Admin</Link></div>
      </div>
    </footer>
  );
}

export function PublicLayout() {
  return (<><Navbar /><main><Outlet /></main><Footer /></>);
}

const USER_LINKS = [
  ['/dashboard', 'grid', 'Dashboard'], ['/profile', 'user', 'My profile'], ['/change-password', 'key', 'Change password'],
  ['/login-history', 'clock', 'Login history'], ['/security', 'sliders', 'Security settings'], ['/password-checker', 'shield', 'Password checker'],
];
const ADMIN_LINKS = [
  ['/admin', 'grid', 'Overview'], ['/admin/users', 'users', 'User management'], ['/admin/security', 'alert', 'Security monitoring'],
];

function Shell({ links, title }) {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  return (
    <>
      <Navbar />
      <div className="shell">
        <aside className="side" aria-label={title}>
          <div className="who"><b>{user.name}</b><span className="muted small">{user.email}</span></div>
          {links.map(([to, icon, label]) => (
            <NavLink key={to} to={to} end={to === '/admin' || to === '/dashboard'}><Icon name={icon} size={18} />{label}</NavLink>
          ))}
          <a href="#signout" onClick={async (e) => { e.preventDefault(); await logout(); nav('/'); }}><Icon name="logout" size={18} />Sign out</a>
        </aside>
        <main className="main"><Outlet /></main>
      </div>
    </>
  );
}
export const UserLayout = () => <Shell links={USER_LINKS} title="Account menu" />;
export const AdminLayout = () => <Shell links={ADMIN_LINKS} title="Admin menu" />;
