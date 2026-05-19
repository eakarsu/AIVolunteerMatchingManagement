import React, { useEffect, useState } from 'react';

function colorFor(score) {
  // 0 -> light gray, 100 -> deep blue
  const t = Math.min(1, Math.max(0, score / 100));
  const r = Math.round(240 - t * 200);
  const g = Math.round(245 - t * 165);
  const b = Math.round(255 - t * 60);
  return `rgb(${r},${g},${b})`;
}

export default function MatchHeatmap() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetch('/api/custom-views/match-heatmap')
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch((e) => setErr(e.message));
  }, []);

  if (err) return <div className="error">{err}</div>;
  if (!data) return <div className="loading">Loading match heatmap...</div>;

  return (
    <div className="card" data-testid="viz-match-heatmap">
      <h3 style={{ marginTop: 0 }}>Opportunity Match Heatmap</h3>
      <div className="muted" style={{ marginBottom: 12 }}>
        Match score (0-100) by volunteer x role.
      </div>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.85rem' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: 6 }}></th>
            {data.roles.map((r) => (
              <th key={r} style={{ padding: 6, textAlign: 'center', color: '#374151' }}>{r}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.matrix.map((row) => (
            <tr key={row.volunteer}>
              <td style={{ padding: 6, fontWeight: 600 }}>{row.volunteer}</td>
              {row.scores.map((s, i) => (
                <td
                  key={i}
                  style={{
                    padding: 10,
                    background: colorFor(s),
                    textAlign: 'center',
                    color: s > 60 ? '#fff' : '#1f2937',
                    border: '1px solid #fff',
                    minWidth: 50,
                  }}
                >
                  {s}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
