import { useState } from 'react';
import { api } from '../api.js';
import { Alert, Badge, Spinner } from '../components/ui.jsx';

export default function NetworkLab() {
  const [info, setInfo] = useState(null); const [headers, setHeaders] = useState(null); const [times, setTimes] = useState([]);
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  const run = async () => {
    setBusy(true); setErr(''); setTimes([]);
    try {
      const t = [];
      for (let i = 0; i < 5; i += 1) { const s = performance.now(); await api('/health'); t.push(Math.round((performance.now() - s) * 10) / 10); }
      setTimes(t);
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/network/info`, { credentials: 'include', headers: { 'X-Requested-With': 'KeyFort' } });
      const pick = ['content-type', 'content-security-policy', 'x-content-type-options', 'x-frame-options', 'strict-transport-security', 'referrer-policy', 'cross-origin-opener-policy', 'ratelimit-limit', 'ratelimit-remaining', 'ratelimit-reset', 'cache-control'];
      setHeaders({ status: `${res.status} ${res.statusText}`, list: pick.map((k) => [k, res.headers.get(k)]).filter(([, v]) => v) });
      setInfo(await res.json());
    } catch (e) { setErr(e.message); } finally { setBusy(false); }
  };
  const avg = times.length ? (times.reduce((a, b) => a + b, 0) / times.length).toFixed(1) : null;
  return (
    <div className="container page">
      <div className="page-head"><h1 style={{ fontSize: '2rem' }}>Network lab</h1>
        <p>See the client-server exchange behind every KeyFort screen. Your browser sends an HTTP request over a TCP connection (TLS in production) and the Express server answers with a JSON response.</p></div>
      <div className="row" style={{ marginBottom: '1rem' }}><button className="btn" onClick={run} disabled={busy}>{busy ? 'Measuring...' : 'Run live network test'}</button>{busy && <Spinner />}</div>
      {err && <Alert type="error">{err}</Alert>}
      {info && (
        <div className="grid g2">
          <div className="card"><h3>HTTP request (as the server saw it)</h3>
            <dl className="kv"><dt>Method and URL</dt><dd className="mono">{info.request.method} {info.request.url}</dd><dt>HTTP version</dt><dd>{info.request.httpVersion}</dd><dt>Host</dt><dd>{info.request.host}</dd>
              <dt>User agent</dt><dd className="small">{info.request.userAgent}</dd><dt>Forwarded protocol</dt><dd>{info.request.xForwardedProto || 'none (direct connection)'}</dd></dl></div>
          <div className="card"><h3>TCP connection</h3>
            <dl className="kv"><dt>Client</dt><dd className="mono">{info.connection.clientAddress}:{info.connection.clientPort}</dd><dt>Server</dt><dd className="mono">{info.connection.serverAddress}:{info.connection.serverPort}</dd>
              <dt>IP family</dt><dd>{info.connection.family}</dd><dt>Encrypted (TLS)</dt><dd>{info.connection.secureRequest ? <Badge tone="ok">HTTPS {info.connection.tlsProtocol || '(terminated at proxy)'}</Badge> : <Badge tone="warn">Plain HTTP (local mode)</Badge>}</dd></dl></div>
          <div className="card"><h3>Response status and headers</h3><p><Badge tone="ok">{headers.status}</Badge></p>
            <div className="code-block">{headers.list.map(([k, v]) => `${k}: ${v}`).join('\n')}</div></div>
          <div className="card"><h3>Round-trip time</h3><p className="muted small">Five GET /api/health calls from your browser.</p>
            <div className="row">{times.map((t, i) => <Badge key={i}>{t} ms</Badge>)}</div><p style={{ marginTop: '.8rem' }}>Average: <b>{avg} ms</b></p></div>
        </div>
      )}
      <div className="card" style={{ marginTop: '1.1rem' }}>
        <h3>What your code does and what the network stack does</h3>
        <p className="muted" style={{ marginBottom: 0 }}>KeyFort speaks HTTP and uses REST endpoints. TCP/IP itself is implemented by the operating system and Node.js uses it through sockets, so the application does not implement TCP. In production, TLS encrypts the connection, DNS maps your domain name to the server IP address, and rate limiting protects the server from repeated requests.</p>
      </div>
    </div>
  );
}
