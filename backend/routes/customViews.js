// Custom Views — 2 VIZ + 2 NON-VIZ endpoints for AIVolunteerMatchingManagement
const express = require('express');
const router = express.Router();

let pool = null;
try { pool = require('../db'); } catch (_) {}

let _cvInit = false;
async function ensureTables() {
  if (_cvInit || !pool) return;
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS cv_matching_rules (
      id SERIAL PRIMARY KEY,
      skill TEXT NOT NULL,
      role TEXT NOT NULL,
      availability TEXT NOT NULL,
      weight INTEGER DEFAULT 1,
      notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`);
    const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM cv_matching_rules');
    if (rows[0].n === 0) {
      await pool.query(`INSERT INTO cv_matching_rules (skill, role, availability, weight, notes) VALUES
        ('First Aid','Event Medic','weekends',5,'Certified responders preferred'),
        ('Cooking','Kitchen Lead','weekday-evenings',4,'Food handler card a plus'),
        ('Spanish','Translator','flexible',3,'Bilingual outreach roles'),
        ('Driving','Delivery Driver','weekday-mornings',3,'Valid license required'),
        ('Childcare','Youth Mentor','weekends',4,'Background check required')`);
    }
  } catch (e) { /* lazy */ }
  _cvInit = true;
}

// Sample programs and roles used in viz seed data
const PROGRAMS = ['Food Pantry', 'Tutoring', 'Senior Visits', 'Community Garden', 'Disaster Relief'];
const ROLES = ['Greeter', 'Driver', 'Cook', 'Tutor', 'Translator', 'Medic'];
const VOLUNTEERS = ['Alex Chen', 'Maria Lopez', 'Sam Patel', 'Riya Kumar', 'Jordan Lee', 'Taylor Brooks'];

function seedHours() {
  const data = PROGRAMS.map((program, i) => ({
    program,
    hours: 40 + ((i * 53) % 180),
    volunteers: 5 + ((i * 7) % 18),
  }));
  const total = data.reduce((s, r) => s + r.hours, 0);
  return { rows: data, total_hours: total };
}

function seedHeatmap() {
  const matrix = VOLUNTEERS.map((v, vi) => ({
    volunteer: v,
    scores: ROLES.map((_, ri) => Math.max(0, Math.min(100, 35 + ((vi * 17 + ri * 23) % 65)))),
  }));
  return { volunteers: VOLUNTEERS, roles: ROLES, matrix };
}

// VIZ 1 — Volunteer hours per program
router.get('/hours-per-program', async (req, res) => {
  try {
    const data = seedHours();
    res.json({ ok: true, generated_at: new Date().toISOString(), ...data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// VIZ 2 — Opportunity match heatmap (volunteer x role)
router.get('/match-heatmap', async (req, res) => {
  try {
    const data = seedHeatmap();
    res.json({ ok: true, generated_at: new Date().toISOString(), ...data });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// NON-VIZ 1 — Impact report PDF (PDF-styled text/PDF response)
router.get('/impact-report-pdf', async (req, res) => {
  try {
    const period = req.query.period || 'Q1-2026';
    const hoursData = seedHours();
    const totalVolunteers = hoursData.rows.reduce((s, r) => s + r.volunteers, 0);

    // Build a minimal valid PDF document
    const lines = [
      `IMPACT REPORT — ${period}`,
      `Generated: ${new Date().toISOString()}`,
      ``,
      `Programs: ${hoursData.rows.length}`,
      `Volunteers Engaged: ${totalVolunteers}`,
      `Total Hours: ${hoursData.total_hours}`,
      ``,
      `Per-Program Breakdown:`,
      ...hoursData.rows.map((r) => `  - ${r.program}: ${r.hours} hrs / ${r.volunteers} volunteers`),
    ];

    // Construct a tiny single-page PDF that renders the lines
    const escape = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    let textOps = 'BT /F1 12 Tf 60 760 Td 14 TL\n';
    lines.forEach((ln, i) => {
      textOps += `(${escape(ln)}) Tj T*\n`;
    });
    textOps += 'ET';
    const stream = textOps;
    const streamLen = Buffer.byteLength(stream, 'binary');

    const objects = [];
    objects.push('<< /Type /Catalog /Pages 2 0 R >>');
    objects.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>');
    objects.push(`<< /Length ${streamLen} >>\nstream\n${stream}\nendstream`);
    objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

    let pdf = '%PDF-1.4\n';
    const offsets = [];
    for (let i = 0; i < objects.length; i++) {
      offsets.push(Buffer.byteLength(pdf, 'binary'));
      pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
    }
    const xrefStart = Buffer.byteLength(pdf, 'binary');
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.forEach((o) => { pdf += `${String(o).padStart(10, '0')} 00000 n \n`; });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="impact-report-${period}.pdf"`);
    res.send(Buffer.from(pdf, 'binary'));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// NON-VIZ 2 — Matching rules editor: CRUD (skills, availability)
router.get('/matching-rules', async (req, res) => {
  try {
    await ensureTables();
    if (!pool) return res.json({ ok: true, rules: [], note: 'no-db' });
    const { rows } = await pool.query('SELECT * FROM cv_matching_rules ORDER BY id ASC');
    res.json({ ok: true, rules: rows });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/matching-rules', express.json(), async (req, res) => {
  try {
    await ensureTables();
    if (!pool) return res.status(500).json({ error: 'no-db' });
    const { skill, role, availability, weight, notes } = req.body || {};
    if (!skill || !role || !availability) {
      return res.status(400).json({ error: 'skill, role, availability required' });
    }
    const { rows } = await pool.query(
      `INSERT INTO cv_matching_rules (skill, role, availability, weight, notes)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [skill, role, availability, Number(weight) || 1, notes || null]
    );
    res.json({ ok: true, rule: rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.put('/matching-rules/:id', express.json(), async (req, res) => {
  try {
    await ensureTables();
    if (!pool) return res.status(500).json({ error: 'no-db' });
    const id = Number(req.params.id);
    const { skill, role, availability, weight, notes } = req.body || {};
    const { rows } = await pool.query(
      `UPDATE cv_matching_rules
         SET skill = COALESCE($2, skill),
             role = COALESCE($3, role),
             availability = COALESCE($4, availability),
             weight = COALESCE($5, weight),
             notes = COALESCE($6, notes),
             updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [id, skill || null, role || null, availability || null, weight != null ? Number(weight) : null, notes || null]
    );
    if (!rows.length) return res.status(404).json({ error: 'rule not found' });
    res.json({ ok: true, rule: rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/matching-rules/:id', async (req, res) => {
  try {
    await ensureTables();
    if (!pool) return res.status(500).json({ error: 'no-db' });
    const id = Number(req.params.id);
    await pool.query('DELETE FROM cv_matching_rules WHERE id = $1', [id]);
    res.json({ ok: true, deleted: id });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
