import usePasswordAnalysis, { localRules } from '../hooks/usePasswordAnalysis.js';
import { Checklist, StrengthMeter } from './PasswordAnalyzer.jsx';

/** Compact live feedback under a "new password" field. */
export default function PasswordFeedback({ password }) {
  const { result } = usePasswordAnalysis(password, 350);
  const started = password.length > 0;
  if (!started) return null;
  return (
    <div style={{ marginTop: '-.4rem', marginBottom: '1rem' }}>
      <StrengthMeter label={result ? result.strength.label : 'Checking...'} started={!!result} />
      <Checklist rules={result ? result.rules : localRules(password)} started />
      {result && result.strength.label === 'Weak' && result.accepted && <p className="field-error">This password is too common or predictable.</p>}
    </div>
  );
}
