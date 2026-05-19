const express = require('express');
const fetch = require('node-fetch');
const auth = require('../middleware/auth');
const pool = require('../db');
const router = express.Router();

// ---------------------------------------------------------------------------
// OpenRouter helper – persists every result to ai_results table
// ---------------------------------------------------------------------------
async function callOpenRouter(prompt, systemPrompt, model) {
  const chosenModel = model || process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'AI Volunteer Matching Management',
    },
    body: JSON.stringify({
      model: chosenModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      max_tokens: 3000,
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || 'OpenRouter API error');
  return {
    content: data.choices[0].message.content,
    model: chosenModel,
    tokens: data.usage?.total_tokens || null,
  };
}

async function persistResult(userId, endpoint, params, result) {
  try {
    await pool.query(
      `INSERT INTO ai_results (user_id, endpoint, request_params, result_text, model_used, tokens_used)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, endpoint, JSON.stringify(params || {}), result.content, result.model, result.tokens]
    );
  } catch (err) {
    console.error('Failed to persist AI result:', err.message);
  }
}

// Idempotent table creation for AI history + core volunteer-matching tables
async function ensureAiTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ai_results (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      endpoint VARCHAR(100) NOT NULL,
      request_params JSONB,
      result_text TEXT NOT NULL,
      model_used VARCHAR(100),
      tokens_used INTEGER,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS volunteers (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(200),
      email VARCHAR(200),
      phone VARCHAR(50),
      skills TEXT,
      interests TEXT,
      availability TEXT,
      preferred_causes TEXT,
      city VARCHAR(100),
      experience_years INTEGER DEFAULT 0,
      languages TEXT,
      max_hours_per_week INTEGER,
      background_checked BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS opportunities (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      title VARCHAR(200),
      organization VARCHAR(200),
      cause_area VARCHAR(100),
      description TEXT,
      required_skills TEXT,
      time_commitment VARCHAR(100),
      location VARCHAR(200),
      remote BOOLEAN DEFAULT FALSE,
      start_date DATE,
      end_date DATE,
      slots_available INTEGER DEFAULT 1,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS shifts (
      id SERIAL PRIMARY KEY,
      opportunity_id INTEGER REFERENCES opportunities(id) ON DELETE CASCADE,
      volunteer_id INTEGER REFERENCES volunteers(id) ON DELETE SET NULL,
      shift_date DATE,
      start_time TIME,
      end_time TIME,
      status VARCHAR(50) DEFAULT 'scheduled',
      hours_logged NUMERIC(6,2),
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS feedback (
      id SERIAL PRIMARY KEY,
      volunteer_id INTEGER REFERENCES volunteers(id) ON DELETE CASCADE,
      opportunity_id INTEGER REFERENCES opportunities(id) ON DELETE CASCADE,
      rating INTEGER,
      comments TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);
}
ensureAiTables().catch((e) => console.error('ai_results table init failed:', e.message));

// ---------------------------------------------------------------------------
// GET /api/ai/history – retrieve past AI results for the logged-in user
// ---------------------------------------------------------------------------
router.get('/history', auth, async (req, res) => {
  try {
    const { endpoint, limit = 20, offset = 0 } = req.query;
    let query = `SELECT id, endpoint, request_params, result_text, model_used, tokens_used, created_at
                 FROM ai_results WHERE user_id = $1`;
    const params = [req.user.id];
    if (endpoint) {
      params.push(endpoint);
      query += ` AND endpoint = $${params.length}`;
    }
    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    const result = await pool.query(query, params);
    res.json({ results: result.rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/match-volunteers
// Match the best volunteers from the DB to a given opportunity
// ---------------------------------------------------------------------------
router.post('/match-volunteers', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { opportunityId, count = 5 } = req.body;
    if (!opportunityId) return res.status(400).json({ error: 'opportunityId required' });

    const oppRow = await pool.query(
      'SELECT * FROM opportunities WHERE id=$1 AND user_id=$2',
      [opportunityId, userId]
    );
    if (oppRow.rows.length === 0) return res.status(404).json({ error: 'Opportunity not found' });
    const opp = oppRow.rows[0];

    const volRows = await pool.query(
      `SELECT id, name, skills, interests, availability, preferred_causes, city,
              experience_years, languages, max_hours_per_week, background_checked
       FROM volunteers WHERE user_id=$1 LIMIT 200`,
      [userId]
    );

    const prompt = `
Score and rank candidate volunteers for this opportunity.

OPPORTUNITY:
- Title: ${opp.title}
- Cause: ${opp.cause_area}
- Description: ${opp.description}
- Required Skills: ${opp.required_skills || 'Not specified'}
- Time Commitment: ${opp.time_commitment || 'Not specified'}
- Location: ${opp.location} (Remote: ${opp.remote ? 'yes' : 'no'})
- Dates: ${opp.start_date || '?'} to ${opp.end_date || '?'}
- Slots Available: ${opp.slots_available}

CANDIDATE VOLUNTEERS (${volRows.rows.length}):
${volRows.rows.map(v => `- [id=${v.id}] ${v.name} | skills: ${v.skills || 'none'} | interests: ${v.interests || 'none'} | causes: ${v.preferred_causes || 'none'} | city: ${v.city || '?'} | exp: ${v.experience_years}y | langs: ${v.languages || '?'} | bg-check: ${v.background_checked} | avail: ${v.availability || '?'}`).join('\n') || 'No volunteers in pool'}

Return the top ${count} volunteer matches ranked by fit. For each:
1. Volunteer id and name
2. Match score (0-100)
3. Top 3 reasons for the match (skill / cause / availability / location)
4. Any concerns (e.g., missing background check, language gap)
5. Suggested onboarding steps tailored to this volunteer + opportunity`;

    const systemPrompt = `You are a volunteer-matching specialist for nonprofits.
Be strict about required skills and background-check requirements where the cause area implies them (e.g., children, vulnerable adults).
Penalize geographic mismatch unless the opportunity is remote. Output a numbered ranking with explicit scores.`;

    const result = await callOpenRouter(prompt, systemPrompt);
    await persistResult(userId, 'match-volunteers', { opportunityId, count }, result);
    res.json({ result: result.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/recommend-opportunities
// Recommend opportunities for a volunteer based on their profile
// ---------------------------------------------------------------------------
router.post('/recommend-opportunities', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { volunteerId, count = 5 } = req.body;
    if (!volunteerId) return res.status(400).json({ error: 'volunteerId required' });

    const volRow = await pool.query(
      'SELECT * FROM volunteers WHERE id=$1 AND user_id=$2',
      [volunteerId, userId]
    );
    if (volRow.rows.length === 0) return res.status(404).json({ error: 'Volunteer not found' });
    const v = volRow.rows[0];

    const oppRows = await pool.query(
      `SELECT id, title, organization, cause_area, description, required_skills,
              time_commitment, location, remote, start_date, end_date, slots_available
       FROM opportunities WHERE user_id=$1 AND slots_available > 0 LIMIT 100`,
      [userId]
    );

    const prompt = `
Recommend the best volunteer opportunities for this person.

VOLUNTEER:
- Name: ${v.name}
- Skills: ${v.skills || 'Not specified'}
- Interests: ${v.interests || 'Not specified'}
- Preferred Causes: ${v.preferred_causes || 'Not specified'}
- City: ${v.city || 'Not specified'}
- Experience: ${v.experience_years || 0} years
- Languages: ${v.languages || 'Not specified'}
- Max Hours/Week: ${v.max_hours_per_week || 'Not specified'}
- Availability: ${v.availability || 'Not specified'}
- Background Checked: ${v.background_checked}

OPEN OPPORTUNITIES (${oppRows.rows.length}):
${oppRows.rows.map(o => `- [id=${o.id}] "${o.title}" @ ${o.organization} | cause: ${o.cause_area} | skills: ${o.required_skills || 'none'} | location: ${o.location} (remote: ${o.remote}) | time: ${o.time_commitment} | dates: ${o.start_date || '?'}–${o.end_date || '?'}`).join('\n') || 'No open opportunities'}

Return the top ${count} opportunities ranked by fit. For each:
1. Opportunity id and title
2. Match score (0-100)
3. Why this is a strong match (skills/cause/availability/geography)
4. Any growth opportunity for the volunteer (skill they'd build)
5. A short personalized "why-you" pitch line the platform can show them`;

    const systemPrompt = `You are a personalized volunteer-opportunity recommender.
Match interests and causes first, then skills, then logistics (location/time).
Keep pitches warm and specific to the volunteer's profile.`;

    const result = await callOpenRouter(prompt, systemPrompt);
    await persistResult(userId, 'recommend-opportunities', { volunteerId, count }, result);
    res.json({ result: result.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/skills-extract
// Parse a free-text volunteer bio and extract structured skills/interests
// ---------------------------------------------------------------------------
router.post('/skills-extract', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { bio, volunteerId } = req.body;
    if (!bio) return res.status(400).json({ error: 'bio required' });

    const prompt = `
Extract structured volunteer attributes from this free-text bio.

BIO:
"""
${bio}
"""

Return strict JSON with these keys:
- skills: array of short skill tags (e.g., "tutoring-math", "first-aid", "graphic-design")
- soft_skills: array of soft-skill tags (e.g., "patient", "leadership")
- interests: array of interest tags
- preferred_causes: array (education, health, environment, animals, homelessness, hunger, arts, civic, disaster-relief, etc.)
- languages: array of language codes/names mentioned
- experience_years: integer estimate
- availability: short string ("weekends", "evenings", "flexible", etc.)
- red_flags: array of any concerning statements (return [] if none)
- summary: one-sentence summary suitable for a profile card`;

    const systemPrompt = `You extract structured volunteer attributes from free-text bios.
Return ONLY valid JSON. No prose. No markdown fences. Be conservative — don't invent skills.`;

    const result = await callOpenRouter(prompt, systemPrompt);
    await persistResult(userId, 'skills-extract', { volunteerId, bioLength: bio.length }, result);
    res.json({ result: result.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/opportunity-description
// Generate a polished opportunity listing from raw notes
// ---------------------------------------------------------------------------
router.post('/opportunity-description', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { notes, organization, cause_area, audience_tone } = req.body;
    if (!notes) return res.status(400).json({ error: 'notes required' });

    const prompt = `
Write a complete volunteer opportunity listing from these raw organizer notes.

ORGANIZATION: ${organization || 'Unspecified org'}
CAUSE AREA: ${cause_area || 'Unspecified'}
AUDIENCE TONE: ${audience_tone || 'Welcoming, accessible, motivating'}

RAW NOTES:
"""
${notes}
"""

Produce:
1. A 6-12 word title that's compelling and clear
2. A 1-paragraph hook (3-4 sentences) for the listing top
3. "What you'll do" — 5-8 bullet points
4. "Who you'll help / impact" — 2-3 bullets
5. "What we're looking for" — required + nice-to-have skills, with reasonable specificity
6. Time commitment and schedule expectations
7. Onboarding/training overview
8. Inclusivity note (e.g., welcoming to first-time volunteers, language, accessibility)
9. A short call-to-action sentence`;

    const systemPrompt = `You are a nonprofit communications writer.
Make listings concrete, never vague. Avoid jargon. Avoid white-saviorism. Don't promise certifications you can't verify.`;

    const result = await callOpenRouter(prompt, systemPrompt);
    await persistResult(userId, 'opportunity-description', { organization, cause_area }, result);
    res.json({ result: result.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/shift-schedule
// Build an optimal shift schedule for an opportunity given the volunteer pool
// ---------------------------------------------------------------------------
router.post('/shift-schedule', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { opportunityId, dateRange } = req.body;
    if (!opportunityId) return res.status(400).json({ error: 'opportunityId required' });

    const oppRow = await pool.query(
      'SELECT * FROM opportunities WHERE id=$1 AND user_id=$2',
      [opportunityId, userId]
    );
    if (oppRow.rows.length === 0) return res.status(404).json({ error: 'Opportunity not found' });
    const opp = oppRow.rows[0];

    const [shiftRows, volRows] = await Promise.all([
      pool.query(
        `SELECT s.id, s.shift_date, s.start_time, s.end_time, s.status, v.name as volunteer_name
         FROM shifts s LEFT JOIN volunteers v ON v.id = s.volunteer_id
         WHERE s.opportunity_id=$1 ORDER BY s.shift_date, s.start_time`,
        [opportunityId]
      ),
      pool.query(
        'SELECT id, name, availability, max_hours_per_week, skills FROM volunteers WHERE user_id=$1',
        [userId]
      ),
    ]);

    const prompt = `
Design an optimal shift schedule for this opportunity.

OPPORTUNITY: ${opp.title}
DATES: ${opp.start_date} to ${opp.end_date}
LOCATION: ${opp.location} (Remote: ${opp.remote})
SLOTS PER SHIFT: ${opp.slots_available}
TIME COMMITMENT: ${opp.time_commitment}
REQUESTED RANGE: ${dateRange || 'Use opportunity dates above'}

EXISTING SCHEDULED SHIFTS (${shiftRows.rows.length}):
${shiftRows.rows.map(s => `- ${s.shift_date} ${s.start_time}-${s.end_time} | ${s.volunteer_name || 'UNFILLED'} | ${s.status}`).join('\n') || 'None scheduled yet'}

AVAILABLE VOLUNTEER POOL (${volRows.rows.length}):
${volRows.rows.map(v => `- [id=${v.id}] ${v.name} | avail: ${v.availability || '?'} | max-hrs/wk: ${v.max_hours_per_week || '?'} | skills: ${v.skills || '?'}`).join('\n') || 'No volunteers'}

Provide:
1. Identification of unfilled / under-staffed shifts
2. A proposed assignment plan (volunteer id -> shift) honoring availability and max-hours/week constraints
3. Burnout risk flags (volunteers assigned too many consecutive shifts)
4. Coverage gaps that need recruiting
5. A simple ICS-style daily summary for the next 7 days`;

    const systemPrompt = `You are a volunteer operations scheduler.
Respect stated availability strictly. Do not over-schedule any volunteer beyond their max-hours.
Flag every coverage gap explicitly. Be concrete with volunteer ids.`;

    const result = await callOpenRouter(prompt, systemPrompt);
    await persistResult(userId, 'shift-schedule', { opportunityId, dateRange }, result);
    res.json({ result: result.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/impact-report
// Generate an impact report for an organization period
// ---------------------------------------------------------------------------
router.post('/impact-report', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, audience } = req.body;

    const start = startDate || new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
    const end = endDate || new Date().toISOString().slice(0, 10);

    const [oppCount, volCount, shiftAgg, fbAgg] = await Promise.all([
      pool.query(
        'SELECT COUNT(*)::int AS n, COALESCE(SUM(slots_available),0)::int AS slots FROM opportunities WHERE user_id=$1 AND start_date BETWEEN $2 AND $3',
        [userId, start, end]
      ),
      pool.query('SELECT COUNT(*)::int AS n FROM volunteers WHERE user_id=$1', [userId]),
      pool.query(
        `SELECT COUNT(*)::int AS shifts_count,
                COALESCE(SUM(hours_logged),0)::float AS total_hours,
                COUNT(DISTINCT volunteer_id)::int AS unique_volunteers
         FROM shifts s
         JOIN opportunities o ON o.id = s.opportunity_id
         WHERE o.user_id=$1 AND s.shift_date BETWEEN $2 AND $3`,
        [userId, start, end]
      ),
      pool.query(
        `SELECT COALESCE(AVG(rating),0)::float AS avg_rating, COUNT(*)::int AS feedback_count
         FROM feedback f
         JOIN opportunities o ON o.id = f.opportunity_id
         WHERE o.user_id=$1 AND f.created_at BETWEEN $2 AND $3`,
        [userId, start, end]
      ),
    ]);

    const prompt = `
Generate a volunteer impact report from these aggregated stats.

PERIOD: ${start} to ${end}
AUDIENCE: ${audience || 'Board of directors and donors'}

DATA:
- Opportunities created in period: ${oppCount.rows[0].n}
- Total slots offered: ${oppCount.rows[0].slots}
- Total volunteers in pool: ${volCount.rows[0].n}
- Shifts logged: ${shiftAgg.rows[0].shifts_count}
- Hours volunteered: ${shiftAgg.rows[0].total_hours}
- Unique active volunteers: ${shiftAgg.rows[0].unique_volunteers}
- Volunteer feedback count: ${fbAgg.rows[0].feedback_count}
- Average volunteer satisfaction: ${fbAgg.rows[0].avg_rating?.toFixed?.(2) || '0'}/5

Produce:
1. Headline (one-line achievement summary)
2. 3 key metrics with brief commentary
3. Estimated economic value of volunteer hours (use the Independent Sector value of approximately $33.49/hour, note assumption explicitly)
4. Engagement insights (volunteer participation rate, retention signal from satisfaction)
5. 3 risks or trends to watch
6. 3 specific asks for the audience (donor support, volunteer recruitment focus areas)
7. Story-style closing paragraph suitable for a newsletter`;

    const systemPrompt = `You are an impact-reporting specialist for nonprofits.
Be honest about small numbers — don't inflate. Always cite the dollar-per-hour assumption when monetizing volunteer time.`;

    const result = await callOpenRouter(prompt, systemPrompt);
    await persistResult(userId, 'impact-report', { startDate: start, endDate: end, audience }, result);
    res.json({
      result: result.content,
      data: {
        period: { start, end },
        opportunities: oppCount.rows[0],
        shifts: shiftAgg.rows[0],
        feedback: fbAgg.rows[0],
        volunteers_total: volCount.rows[0].n,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/retention-risk
// Identify volunteers at risk of churn and how to re-engage them
// ---------------------------------------------------------------------------
router.post('/retention-risk', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { lookbackDays = 90 } = req.body;
    const since = new Date(Date.now() - lookbackDays * 86400000).toISOString().slice(0, 10);

    const result1 = await pool.query(
      `SELECT v.id, v.name, v.preferred_causes, v.experience_years,
              COALESCE(SUM(s.hours_logged),0)::float AS hours_recent,
              COUNT(s.id)::int AS shifts_recent,
              MAX(s.shift_date) AS last_shift
       FROM volunteers v
       LEFT JOIN shifts s ON s.volunteer_id = v.id AND s.shift_date >= $2
       WHERE v.user_id=$1
       GROUP BY v.id
       ORDER BY last_shift NULLS FIRST
       LIMIT 100`,
      [userId, since]
    );

    const prompt = `
Analyze volunteer retention risk based on recent activity (${lookbackDays}-day window from ${since}).

VOLUNTEER ACTIVITY (${result1.rows.length}):
${result1.rows.map(r => `- [id=${r.id}] ${r.name} | recent hours: ${r.hours_recent} | recent shifts: ${r.shifts_recent} | last shift: ${r.last_shift || 'never'} | causes: ${r.preferred_causes || '?'} | experience: ${r.experience_years}y`).join('\n') || 'No volunteers'}

Produce:
1. Top 10 volunteers at HIGH churn risk (id, name, why)
2. Top 10 at MEDIUM risk
3. Top 5 highly engaged ambassadors worth recognizing publicly
4. A specific re-engagement message tailored to each high-risk volunteer (id-keyed, 2-3 sentences each)
5. Patterns observed (cause areas with low retention, experience-level retention curves, etc.)`;

    const systemPrompt = `You are a volunteer retention analyst.
Use clear thresholds: high-risk = no shifts in window; medium = ≤1 shift. Tailor messages — never generic.`;

    const result = await callOpenRouter(prompt, systemPrompt);
    await persistResult(userId, 'retention-risk', { lookbackDays }, result);
    res.json({ result: result.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/training-plan
// Generate a personalized training/onboarding plan for a volunteer
// ---------------------------------------------------------------------------
router.post('/training-plan', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { volunteerId, opportunityId } = req.body;
    if (!volunteerId || !opportunityId) {
      return res.status(400).json({ error: 'volunteerId and opportunityId required' });
    }

    const [volRow, oppRow] = await Promise.all([
      pool.query('SELECT * FROM volunteers WHERE id=$1 AND user_id=$2', [volunteerId, userId]),
      pool.query('SELECT * FROM opportunities WHERE id=$1 AND user_id=$2', [opportunityId, userId]),
    ]);
    if (volRow.rows.length === 0) return res.status(404).json({ error: 'Volunteer not found' });
    if (oppRow.rows.length === 0) return res.status(404).json({ error: 'Opportunity not found' });
    const v = volRow.rows[0];
    const o = oppRow.rows[0];

    const prompt = `
Design a personalized onboarding & training plan.

VOLUNTEER:
- Name: ${v.name}
- Existing skills: ${v.skills || 'none listed'}
- Experience: ${v.experience_years || 0} years
- Languages: ${v.languages || 'Not specified'}
- Background checked: ${v.background_checked}

OPPORTUNITY:
- Title: ${o.title} @ ${o.organization}
- Cause: ${o.cause_area}
- Required skills: ${o.required_skills || 'Not specified'}
- Description: ${o.description}

Produce:
1. Skill gap analysis between volunteer and opportunity
2. A 4-week (or shorter if commitment is short) week-by-week training plan
3. Required compliance items (background check, mandated reporter training if working with minors, food handler, first-aid, etc.) — flag any not yet completed
4. Recommended self-study resources (book/article/video types — don't fabricate URLs)
5. Mentor/buddy pairing recommendation profile (what kind of existing volunteer would best onboard this person)
6. Success milestones for the first month`;

    const systemPrompt = `You are a volunteer training designer.
Be realistic about how much training fits in available time. Always include compliance/safety items relevant to the cause area.
Do not fabricate specific URLs or course names you can't verify.`;

    const result = await callOpenRouter(prompt, systemPrompt);
    await persistResult(userId, 'training-plan', { volunteerId, opportunityId }, result);
    res.json({ result: result.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/feedback-summary
// Aggregate volunteer/host feedback into an actionable summary
// ---------------------------------------------------------------------------
router.post('/feedback-summary', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { opportunityId, lookbackDays = 90 } = req.body;
    const since = new Date(Date.now() - lookbackDays * 86400000).toISOString();

    let query = `SELECT f.rating, f.comments, f.created_at, o.title as opp_title, v.name as volunteer_name
                 FROM feedback f
                 JOIN opportunities o ON o.id = f.opportunity_id
                 LEFT JOIN volunteers v ON v.id = f.volunteer_id
                 WHERE o.user_id = $1 AND f.created_at >= $2`;
    const params = [userId, since];
    if (opportunityId) {
      params.push(opportunityId);
      query += ` AND f.opportunity_id = $${params.length}`;
    }
    query += ' ORDER BY f.created_at DESC LIMIT 200';
    const fb = await pool.query(query, params);

    const prompt = `
Synthesize volunteer feedback into actionable insights.

PERIOD: last ${lookbackDays} days
SCOPE: ${opportunityId ? `Opportunity #${opportunityId}` : 'All opportunities'}
FEEDBACK COUNT: ${fb.rows.length}

RAW FEEDBACK:
${fb.rows.map(r => `- [${r.created_at?.toISOString?.()?.slice(0,10) || ''}] ${r.opp_title} — ${r.volunteer_name || 'anon'} — ${r.rating}/5: ${r.comments || '(no comment)'}`).join('\n') || 'No feedback yet'}

Produce:
1. Overall sentiment (positive %, neutral %, negative %) with confidence note
2. Top 5 themes mentioned (positive)
3. Top 5 themes mentioned (negative / improvement areas)
4. Recurring operational issues that need fixing (training gaps, scheduling, communication, equipment, supervision)
5. 5 specific, prioritized action items for the program manager
6. Quotable moments (positive — for newsletter / marketing) — only direct quotes, never paraphrased as if they were quotes`;

    const systemPrompt = `You are a feedback analyst. Be objective. Don't sugarcoat negative themes.
Only quote what's actually in the data. If feedback is sparse, say so.`;

    const result = await callOpenRouter(prompt, systemPrompt);
    await persistResult(userId, 'feedback-summary', { opportunityId, lookbackDays }, result);
    res.json({ result: result.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/recruitment-message
// Draft personalized recruitment outreach to fill specific opportunities
// ---------------------------------------------------------------------------
router.post('/recruitment-message', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { opportunityId, channel, audience } = req.body;
    if (!opportunityId) return res.status(400).json({ error: 'opportunityId required' });

    const oppRow = await pool.query(
      'SELECT * FROM opportunities WHERE id=$1 AND user_id=$2',
      [opportunityId, userId]
    );
    if (oppRow.rows.length === 0) return res.status(404).json({ error: 'Opportunity not found' });
    const o = oppRow.rows[0];

    const prompt = `
Draft recruitment outreach for this opportunity.

OPPORTUNITY:
- Title: ${o.title} @ ${o.organization}
- Cause: ${o.cause_area}
- Description: ${o.description}
- Required Skills: ${o.required_skills}
- Time Commitment: ${o.time_commitment}
- Location: ${o.location} (Remote: ${o.remote})
- Slots Open: ${o.slots_available}

CHANNEL: ${channel || 'email'}  (options: email, sms, instagram-post, linkedin-post, slack-announcement, flyer)
AUDIENCE: ${audience || 'General community members'}

Produce 3 versions tuned to ${channel || 'email'}:
1. Short and punchy
2. Story-driven (lead with impact)
3. Direct ask / urgency (slots almost full)

For each include:
- Subject/headline (if applicable to channel)
- Body
- Suggested visuals (if applicable)
- Clear single CTA
- Estimated character/word length appropriate for the channel`;

    const systemPrompt = `You are a nonprofit recruitment copywriter.
Avoid clichés. Center the impact, not the org's brand. Always include one specific verb (sort, mentor, build, plant, deliver) in the body.
Make sure the CTA is one click / one tap / one reply.`;

    const result = await callOpenRouter(prompt, systemPrompt);
    await persistResult(userId, 'recruitment-message', { opportunityId, channel, audience }, result);
    res.json({ result: result.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/ai/recognition-note
// Generate a personalized appreciation note for a volunteer
// ---------------------------------------------------------------------------
router.post('/recognition-note', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { volunteerId, occasion } = req.body;
    if (!volunteerId) return res.status(400).json({ error: 'volunteerId required' });

    const volRow = await pool.query('SELECT * FROM volunteers WHERE id=$1 AND user_id=$2', [volunteerId, userId]);
    if (volRow.rows.length === 0) return res.status(404).json({ error: 'Volunteer not found' });
    const v = volRow.rows[0];

    const stats = await pool.query(
      `SELECT COUNT(*)::int AS shifts, COALESCE(SUM(hours_logged),0)::float AS hours,
              MIN(shift_date) AS first_shift, MAX(shift_date) AS last_shift
       FROM shifts WHERE volunteer_id=$1`,
      [volunteerId]
    );
    const s = stats.rows[0];

    const prompt = `
Write a heartfelt, specific recognition note for this volunteer.

VOLUNTEER: ${v.name}
PREFERRED CAUSES: ${v.preferred_causes || 'multiple causes'}
SHIFTS COMPLETED: ${s.shifts}
HOURS CONTRIBUTED: ${s.hours}
TENURE: ${s.first_shift || '?'} to ${s.last_shift || '?'}
OCCASION: ${occasion || 'Volunteer Appreciation'}

Produce:
1. A 4-6 sentence personalized note from the program coordinator (signed "[Coordinator Name]" — leave the bracket placeholder)
2. A 1-line social-media shoutout (with their first name only, suitable for public posting if they opt in)
3. A short suggested gift/recognition idea proportional to their contribution (e.g., handwritten card, certificate, milestone pin, profile feature)`;

    const systemPrompt = `You are an appreciation-writing specialist.
Reference real numbers (hours, shifts) when meaningful. Avoid generic phrases like "you're amazing" — be specific about the impact.
Always keep the tone warm without being saccharine.`;

    const result = await callOpenRouter(prompt, systemPrompt);
    await persistResult(userId, 'recognition-note', { volunteerId, occasion }, result);
    res.json({ result: result.content });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
