const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: '../.env' });

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/ai', require('./routes/ai'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'ai-volunteer-matching-management', timestamp: new Date().toISOString() });
});

// Custom Views (mounted before 404/error handler)
app.use('/api/custom-views', require('./routes/customViews'));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(err.statusCode || 500).json({
    error: err.message || 'Something went wrong',
  });
});

app.use('/api/skills-opportunity-matching', require('./routes/skillsOpportunityMatching')); app.use('/api/retention-risk-scoring', require('./routes/retentionRiskScoring')); app.use('/api/impact-report-generation', require('./routes/impactReportGeneration')); app.use('/api/volunteer-hours-tracking', require('./routes/volunteerHoursTracking')); app.use('/api/background-check', require('./routes/backgroundCheck')); app.use('/api/mobile-shift-checkin', require('./routes/mobileShiftCheckin'));

// === Batch 08 Gaps & Frontend Mounts ===
app.use('/api/gap-no-vision-based-volunteer-id-verification', require('./routes/gapNoVisionBasedVolunteerIdVerification'));
app.use('/api/gap-no-conversational-onboarding-bot-for-volunteers', require('./routes/gapNoConversationalOnboardingBotForVolunteers'));
app.use('/api/gap-no-predictive-volunteer-hour-forecasting-at-the-organization-level', require('./routes/gapNoPredictiveVolunteerHourForecastingAtTheOrganizationLevel'));
app.use('/api/gap-no-volunteer-profile-crud-backend-only-via-ai', require('./routes/gapNoVolunteerProfileCrudBackendOnlyViaAi'));
app.use('/api/gap-no-opportunity-crud-backend', require('./routes/gapNoOpportunityCrudBackend'));
app.use('/api/gap-no-shift-schedule-database-tables', require('./routes/gapNoShiftScheduleDatabaseTables'));
app.use('/api/gap-no-notifications-subsystem-sms-email-reminders', require('./routes/gapNoNotificationsSubsystemSmsEmailReminders'));
app.use('/api/gap-no-webhooks', require('./routes/gapNoWebhooks'));
app.use('/api/gap-no-reporting-export-endpoints', require('./routes/gapNoReportingExportEndpoints'));
app.use('/api/gap-no-background-check-compliance-tracking', require('./routes/gapNoBackgroundCheckComplianceTracking'));
app.use('/api/gap-no-donor-funder-reporting-integration', require('./routes/gapNoDonorFunderReportingIntegration'));
app.use('/api/gap-no-multi-organization-tenancy', require('./routes/gapNoMultiOrganizationTenancy'));

app.listen(PORT, () => {
  console.log(`AI Volunteer Matching Management backend listening on port ${PORT}`);
});
