import React, { useEffect, useState } from 'react';

export default function HoursPerProgramChart() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch('/api/custom-views/hours-per-program')
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch((e) => setErr(e.message));
  }, []);

  if (err) return <div className="error">{err}</div>;
  if (!data) return <div className="loading">Loading hours per program...</div>;

  const maxH = Math.max(...data.rows.map((r) => r.hours), 1);
  const colors = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2'];

  return (
    <div className="card" data-testid="viz-hours-per-program">
      <h3 style={{ marginTop: 0 }}>Volunteer Hours per Program</h3>
      <div className="muted" style={{ marginBottom: 12 }}>
        Total: {data.total_hours} hours across {data.rows.length} programs
      </div>
      <svg viewBox="0 0 520 240" style={{ width: '100%', height: 240, background: '#fafafa', borderRadius: 4 }}>
        {data.rows.map((r, i) => {
          const barW = 480 / data.rows.length - 12;
          const x = 30 + i * (480 / data.rows.length);
          const h = (r.hours / maxH) * 170;
          const y = 200 - h;
          return (
            <g key={r.program}>
              <rect x={x} y={y} width={barW} height={h} fill={colors[i % colors.length]} rx={4} />
              <text x={x + barW / 2} y={y - 5} fontSize="11" textAnchor="middle" fill="#374151">{r.hours}h</text>
              <text x={x + barW / 2} y={220} fontSize="10" textAnchor="middle" fill="#6b7280">{r.program}</text>
            </g>
          );
        })}
        <line x1="20" y1="200" x2="510" y2="200" stroke="#d1d5db" />
      </svg>
    </div>
  );
}
