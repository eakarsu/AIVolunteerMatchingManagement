import React, { useState } from 'react';

export default function ImpactReportPdf() {
  const [period, setPeriod] = useState('Q1-2026');
  const [status, setStatus] = useState('');

  function open() {
    setStatus('Opening...');
    const url = `/api/custom-views/impact-report-pdf?period=${encodeURIComponent(period)}`;
    window.open(url, '_blank');
    setTimeout(() => setStatus('PDF opened in a new tab.'), 400);
  }

  return (
    <div className="card" data-testid="nonviz-impact-report">
      <h3 style={{ marginTop: 0 }}>Impact Report (PDF)</h3>
      <div className="muted" style={{ marginBottom: 12 }}>
        Generate a PDF summarizing programs, volunteers, and hours.
      </div>
      <div className="form-row">
        <label>Reporting Period</label>
        <input value={period} onChange={(e) => setPeriod(e.target.value)} />
      </div>
      <button className="primary" onClick={open}>Download PDF</button>
      {status && <div className="muted" style={{ marginTop: 10 }}>{status}</div>}
    </div>
  );
}
