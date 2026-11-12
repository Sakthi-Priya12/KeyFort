/** Small dependency-free grouped bar chart (successful vs failed logins per day). */
export default function BarChart({ data }) {
  const W = 640; const H = 240; const pad = { l: 36, r: 10, t: 12, b: 28 };
  const max = Math.max(5, ...data.flatMap((d) => [d.success, d.failed]));
  const step = Math.ceil(max / 4);
  const top = step * 4;
  const iw = W - pad.l - pad.r; const ih = H - pad.t - pad.b;
  const gw = iw / data.length; const bw = Math.min(26, gw / 3);
  const y = (v) => pad.t + ih - (v / top) * ih;
  return (
    <div>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Successful and failed logins for the last 7 days">
        {[0, 1, 2, 3, 4].map((i) => (
          <g key={i}><line x1={pad.l} x2={W - pad.r} y1={y(i * step)} y2={y(i * step)} stroke="#e3eaf7" /><text x={pad.l - 6} y={y(i * step) + 4} textAnchor="end">{i * step}</text></g>
        ))}
        {data.map((d, i) => {
          const cx = pad.l + gw * i + gw / 2;
          return (
            <g key={d.date}>
              <rect x={cx - bw - 2} y={y(d.success)} width={bw} height={ih + pad.t - y(d.success)} rx="4" fill="#1f5fd6"><title>{`${d.date}: ${d.success} successful`}</title></rect>
              <rect x={cx + 2} y={y(d.failed)} width={bw} height={ih + pad.t - y(d.failed)} rx="4" fill="#c0392b"><title>{`${d.date}: ${d.failed} failed`}</title></rect>
              <text x={cx} y={H - 8} textAnchor="middle">{d.date.slice(5)}</text>
            </g>
          );
        })}
      </svg>
      <div className="legend"><span><i style={{ background: '#1f5fd6' }} />Successful</span><span><i style={{ background: '#c0392b' }} />Failed</span></div>
    </div>
  );
}
