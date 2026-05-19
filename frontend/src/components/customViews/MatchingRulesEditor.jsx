import React, { useEffect, useState } from 'react';

const AVAILABILITY_OPTS = ['flexible', 'weekends', 'weekday-mornings', 'weekday-evenings', 'on-call'];

export default function MatchingRulesEditor() {
  const [rules, setRules] = useState([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ skill: '', role: '', availability: 'flexible', weight: 1, notes: '' });
  const [editId, setEditId] = useState(null);

  async function load() {
    try {
      const r = await fetch('/api/custom-views/matching-rules');
      const d = await r.json();
      setRules(d.rules || []);
    } catch (e) { setErr(e.message); }
  }
  useEffect(() => { load(); }, []);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const method = editId ? 'PUT' : 'POST';
      const url = editId ? `/api/custom-views/matching-rules/${editId}` : '/api/custom-views/matching-rules';
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error || `Failed (${r.status})`);
      }
      setForm({ skill: '', role: '', availability: 'flexible', weight: 1, notes: '' });
      setEditId(null);
      await load();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  }

  function startEdit(rule) {
    setEditId(rule.id);
    setForm({ skill: rule.skill, role: rule.role, availability: rule.availability, weight: rule.weight, notes: rule.notes || '' });
  }

  async function remove(id) {
    if (!confirm('Delete this rule?')) return;
    await fetch(`/api/custom-views/matching-rules/${id}`, { method: 'DELETE' });
    await load();
  }

  return (
    <div className="card" data-testid="nonviz-matching-rules">
      <h3 style={{ marginTop: 0 }}>Matching Rules Editor</h3>
      <div className="muted" style={{ marginBottom: 12 }}>
        Maintain skill / role / availability rules used to weight matches.
      </div>

      <form onSubmit={submit} style={{ borderBottom: '1px solid #e5e7eb', paddingBottom: 12, marginBottom: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 80px', gap: 10 }}>
          <div className="form-row">
            <label>Skill</label>
            <input value={form.skill} onChange={(e) => setForm({ ...form, skill: e.target.value })} required />
          </div>
          <div className="form-row">
            <label>Role</label>
            <input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} required />
          </div>
          <div className="form-row">
            <label>Availability</label>
            <select value={form.availability} onChange={(e) => setForm({ ...form, availability: e.target.value })}>
              {AVAILABILITY_OPTS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label>Weight</label>
            <input type="number" min="1" max="10" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
          </div>
        </div>
        <div className="form-row">
          <label>Notes</label>
          <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>
        <button className="primary" disabled={busy}>{editId ? 'Update Rule' : 'Add Rule'}</button>
        {editId && (
          <button type="button" onClick={() => { setEditId(null); setForm({ skill: '', role: '', availability: 'flexible', weight: 1, notes: '' }); }} style={{ marginLeft: 8 }}>Cancel</button>
        )}
        {err && <div className="error">{err}</div>}
      </form>

      <table style={{ width: '100%', fontSize: '0.85rem', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ textAlign: 'left', background: '#f9fafb' }}>
            <th style={{ padding: 6 }}>Skill</th>
            <th style={{ padding: 6 }}>Role</th>
            <th style={{ padding: 6 }}>Availability</th>
            <th style={{ padding: 6 }}>Weight</th>
            <th style={{ padding: 6 }}>Notes</th>
            <th style={{ padding: 6 }}></th>
          </tr>
        </thead>
        <tbody>
          {rules.map((r) => (
            <tr key={r.id} style={{ borderTop: '1px solid #e5e7eb' }}>
              <td style={{ padding: 6 }}>{r.skill}</td>
              <td style={{ padding: 6 }}>{r.role}</td>
              <td style={{ padding: 6 }}>{r.availability}</td>
              <td style={{ padding: 6 }}>{r.weight}</td>
              <td style={{ padding: 6 }}>{r.notes}</td>
              <td style={{ padding: 6 }}>
                <button onClick={() => startEdit(r)} style={{ marginRight: 6 }}>Edit</button>
                <button onClick={() => remove(r.id)}>Delete</button>
              </td>
            </tr>
          ))}
          {rules.length === 0 && <tr><td colSpan="6" style={{ padding: 10, color: '#6b7280' }}>No rules yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
