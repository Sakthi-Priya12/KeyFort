import { useEffect, useState } from 'react';
import { api } from '../api.js';

/** Sends the password to the API (debounced) for DFA + Regex analysis. The server never stores it. */
export default function usePasswordAnalysis(password, delay = 400) {
  const [state, setState] = useState({ result: null, loading: false, error: '' });
  useEffect(() => {
    if (!password) { setState({ result: null, loading: false, error: '' }); return undefined; }
    const ctrl = new AbortController();
    setState((s) => ({ ...s, loading: true }));
    const t = setTimeout(async () => {
      try {
        const result = await api('/password/check', { method: 'POST', body: { password }, signal: ctrl.signal });
        setState({ result, loading: false, error: '' });
      } catch (e) {
        if (e.name !== 'AbortError') setState({ result: null, loading: false, error: e.message });
      }
    }, delay);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [password, delay]);
  return state;
}

// Instant, local-only feedback while the server analysis is loading.
export const localRules = (p) => ({
  minLength: [...p].length >= 8, uppercase: /[A-Z]/.test(p), lowercase: /[a-z]/.test(p),
  digit: /[0-9]/.test(p), special: /[^A-Za-z0-9]/u.test(p),
});
