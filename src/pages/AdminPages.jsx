import { useCallback, useEffect, useState } from 'react';
import { api, fmtDate, qs } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { Alert, Badge, Loading, PageHead, Pager } from '../components/ui.jsx';
import BarChart from '../components/BarChart.jsx';

const sevTone = { info: '', warning: 'warn', critical: 'bad' };
const label = (t) => t.replace(/_/g, ' ').toLowerCase();

export function AdminDashboard() {
  const [d, setD] = useState(null); const [err, setErr] = useState('');
  useEffect(() => { api('/admin/stats').then(setD).catch((e) => setErr(e.message)); }, []);
  if (err) return <Alert type="error">{err}</Alert>;
  if (!d) return <Loading />;
  return (
    <>
      <PageHead title="Admin overview">Live numbers from the KeyFort database.</PageHead>
      <div className="grid g4" style={{ marginBottom: '1.1rem' }}>
        <div className="stat"><div className="num">{d.totalUsers}</div><div className="lbl">Registered users</div></div>
        <div className="stat ok"><div className="num">{d.activeUsers}</div><div className="lbl">Active users</div></div>
        <div className="stat"><div className="num">{d.successLogins}</div><div className="lbl">Successful logins</div></div>
        <div className="stat bad"><div className="num">{d.failedLogins}</div><div className="lbl">Failed logins</div></div>
        <div className={`stat ${d.lockedAccounts ? 'bad' : ''}`}><div className="num">{d.lockedAccounts}</div><div className="lbl">Locked accounts</div></div>
        <div className={`stat ${d.unreviewedAlerts ? 'bad' : ''}`}><div className="num">{d.unreviewedAlerts}</div><div className="lbl">Alerts to review</div></div>
      </div>
      <div className="grid g2">
        <div className="card"><h3>Login activity, last 7 days</h3><BarChart data={d.daily} /></div>
        <div className="card">
          <h3>Recent security events</h3>
          {d.recentEvents.length === 0 ? <div className="empty">No events yet.</div> : (
            <ul className="list">{d.recentEvents.map((e) => (
              <li key={e._id}><div><Badge tone={sevTone[e.severity]}>{e.severity}</Badge> <b>{label(e.type)}</b><div className="muted small">{e.email || 'n/a'} {e.details && `- ${e.details}`}</div></div><span className="muted small">{fmtDate(e.createdAt)}</span></li>
            ))}</ul>
          )}
        </div>
      </div>
    </>
  );
}

export function UserManagement() {
  const { user: me } = useAuth();
  const [f, setF] = useState({ search: '', status: '', role: '' }); const [q, setQ] = useState(f); const [page, setPage] = useState(1);
  const [data, setData] = useState(null); const [err, setErr] = useState(''); const [msg, setMsg] = useState('');
  const load = useCallback(async () => { try { setData(await api(`/admin/users${qs({ ...q, page })}`)); setErr(''); } catch (e) { setErr(e.message); } }, [q, page]);
  useEffect(() => { load(); }, [load]);
  const act = async (fn, okMsg) => { setMsg(''); setErr(''); try { await fn(); setMsg(okMsg); await load(); } catch (e) { setErr(e.message); } };
  const toggle = (u) => {
    if (u.isActive && !window.confirm(`Deactivate ${u.email}? They will be signed out immediately.`)) return;
    act(() => api(`/admin/users/${u.id}/active`, { method: 'PATCH', body: { isActive: !u.isActive } }), u.isActive ? 'Account deactivated.' : 'Account activated.');
  };
  return (
    <>
      <PageHead title="User management">Search accounts, deactivate or reactivate them and unlock users.</PageHead>
      {msg && <Alert type="success">{msg}</Alert>}{err && <Alert type="error">{err}</Alert>}
      <div className="card flat">
        <form className="toolbar" onSubmit={(e) => { e.preventDefault(); setPage(1); setQ(f); }}>
          <input className="input grow" placeholder="Search by name or email" value={f.search} onChange={(e) => setF({ ...f, search: e.target.value })} aria-label="Search users" />
          <select className="input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} aria-label="Status"><option value="">Any status</option><option value="active">Active</option><option value="inactive">Deactivated</option><option value="locked">Locked</option></select>
          <select className="input" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} aria-label="Role"><option value="">Any role</option><option value="user">Users</option><option value="admin">Admins</option></select>
          <button className="btn">Search</button>
        </form>
        {!data ? <Loading /> : data.items.length === 0 ? <div className="empty">No users match your search.</div> : (
          <>
            <div className="table-wrap"><table>
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Last sign-in</th><th>Joined</th><th>Actions</th></tr></thead>
              <tbody>{data.items.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td><td>{u.email}</td><td><Badge tone={u.role === 'admin' ? 'warn' : ''}>{u.role}</Badge></td>
                  <td>{!u.isActive ? <Badge tone="bad">Deactivated</Badge> : u.isLocked ? <Badge tone="warn">Locked</Badge> : <Badge tone="ok">Active</Badge>}</td>
                  <td>{fmtDate(u.lastLoginAt)}</td><td>{fmtDate(u.createdAt)}</td>
                  <td><div className="row">
                    {u.id !== me.id && <button className={`btn sm ${u.isActive ? 'danger' : ''}`} onClick={() => toggle(u)}>{u.isActive ? 'Deactivate' : 'Activate'}</button>}
                    {u.isLocked && <button className="btn secondary sm" onClick={() => act(() => api(`/admin/users/${u.id}/unlock`, { method: 'POST' }), 'Account unlocked.')}>Unlock</button>}
                  </div></td>
                </tr>
              ))}</tbody>
            </table></div>
            <Pager page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
          </>
        )}
      </div>
    </>
  );
}

export function SecurityMonitoring() {
  const [tab, setTab] = useState('events');
  return (
    <>
      <PageHead title="Security monitoring">Review security events, login records and suspicious activity.</PageHead>
      <div className="tabs" role="tablist">
        {[['events', 'Security events'], ['logins', 'Login records'], ['suspicious', 'Suspicious activity']].map(([k, l]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      {tab === 'events' && <Events />}{tab === 'logins' && <Logins />}{tab === 'suspicious' && <Suspicious />}
    </>
  );
}

function Events() {
  const [f, setF] = useState({ severity: '', type: '', reviewed: '' }); const [page, setPage] = useState(1);
  const [data, setData] = useState(null); const [err, setErr] = useState('');
  const load = useCallback(async () => { try { setData(await api(`/admin/security-logs${qs({ ...f, page })}`)); setErr(''); } catch (e) { setErr(e.message); } }, [f, page]);
  useEffect(() => { load(); }, [load]);
  const review = async (id) => { try { await api(`/admin/security-logs/${id}/review`, { method: 'PATCH' }); await load(); } catch (e) { setErr(e.message); } };
  return (
    <div className="card flat">
      <div className="toolbar">
        <select className="input" value={f.severity} onChange={(e) => { setF({ ...f, severity: e.target.value }); setPage(1); }} aria-label="Severity"><option value="">Any severity</option><option value="info">Info</option><option value="warning">Warning</option><option value="critical">Critical</option></select>
        <select className="input" value={f.type} onChange={(e) => { setF({ ...f, type: e.target.value }); setPage(1); }} aria-label="Event type"><option value="">Any type</option>{(data?.types || []).map((t) => <option key={t} value={t}>{label(t)}</option>)}</select>
        <select className="input" value={f.reviewed} onChange={(e) => { setF({ ...f, reviewed: e.target.value }); setPage(1); }} aria-label="Review state"><option value="">Reviewed or not</option><option value="false">Needs review</option></select>
      </div>
      {err && <div style={{ padding: '1rem' }}><Alert type="error">{err}</Alert></div>}
      {!data ? <Loading /> : data.items.length === 0 ? <div className="empty">No security events match.</div> : (
        <>
          <div className="table-wrap"><table>
            <thead><tr><th>Time</th><th>Severity</th><th>Event</th><th>Account</th><th>IP</th><th>Details</th><th>Review</th></tr></thead>
            <tbody>{data.items.map((e) => (
              <tr key={e._id}><td>{fmtDate(e.createdAt)}</td><td><Badge tone={sevTone[e.severity]}>{e.severity}</Badge></td><td>{label(e.type)}</td><td>{e.email || '-'}</td><td className="mono">{e.ip}</td><td className="small">{e.details}</td>
                <td>{e.reviewed ? <Badge tone="ok">Reviewed</Badge> : e.severity === 'info' ? <span className="muted small">n/a</span> : <button className="btn secondary sm" onClick={() => review(e._id)}>Mark reviewed</button>}</td></tr>
            ))}</tbody>
          </table></div>
          <Pager page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
        </>
      )}
    </div>
  );
}

function Logins() {
  const [f, setF] = useState({ search: '', status: '' }); const [q, setQ] = useState(f); const [page, setPage] = useState(1);
  const [data, setData] = useState(null); const [err, setErr] = useState('');
  useEffect(() => { api(`/admin/login-logs${qs({ ...q, page })}`).then((d) => { setData(d); setErr(''); }).catch((e) => setErr(e.message)); }, [q, page]);
  return (
    <div className="card flat">
      <form className="toolbar" onSubmit={(e) => { e.preventDefault(); setPage(1); setQ(f); }}>
        <input className="input grow" placeholder="Search by email or IP address" value={f.search} onChange={(e) => setF({ ...f, search: e.target.value })} aria-label="Search login records" />
        <select className="input" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} aria-label="Result"><option value="">All results</option><option value="success">Successful</option><option value="failed">Failed</option></select>
        <button className="btn">Filter</button>
      </form>
      {err && <div style={{ padding: '1rem' }}><Alert type="error">{err}</Alert></div>}
      {!data ? <Loading /> : data.items.length === 0 ? <div className="empty">No login records match.</div> : (
        <>
          <div className="table-wrap"><table>
            <thead><tr><th>Time</th><th>Email</th><th>Result</th><th>Reason</th><th>Type</th><th>IP</th></tr></thead>
            <tbody>{data.items.map((l) => (
              <tr key={l._id}><td>{fmtDate(l.createdAt)}</td><td>{l.email}</td><td><Badge tone={l.success ? 'ok' : 'bad'}>{l.success ? 'Success' : 'Failed'}</Badge></td><td>{l.reason}</td><td>{l.isAdminLogin ? 'Admin' : 'User'}</td><td className="mono">{l.ip}</td></tr>
            ))}</tbody>
          </table></div>
          <Pager page={data.page} pages={data.pages} total={data.total} onPage={setPage} />
        </>
      )}
    </div>
  );
}

function Suspicious() {
  const [d, setD] = useState(null); const [err, setErr] = useState('');
  useEffect(() => { api('/admin/suspicious').then(setD).catch((e) => setErr(e.message)); }, []);
  if (err) return <Alert type="error">{err}</Alert>;
  if (!d) return <Loading />;
  return (
    <div className="grid g2">
      <div className="card">
        <h3>IP addresses with 5+ failures</h3><p className="muted small">Last {d.windowMinutes} minutes.</p>
        {d.ips.length === 0 ? <div className="empty">Nothing suspicious right now.</div> : <ul className="list">{d.ips.map((r) => (
          <li key={r.ip}><div><b className="mono">{r.ip || 'unknown'}</b><div className="muted small">{r.pattern} - {r.distinctEmails} account(s)</div></div><Badge tone="bad">{r.failures} failures</Badge></li>
        ))}</ul>}
      </div>
      <div className="card">
        <h3>Accounts with 3+ failures</h3><p className="muted small">Last {d.windowMinutes} minutes.</p>
        {d.accounts.length === 0 ? <div className="empty">Nothing suspicious right now.</div> : <ul className="list">{d.accounts.map((r) => (
          <li key={r.email}><div><b>{r.email}</b><div className="muted small">{r.pattern} - {r.distinctIps} IP(s)</div></div><Badge tone="warn">{r.failures} failures</Badge></li>
        ))}</ul>}
      </div>
    </div>
  );
}
