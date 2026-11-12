'use strict';
/**
 * KeyFort DFA engine - Formal Languages and Automata Theory (FLAT)
 * ------------------------------------------------------------------
 * A Deterministic Finite Automaton  M = (Q, Σ, δ, q0, F)  that accepts exactly the
 * passwords satisfying the policy:
 *   length >= 8  AND  >=1 uppercase  AND  >=1 lowercase  AND  >=1 digit  AND  >=1 special
 *
 * Σ  (input alphabet, 5 character categories)
 *      U = uppercase A-Z          L = lowercase a-z
 *      D = digit 0-9              S = special (any other printable character)
 *      X = invalid (control character, code < 32 or 127)
 *
 * Q  (states)  q<len>:<flags>   where
 *      len   = number of characters read, capped at MIN_LENGTH (0..8)
 *      flags = 4 positions U L D S, each showing the category letter once it was seen, otherwise '-'
 *      examples: q0:----  (start)   q3:UL--   q8:ULDS (accepting)
 *    plus one trap state  q_dead  (reached after an invalid character, never left).
 *    |Q| = 9 * 16 + 1 = 145 states.
 *
 * q0 = q0:----
 * F  = { q8:ULDS }   (length reached 8 AND all four categories seen)
 *
 * δ(q, c):  if q = q_dead or c = X  ->  q_dead
 *           otherwise len' = min(len + 1, 8), flags' = flags ∪ {c}
 *
 * The transition function is computed from this definition (no regex is used here).
 * The maximum length (128) is a separate input-size limit enforced by passwordValidator.js.
 */

const MIN_LENGTH = 8;
const ALPHABET = Object.freeze(['U', 'L', 'D', 'S', 'X']);
const FLAG_ORDER = Object.freeze(['U', 'L', 'D', 'S']);
const DEAD = 'q_dead';
const INITIAL_STATE = 'q0:----';
const ACCEPTING_STATES = Object.freeze([`q${MIN_LENGTH}:ULDS`]);

/** Map one character to its input category (symbol of Σ) using code points only. */
function classify(ch) {
  const code = ch.codePointAt(0);
  if (code < 32 || code === 127) return 'X';
  if (code >= 65 && code <= 90) return 'U';
  if (code >= 97 && code <= 122) return 'L';
  if (code >= 48 && code <= 57) return 'D';
  return 'S';
}

function parseState(name) {
  const length = Number(name.slice(1, name.indexOf(':')));
  const flags = name.slice(name.indexOf(':') + 1).split('');
  return { length, flags };
}

function buildState(length, flags) {
  return `q${length}:${flags.join('')}`;
}

/** Transition function δ(state, symbol). */
function transition(state, symbol) {
  if (!ALPHABET.includes(symbol)) throw new Error(`Symbol ${symbol} is not in the alphabet`);
  if (state === DEAD || symbol === 'X') return DEAD;
  const { length, flags } = parseState(state);
  const next = flags.slice();
  const idx = FLAG_ORDER.indexOf(symbol);
  next[idx] = symbol;
  return buildState(Math.min(length + 1, MIN_LENGTH), next);
}

function isAccepting(state) {
  return ACCEPTING_STATES.includes(state);
}

/**
 * Run the DFA over a password.
 * The trace holds category and state names only (never the password characters).
 */
function runDfa(password) {
  let state = INITIAL_STATE;
  const trace = [];
  let index = 0;
  for (const ch of password) {
    const symbol = classify(ch);
    const from = state;
    state = transition(state, symbol);
    trace.push({ index, symbol, from, to: state });
    index += 1;
  }
  const accepted = isAccepting(state);
  const { length, flags } = state === DEAD ? { length: 0, flags: [] } : parseState(state);
  return {
    accepted,
    finalState: state,
    verdict: accepted ? 'ACCEPT' : 'REJECT',
    reason: accepted
      ? 'Final state is accepting.'
      : state === DEAD
        ? 'Rejected: an invalid (control) character sent the DFA to the dead state.'
        : 'Rejected: final state is not accepting (length or character categories missing).',
    categoriesSeen: {
      uppercase: flags.includes('U'),
      lowercase: flags.includes('L'),
      digit: flags.includes('D'),
      special: flags.includes('S'),
    },
    lengthReached: length,
    steps: trace.length,
    trace,
  };
}

/** Formal definition, exposed to the UI and documentation. */
function getDefinition() {
  return {
    alphabet: ALPHABET.slice(),
    alphabetMeaning: {
      U: 'Uppercase letter A-Z', L: 'Lowercase letter a-z', D: 'Digit 0-9',
      S: 'Special character (any other printable character)', X: 'Invalid control character',
    },
    stateCount: (MIN_LENGTH + 1) * 16 + 1,
    stateNaming: 'q<length 0..8>:<U|-><L|-><D|-><S|->  plus q_dead',
    initialState: INITIAL_STATE,
    acceptingStates: ACCEPTING_STATES.slice(),
    deadState: DEAD,
    minLength: MIN_LENGTH,
    transitionRule: 'δ(q,c): q_dead if q=q_dead or c=X; else length=min(length+1,8) and add c to the seen set.',
  };
}

module.exports = {
  MIN_LENGTH, ALPHABET, INITIAL_STATE, ACCEPTING_STATES, DEAD,
  classify, transition, isAccepting, runDfa, getDefinition,
};
