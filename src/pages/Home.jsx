import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { PasswordInput } from '../components/ui.jsx';
import usePasswordAnalysis from '../hooks/usePasswordAnalysis.js';

function LiveDfa() {
  const [pw, setPw] = useState('');
  const { result } = usePasswordAnalysis(pw, 250);
  const trace = result ? result.dfa.trace : [];
  const shown = trace.length > 9 ? trace.slice(-9) : trace;
  return (
    <div className="live">
      <h3>Watch the automaton read your password</h3>
      <p>Each character moves the DFA to a new state. It accepts only when all rules are met. Nothing you type here is stored.</p>
      <PasswordInput value={pw} onChange={setPw} autoComplete="off" placeholder="Try typing: Fort#2026" />
      <div className="chain" aria-live="polite">
        <span className="chip">q0:----</span>
        {trace.length > 9 && <span className="chip">...</span>}
        {shown.map((t, i) => (
          <span key={t.index} className={`chip ${i === shown.length - 1 ? 'last' : ''} ${t.to === 'q_dead' ? 'dead' : ''} ${i === shown.length - 1 && result.accepted ? 'accept' : ''}`}>{t.to}</span>
        ))}
      </div>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <span className="small">{result ? `${result.strength.label} password` : 'Waiting for input'}</span>
        <b>{result ? result.verdict : ''}</b>
      </div>
      <p className="small" style={{ marginTop: '.8rem', marginBottom: 0 }}>Format: q[length]:[U]ppercase [L]owercase [D]igit [S]pecial seen so far.</p>
    </div>
  );
}

const FEATURES = [
  ['shield', 'Instant strength check', 'Test any password without an account. See exactly which rule is missing and how to fix it.'],
  ['cpu', 'Automaton-based policy', 'A real deterministic finite automaton validates every password, cross-checked against a regular expression.'],
  ['lock', 'Hardened sign-in', 'Salted bcrypt hashing, HttpOnly session cookies, rate limits and automatic lockout after repeated failures.'],
  ['activity', 'Login activity', 'Every sign-in is recorded. Users see their own history and admins see suspicious patterns.'],
  ['users', 'Admin control', 'Search accounts, deactivate or unlock them and review security events in one place.'],
  ['globe', 'Network lab', 'Inspect the live HTTP request, connection details and response headers behind each call.'],
];

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="container hero-in">
          <div>
            <h1>Know if a password will hold before an attacker finds out.</h1>
            <p className="lead">KeyFort validates passwords with formal automata, protects accounts with secure authentication, and shows you every security event on the way.</p>
            <div className="row">
              <Link to="/password-checker" className="btn">Check a password</Link>
              <Link to="/register" className="btn secondary">Create free account</Link>
            </div>
          </div>
          <LiveDfa />
        </div>
      </section>
      <section className="container page">
        <div className="page-head"><h2>Everything for password security in one place</h2><p>Public tools for anyone, and a protected workspace for registered users and administrators.</p></div>
        <div className="sec-list">
          {FEATURES.map(([icon, title, text]) => (
            <div className="feat" key={title}><div className="ico"><Icon name={icon} /></div><h3>{title}</h3><p className="muted" style={{ margin: 0 }}>{text}</p></div>
          ))}
        </div>
      </section>
      <section className="band">
        <div className="container">
          <h2>How a password is judged</h2>
          <p>The policy requires 8 or more characters with an uppercase letter, a lowercase letter, a digit and a special character.</p>
          <div className="steps">
            <div className="step"><b>1. Classify</b>Each character becomes U, L, D, S or X.</div>
            <div className="step"><b>2. Transition</b>The DFA moves to a new state for every symbol.</div>
            <div className="step"><b>3. Decide</b>The password is accepted only in the final accepting state.</div>
            <div className="step"><b>4. Cross-check</b>A regular expression repeats the test and both results are compared.</div>
          </div>
        </div>
      </section>
    </>
  );
}
