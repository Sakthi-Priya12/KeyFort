import { useState } from 'react';
import { api } from '../api.js';
import usePasswordAnalysis, { localRules } from '../hooks/usePasswordAnalysis.js';
import { Alert, Badge, PasswordInput, Spinner } from './ui.jsx';
import Icon from './Icon.jsx';

const LABELS = {
  minLength: 'At least 8 characters', uppercase: 'One uppercase letter (A-Z)', lowercase: 'One lowercase letter (a-z)',
  digit: 'One number (0-9)', special: 'One special character (! @ # $ %)',
};

export function Checklist({ rules, started }) {
  return (
    <ul className="checklist" aria-label="Password rules">
      {Object.keys(LABELS).map((k) => (
        <li key={k} className={rules[k] ? 'pass' : started ? 'fail' : ''}>
          <span className="dot"><Icon name={rules[k] ? 'check' : 'x'} size={13} /></span>{LABELS[k]}
        </li>
      ))}
    </ul>
  );
}

export function StrengthMeter({ label, started }) {
  const cls = !started ? '' : label.toLowerCase();
  return (
    <div>
      <div className={`meter ${cls}`} aria-hidden="true"><i /><i /><i /></div>
      <div className="row"><b>{started ? label : 'Type a password'}</b>{started && <span className="muted small">Weak, Medium or Strong</span>}</div>
    </div>
  );
}

/** Full checker used on the public page and when choosing new passwords. */
export default function PasswordAnalyzer() {
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const { result, loading, error } = usePasswordAnalysis(pw);
  const [sugg, setSugg] = useState([]);
  const [suggErr, setSuggErr] = useState('');
  const [copied, setCopied] = useState('');
  const [showDef, setShowDef] = useState(false);
  const [def, setDef] = useState(null);
  const started = pw.length > 0;
  const rules = result ? result.rules : localRules(pw);

  const getSuggestions = async () => {
    setSuggErr('');
    try { setSugg((await api('/password/suggest')).suggestions); } catch (e) { setSuggErr(e.message); }
  };
  const copy = async (text) => { try { await navigator.clipboard.writeText(text); setCopied(text); setTimeout(() => setCopied(''), 1500); } catch { setSuggErr('Copy failed. Select the text and copy manually.'); } };
  const toggleDef = async () => { setShowDef((s) => !s); if (!def) try { setDef(await api('/password/dfa')); } catch { /* ignore */ } };
  const chars = [...pw];

  return (
    <div className="grid g2" style={{ alignItems: 'start' }}>
      <div className="card">
        <h3>Check a password</h3>
        <p className="muted small">Analysed in memory and discarded. KeyFort never stores or logs passwords typed here.</p>
        <div className="field">
          <label htmlFor="chk-pw">Password</label>
          <PasswordInput id="chk-pw" value={pw} onChange={setPw} visible={show} onToggle={() => setShow((s) => !s)} autoComplete="off" placeholder="Type or paste a password to test" />
        </div>
        <div className="row" style={{ marginBottom: '.8rem' }}>
          <button className="btn secondary sm" onClick={() => { setPw(''); setShow(false); }} disabled={!started}><Icon name="x" size={14} />Clear</button>
          <button className="btn secondary sm" onClick={getSuggestions}><Icon name="refresh" size={14} />Suggest strong passwords</button>
          {loading && <Spinner />}
        </div>
        {error && <Alert type="error">{error}</Alert>}
        <StrengthMeter label={result ? result.strength.label : started ? 'Checking...' : ''} started={started && !!result} />
        <Checklist rules={rules} started={started} />
        {result && result.missing.length > 0 && (
          <Alert type="warn"><b>Missing:</b> {result.missing.join('; ')}.</Alert>
        )}
        {result && (
          <div><b>How to improve</b><ul className="tips">{result.suggestions.map((s) => <li key={s}>{s}</li>)}</ul></div>
        )}
        {suggErr && <Alert type="error">{suggErr}</Alert>}
        {sugg.length > 0 && (
          <div style={{ marginTop: '1.2rem' }}>
            <b>Suggestions</b>
            <div className="suggest-list" style={{ marginTop: '.5rem' }}>
              {sugg.map((s) => (
                <div className="suggest-item" key={s}>
                  <code>{s}</code>
                  <button className="btn ghost sm" onClick={() => { setPw(s); setShow(true); }}>Test</button>
                  <button className="btn ghost sm" onClick={() => copy(s)} aria-label="Copy suggestion"><Icon name={copied === s ? 'check' : 'copy'} size={14} /></button>
                </div>
              ))}
            </div>
            <p className="hint">Generated randomly on the server with a cryptographic generator. Not stored.</p>
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-head"><h3>Automaton result (FLAT)</h3>{result && <span className={`verdict ${result.accepted ? 'accept' : 'reject'}`}>{result.verdict}</span>}</div>
        {!result ? <p className="muted">Type a password to watch the DFA read it one character at a time.</p> : (
          <>
            <div className="compare">
              <div><div className="k">DFA final state</div><b className="mono">{result.dfa.finalState}</b></div>
              <div><div className="k">DFA verdict</div><b>{result.comparison.dfaVerdict}</b></div>
              <div><div className="k">Regex verdict</div><b>{result.comparison.regexVerdict}</b></div>
              <div><div className="k">DFA and Regex</div><Badge tone={result.comparison.consistent ? 'ok' : 'bad'}>{result.comparison.consistent ? 'Agree' : 'Disagree'}</Badge></div>
            </div>
            <p className="muted small">{result.dfa.reason}</p>
            <div className="trace" tabIndex={0} aria-label="DFA transition trace">
              <table>
                <thead><tr><th>#</th><th>Char</th><th>Symbol</th><th>From</th><th>To</th></tr></thead>
                <tbody>
                  {result.dfa.trace.map((t) => (
                    <tr key={t.index}><td>{t.index + 1}</td><td className="mono">{show ? (chars[t.index] === ' ' ? '(space)' : chars[t.index]) : '•'}</td><td><Badge>{t.symbol}</Badge></td><td className="mono">{t.from}</td><td className="mono">{t.to}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="btn ghost sm" style={{ marginTop: '.8rem' }} onClick={toggleDef}>{showDef ? 'Hide' : 'Show'} formal DFA definition</button>
            {showDef && def && (
              <div className="code-block" style={{ marginTop: '.5rem' }}>
{`M = (Q, Σ, δ, q0, F)
Σ  = {${def.alphabet.join(', ')}}   U upper, L lower, D digit, S special, X invalid
Q  : ${def.stateCount} states  ${def.stateNaming}
q0 = ${def.initialState}
F  = {${def.acceptingStates.join(', ')}}
δ  : ${def.transitionRule}`}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
