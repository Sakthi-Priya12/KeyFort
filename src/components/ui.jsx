import { useState } from 'react';
import Icon from './Icon.jsx';

export const Spinner = () => <span className="spinner" role="status" aria-label="Loading" />;
export const Loading = ({ text = 'Loading...' }) => <div className="center-load"><Spinner /><span>{text}</span></div>;
export const Alert = ({ type = 'info', children }) => (children ? <div className={`alert ${type}`} role={type === 'error' ? 'alert' : 'status'}>{children}</div> : null);
export const Badge = ({ tone = '', children }) => <span className={`badge ${tone}`}>{children}</span>;

export function Field({ label, error, hint, children, id }) {
  return (
    <div className="field">
      {label && <label htmlFor={id}>{label}</label>}
      {children}
      {error ? <div className="field-error">{error}</div> : hint ? <div className="hint">{hint}</div> : null}
    </div>
  );
}

export function PasswordInput({ id, value, onChange, placeholder, autoComplete = 'new-password', invalid, visible, onToggle, className = '' }) {
  const [local, setLocal] = useState(false);
  const show = visible ?? local;
  const toggle = onToggle || (() => setLocal((s) => !s));
  return (
    <div className="pw-wrap">
      <input id={id} className={`input ${invalid ? 'invalid' : ''} ${className}`} type={show ? 'text' : 'password'} value={value}
        onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete={autoComplete} spellCheck="false" />
      <button type="button" className="pw-toggle" onClick={toggle} aria-label={show ? 'Hide password' : 'Show password'}>
        <Icon name={show ? 'eyeOff' : 'eye'} size={18} />
      </button>
    </div>
  );
}

export function Pager({ page, pages, total, onPage }) {
  return (
    <div className="pager">
      <span className="muted small">{total} record{total === 1 ? '' : 's'}</span>
      <div className="row">
        <button className="btn secondary sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</button>
        <span className="small">Page {page} of {pages}</span>
        <button className="btn secondary sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}

export function PageHead({ title, children }) {
  return <div className="page-head"><h1 style={{ fontSize: '1.9rem' }}>{title}</h1>{children && <p>{children}</p>}</div>;
}
