'use strict';
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const auth = require('./middleware/auth');
const governanceRouter = require('./governance');

for (const name of ['DATABASE_URL', 'GOVERNANCE_TENANT_ID']) {
  if (!process.env[name]) throw new Error(`${name} is required`);
}
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters');
}

const app = express();
const PORT = process.env.PORT || process.env.BACKEND_PORT || 3001;
const generatedRoutesEnabled = process.env.ENABLE_GENERATED_FEATURES === 'true' && process.env.NODE_ENV !== 'production';

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '2mb' }));

app.use('/api/auth', require('./routes/auth'));
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'ai-volunteer-matching-management', generatedRoutesEnabled,
    timestamp: new Date().toISOString() });
});

app.use('/api', auth);
app.use('/api/governance', governanceRouter);

if (generatedRoutesEnabled) {
  const mounts = [
    ['/api/ai', './routes/ai'],
    ['/api/skills-opportunity-matching', './routes/skillsOpportunityMatching'],
    ['/api/retention-risk-scoring', './routes/retentionRiskScoring'],
    ['/api/impact-report-generation', './routes/impactReportGeneration'],
    ['/api/volunteer-hours-tracking', './routes/volunteerHoursTracking'],
    ['/api/background-check', './routes/backgroundCheck'],
    ['/api/mobile-shift-checkin', './routes/mobileShiftCheckin'],
    ['/api/custom-views', './routes/customViews']
  ];
  mounts.forEach(([mount, modulePath]) => app.use(mount, require(modulePath)));
}

app.use((req, res) => res.status(404).json({ error: 'not found' }));
app.use((err, req, res, next) => {
  console.error('Unhandled request error:', err.message);
  res.status(500).json({ error: 'internal server error' });
});

app.listen(PORT, () => console.log(`AI Volunteer Matching Management backend listening on port ${PORT}`));
