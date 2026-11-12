import PasswordAnalyzer from '../components/PasswordAnalyzer.jsx';

export default function Checker() {
  return (
    <div className="container page">
      <div className="page-head">
        <h1 style={{ fontSize: '2rem' }}>Password checker</h1>
        <p>No account needed. Your password is analysed by the DFA and by a regular expression, then discarded.</p>
      </div>
      <PasswordAnalyzer />
    </div>
  );
}
