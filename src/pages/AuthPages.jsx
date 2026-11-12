import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { Alert, Field, PasswordInput } from '../components/ui.jsx';
import PasswordFeedback from '../components/PasswordFeedback.jsx';
import Icon from '../components/Icon.jsx';

function useForm(initial) {
  const [f, setF] = useState(initial);
  return [f, (k) => (v) => setF((s) => ({ ...s, [k]: typeof v === 'string' ? v : v.target.value })), setF];
}
const input = (f, set, k, props = {}) => <input className="input" value={f[k]} onChange={set(k)} {...props} />;

export function Register() {
  const [f, set] = useForm({ name: '', email: '', password: '', confirmPassword: '' });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(''); const [fe, setFe] = useState({}); const [done, setDone] = useState(false);
  const nav = useNavigate();
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setFe({});
    const local = {};
    if (f.name.trim().length < 2) local.name = 'Enter your name (at least 2 characters).';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) local.email = 'Enter a valid email address.';
    if (f.password !== f.confirmPassword) local.confirmPassword = 'Passwords do not match.';
    if (Object.keys(local).length) { setFe(local); return; }
    setBusy(true);
    try { await api('/auth/register', { method: 'POST', body: f }); setDone(true); setTimeout(() => nav('/login'), 1800); }
    catch (ex) { setErr(ex.message); setFe(ex.errors || {}); } finally { setBusy(false); }
  };
  return (
    <div className="auth-wrap">
      <form className="auth-card wide" onSubmit={submit} noValidate>
        <h1>Create your account</h1><p className="muted">Free. Your password is stored only as a salted bcrypt hash.</p>
        {done && <Alert type="success">Account created. Redirecting to sign in...</Alert>}
        {err && !Object.keys(fe).length && <Alert type="error">{err}</Alert>}
        <Field label="Full name" id="r-name" error={fe.name}>{input(f, set, 'name', { id: 'r-name', autoComplete: 'name' })}</Field>
        <Field label="Email" id="r-email" error={fe.email}>{input(f, set, 'email', { id: 'r-email', type: 'email', autoComplete: 'email' })}</Field>
        <Field label="Password" id="r-pw" error={fe.password}><PasswordInput id="r-pw" value={f.password} onChange={set('password')} invalid={!!fe.password} /></Field>
        <PasswordFeedback password={f.password} />
        <Field label="Confirm password" id="r-pw2" error={fe.confirmPassword}><PasswordInput id="r-pw2" value={f.confirmPassword} onChange={set('confirmPassword')} invalid={!!fe.confirmPassword} /></Field>
        <button className="btn block" disabled={busy || done}>{busy ? 'Creating account...' : 'Create account'}</button>
        <div className="auth-foot">Already registered? <Link to="/login">Sign in</Link></div>
      </form>
    </div>
  );
}

function SignIn({ admin }) {
  const { user, login, adminLogin } = useAuth();
  const [f, set] = useForm({ email: '', password: '' });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const loc = useLocation(); const nav = useNavigate();
  const from = loc.state && loc.state.from;
  if (user) return <Navigate to={admin ? (user.role === 'admin' ? '/admin' : '/dashboard') : (from || (user.role === 'admin' ? '/admin' : '/dashboard'))} replace />;
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try {
      const u = admin ? await adminLogin(f.email, f.password) : await login(f.email, f.password);
      nav(u.role === 'admin' ? '/admin' : (from || '/dashboard'), { replace: true });
    } catch (ex) { setErr(ex.message); setBusy(false); }
  };
  return (
    <div className="auth-wrap">
      <form className={`auth-card ${admin ? 'admin' : ''}`} onSubmit={submit}>
        {admin && <div className="row" style={{ color: 'var(--navy)', marginBottom: '.5rem' }}><Icon name="shield" /><b>Administrator access</b></div>}
        <h1>{admin ? 'Admin sign in' : 'Welcome back'}</h1>
        <p className="muted">{admin ? 'Restricted to KeyFort administrators. Attempts are logged.' : 'Sign in to open your security dashboard.'}</p>
        {err && <Alert type="error">{err}</Alert>}
        <Field label="Email" id="l-email">{input(f, set, 'email', { id: 'l-email', type: 'email', autoComplete: 'username', required: true })}</Field>
        <Field label="Password" id="l-pw"><PasswordInput id="l-pw" value={f.password} onChange={set('password')} autoComplete="current-password" /></Field>
        <button className="btn block" disabled={busy || !f.email || !f.password}>{busy ? 'Signing in...' : 'Sign in'}</button>
        <div className="auth-foot">
          <Link to="/forgot-password">Forgot password?</Link>
          <br />{admin ? <Link to="/login">Back to user sign in</Link> : <>New to KeyFort? <Link to="/register">Create an account</Link></>}
        </div>
      </form>
    </div>
  );
}
export const Login = () => <SignIn />;
export const AdminLogin = () => <SignIn admin />;

export function ForgotPassword() {
  const [email, setEmail] = useState(''); const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(''); const [res, setRes] = useState(null);
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { setRes(await api('/auth/forgot-password', { method: 'POST', body: { email } })); } catch (ex) { setErr(ex.message); } finally { setBusy(false); }
  };
  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <h1>Reset your password</h1><p className="muted">Enter your account email. If it exists, we send a link that works once and expires soon.</p>
        {err && <Alert type="error">{err}</Alert>}
        {res && <Alert type="success">{res.message}</Alert>}
        {res && res.devResetLink && (
          <Alert type="warn"><b>Development mode:</b> e-mail is not configured, so use this link directly:<br /><a href={res.devResetLink}>Open reset link</a></Alert>
        )}
        <Field label="Email" id="f-email"><input id="f-email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" /></Field>
        <button className="btn block" disabled={busy || !email}>{busy ? 'Sending...' : 'Send reset link'}</button>
        <div className="auth-foot"><Link to="/login">Back to sign in</Link></div>
      </form>
    </div>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [f, set] = useForm({ password: '', confirmPassword: '' });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [fe, setFe] = useState({}); const [done, setDone] = useState(false);
  const nav = useNavigate();
  useEffect(() => { if (done) { const t = setTimeout(() => nav('/login'), 2000); return () => clearTimeout(t); } return undefined; }, [done, nav]);
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setFe({}); setBusy(true);
    try { await api('/auth/reset-password', { method: 'POST', body: { token, ...f } }); setDone(true); }
    catch (ex) { setErr(ex.message); setFe(ex.errors || {}); } finally { setBusy(false); }
  };
  if (!token) return <div className="auth-wrap"><div className="auth-card"><Alert type="error">This reset link is incomplete. Request a new one.</Alert><Link className="btn block" to="/forgot-password">Request a new link</Link></div></div>;
  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <h1>Choose a new password</h1>
        {err && <Alert type="error">{err}</Alert>}
        {done && <Alert type="success">Password updated. Redirecting to sign in...</Alert>}
        <Field label="New password" id="n-pw" error={fe.password}><PasswordInput id="n-pw" value={f.password} onChange={set('password')} /></Field>
        <PasswordFeedback password={f.password} />
        <Field label="Confirm new password" id="n-pw2" error={fe.confirmPassword}><PasswordInput id="n-pw2" value={f.confirmPassword} onChange={set('confirmPassword')} /></Field>
        <button className="btn block" disabled={busy || done}>{busy ? 'Saving...' : 'Save new password'}</button>
      </form>
    </div>
  );
}
