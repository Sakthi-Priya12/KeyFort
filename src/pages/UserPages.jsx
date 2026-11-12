import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, fmtDate, qs } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { Alert, Badge, Field, Loading, PageHead, Pager, PasswordInput } from '../components/ui.jsx';
import PasswordFeedback from '../components/PasswordFeedback.jsx';

function useLoad(path) {
  const [data, setData] = useState(null); const [error, setError] = useState('');
  const load = useCallback(async () => { try { setData(await api(path)); setError(''); } catch (e) { setError(e.message); } }, [path]);
  useEffect(() => { load(); }, [load]);
  return { data, error, reload: load };
}

const LEVEL = { excellent: ['ok', 'Excellent'], good: ['', 'Good'], attention: ['bad', 'Needs attention'] };
const reasonText = (r) => ({ OK: 'Signed in', WRONG_PASSWORD: 'Wrong password', UNKNOWN_EMAIL: 'Unknown email', ACCOUNT_LOCKED: 'Account locked', ACCOUNT_DEACTIVATED: 'Account deactivated', NOT_ADMIN: 'Not an administrator' }[r] || r);

export function Dashboard() {
  const { user } = useAuth();
  const { data, error } = useLoad('/user/dashboard');
  if (error) return <Alert type="error">{error}</Alert>;
  if (!data) return <Loading />;
  const s = data.security; const [tone, label] = LEVEL[s.level];
  return (
    <>
      <PageHead title={`Welcome, ${user.name.split(' ')[0]}`}>Here is the security status of your account.</PageHead>
      <div className="grid g4" style={{ marginBottom: '1.1rem' }}>
        <div className={`stat ${s.level === 'attention' ? 'bad' : 'ok'}`}><div className="num">{label}</div><div className="lbl">Account security</div></div>
        <div className="stat"><div className="num">{s.passwordAgeDays}d</div><div className="lbl">Password age</div></div>
        <div className={`stat ${s.failedLogins24h ? 'bad' : ''}`}><div className="num">{s.failedLogins24h}</div><div className="lbl">Failed sign-ins, 24 hours</div></div>
        <div className="stat"><div className="num">{s.activeSessions}</div><div className="lbl">Active sessions</div></div>
      </div>
      <div className="grid g2">
        <div className="card">
          <div className="card-head"><h3>Account information</h3><Badge tone={tone}>{label}</Badge></div>
          <dl className="kv">
            <dt>Name</dt><dd>{data.user.name}</dd><dt>Email</dt><dd>{data.user.email}</dd><dt>Role</dt><dd>{data.user.role}</dd>
            <dt>Member since</dt><dd>{fmtDate(data.user.createdAt)}</dd><dt>Password policy</dt><dd>{s.passwordPolicy}</dd><dt>Lockout rule</dt><dd>{s.lockPolicy}</dd>
          </dl>
          {s.issues.length > 0 && <Alert type="warn"><ul className="tips" style={{ margin: 0 }}>{s.issues.map((i) => <li key={i}>{i}</li>)}</ul></Alert>}
          <div className="row" style={{ marginTop: '1rem' }}>
            <Link className="btn" to="/change-password">Change password</Link><Link className="btn secondary" to="/profile">Profile settings</Link>
          </div>
        </div>
        <div className="card">
          <div className="card-head"><h3>Recent login activity</h3><Link to="/login-history" className="small">View all</Link></div>
          {data.recentLogins.length === 0 ? <div className="empty">No activity yet.</div> : (
            <ul className="list">{data.recentLogins.map((l) => (
              <li key={l._id}><div><b>{reasonText(l.reason)}</b><div className="muted small">{fmtDate(l.createdAt)} from {l.ip || 'unknown IP'}</div></div><Badge tone={l.success ? 'ok' : 'bad'}>{l.success ? 'Success' : 'Failed'}</Badge></li>
            ))}</ul>
          )}
        </div>
      </div>
    </>
  );
}

export function Profile() {
  const { user, refresh } = useAuth();
  const [f, setF] = useState({ name: user.name, email: user.email, currentPassword: '' });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [ok, setOk] = useState(''); const [fe, setFe] = useState({});
  const emailChanged = f.email.trim().toLowerCase() !== user.email;
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setOk(''); setFe({}); setBusy(true);
    try { await api('/user/profile', { method: 'PUT', body: f }); setOk('Profile saved.'); setF((s) => ({ ...s, currentPassword: '' })); await refresh(); }
    catch (ex) { setErr(ex.message); setFe(ex.errors || {}); } finally { setBusy(false); }
  };
  return (
    <>
      <PageHead title="My profile">Update your name and email address.</PageHead>
      <form className="card" style={{ maxWidth: 520 }} onSubmit={submit}>
        {err && <Alert type="error">{err}</Alert>}{ok && <Alert type="success">{ok}</Alert>}
        <Field label="Full name" id="p-name" error={fe.name}><input id="p-name" className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <Field label="Email" id="p-email" error={fe.email}><input id="p-email" className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        {emailChanged && <Field label="Current password" id="p-cur" error={fe.currentPassword} hint="Required to change your email address."><PasswordInput id="p-cur" value={f.currentPassword} onChange={(v) => setF({ ...f, currentPassword: v })} autoComplete="current-password" /></Field>}
        <dl className="kv" style={{ marginBottom: '1rem' }}><dt>Role</dt><dd>{user.role}</dd><dt>Member since</dt><dd>{fmtDate(user.createdAt)}</dd><dt>Last sign-in</dt><dd>{fmtDate(user.lastLoginAt)}</dd></dl>
        <button className="btn" disabled={busy}>{busy ? 'Saving...' : 'Save changes'}</button>
      </form>
    </>
  );
}

export function ChangePassword() {
  const [f, setF] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [ok, setOk] = useState(''); const [fe, setFe] = useState({});
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setOk(''); setFe({}); setBusy(true);
    try { const d = await api('/auth/change-password', { method: 'POST', body: f }); setOk(d.message); setF({ currentPassword: '', newPassword: '', confirmPassword: '' }); }
    catch (ex) { setErr(ex.message); setFe(ex.errors || {}); } finally { setBusy(false); }
  };
  return (
    <>
      <PageHead title="Change password">Choose a password that passes the KeyFort policy. Your other devices will be signed out.</PageHead>
      <form className="card" style={{ maxWidth: 520 }} onSubmit={submit}>
        {err && <Alert type="error">{err}</Alert>}{ok && <Alert type="success">{ok}</Alert>}
        <Field label="Current password" id="c-cur" error={fe.currentPassword}><PasswordInput id="c-cur" value={f.currentPassword} onChange={set('currentPassword')} autoComplete="current-password" /></Field>
        <Field label="New password" id="c-new" error={fe.newPassword}><PasswordInput id="c-new" value={f.newPassword} onChange={set('newPassword')} /></Field>
        <PasswordFeedback password={f.newPassword} />
        <Field label="Confirm new password" id="c-con" error={fe.confirmPassword}><PasswordInput id="c-con" value={f.confirmPassword} onChange={set('confirmPassword')} /></Field>
        <button className="btn" disabled={busy}>{busy ? 'Updating...' : 'Update password'}</button>
      </form>
    </>
  );
}

export function LoginHistory() {
  const [page, setPage] = useState(1); const [status, setStatus] = useState('');
  const { data, error } = useLoad(`/user/login-history${qs({ page, status })}`);
  return (
    <>
      <PageHead title="Login history">Every sign-in attempt on your account, newest first. Report anything you do not recognise.</PageHead>
      <div className="card flat">
        <div className="toolbar">
          <select className="input" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by result">
            <option value="">All attempts</option><option value="success">Successful</option><option value="failed">Failed</option>
          </select>
        </div>
        {error ? <div style={{ padding: '1rem' }}><Alert type="error">{error}</Alert></div> : !data ? <Loading /> : data.items.length === 0 ? <div className="empty">No login records.</div> : (
          <>
            <div className="table-wrap"><table>
              <thead><tr><th>Date</th><th>Result</th><th>Detail</th><th>IP address</th><th>Device</th></tr></thead>
              <tbody>{data.items.map((l) => (
                <tr key={l._id}><td>{fmtDate(l.createdAt)}</td><td><Badge tone={l.success ? 'ok' : 'bad'}>{l.success ? 'Success' : 'Failed'}</Badge></td><td>{reasonText(l.reason)}</td><td className="mono">{l.ip}</td><td className="small muted" style={{ maxWidth: 280 }}>{l.userAgent.slice(0, 60)}</td></tr>
              ))}</tbody>
            </table></div>
            <Pager page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
          </>
        )}
      </div>
    </>
  );
}

export function SecuritySettings() {
  const { data, error, reload } = useLoad('/user/security');
  const [msg, setMsg] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  if (error) return <Alert type="error">{error}</Alert>;
  if (!data) return <Loading />;
  const s = data.security;
  const revoke = async () => {
    setBusy(true); setMsg(''); setErr('');
    try { setMsg((await api('/user/security/revoke-sessions', { method: 'POST' })).message); await reload(); } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <>
      <PageHead title="Security settings">Review how your account is protected and sign out other devices.</PageHead>
      {msg && <Alert type="success">{msg}</Alert>}{err && <Alert type="error">{err}</Alert>}
      <div className="grid g2">
        <div className="card">
          <h3>Protection in place</h3>
          <dl className="kv">
            <dt>Password storage</dt><dd>bcrypt hash with unique salt</dd><dt>Policy</dt><dd>{s.passwordPolicy}</dd>
            <dt>Password age</dt><dd>{s.passwordAgeDays} days</dd><dt>Lockout</dt><dd>{s.lockPolicy}</dd>
            <dt>Session cookie</dt><dd>HttpOnly, SameSite {data.currentSession.cookie.sameSite}{data.currentSession.cookie.secure ? ', Secure (HTTPS only)' : ' (HTTPS flag is on in production)'}</dd>
          </dl>
          <div className="row" style={{ marginTop: '1rem' }}><Link className="btn" to="/change-password">Change password</Link></div>
        </div>
        <div className="card">
          <h3>Devices</h3>
          <p>You are signed in on <b>{s.activeSessions}</b> device{s.activeSessions === 1 ? '' : 's'}.</p>
          <button className="btn danger" onClick={revoke} disabled={busy}>{busy ? 'Working...' : 'Sign out other devices'}</button>
          <p className="hint">This session stays active.</p>
        </div>
      </div>
      <div className="card" style={{ marginTop: '1.1rem' }}>
        <h3>Recent security events</h3>
        {data.events.length === 0 ? <div className="empty">No events yet.</div> : (
          <ul className="list">{data.events.map((e) => (
            <li key={e._id}><div><b className={`sev-${e.severity}`}>{e.type.replace(/_/g, ' ').toLowerCase()}</b><div className="muted small">{e.details}</div></div><span className="muted small">{fmtDate(e.createdAt)}</span></li>
          ))}</ul>
        )}
      </div>
    </>
  );
}
