import React from 'react';
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { TOOLS } from './tools.js';

import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Home from './pages/Home.jsx';
import MatchVolunteers from './pages/MatchVolunteers.jsx';
import RecommendOpportunities from './pages/RecommendOpportunities.jsx';
import SkillsExtract from './pages/SkillsExtract.jsx';
import OpportunityDescription from './pages/OpportunityDescription.jsx';
import ShiftSchedule from './pages/ShiftSchedule.jsx';
import ImpactReport from './pages/ImpactReport.jsx';
import RetentionRisk from './pages/RetentionRisk.jsx';
import TrainingPlan from './pages/TrainingPlan.jsx';
import FeedbackSummary from './pages/FeedbackSummary.jsx';
import RecruitmentMessage from './pages/RecruitmentMessage.jsx';
import RecognitionNote from './pages/RecognitionNote.jsx';
// === Batch 08 Gaps & Frontend Mounts ===
import CfSkillsToOpportunityMatchingEngineWithExplainability from './pages/CfSkillsToOpportunityMatchingEngineWithExplainability'
import CfRetentionRiskScoringWithProactiveReEngagement from './pages/CfRetentionRiskScoringWithProactiveReEngagement'
import CfImpactReportAutoGenerationForGrantSubmissions from './pages/CfImpactReportAutoGenerationForGrantSubmissions'
import CfVolunteerHourTrackingWithVerificationWorkflow from './pages/CfVolunteerHourTrackingWithVerificationWorkflow'
import CfBackgroundCheckIntegrationsSterlingCheckr from './pages/CfBackgroundCheckIntegrationsSterlingCheckr'
import CfMobileCompanionAppForShiftCheckIn from './pages/CfMobileCompanionAppForShiftCheckIn'
import GapNoVisionBasedVolunteerIdVerification from './pages/GapNoVisionBasedVolunteerIdVerification'
import GapNoConversationalOnboardingBotForVolunteers from './pages/GapNoConversationalOnboardingBotForVolunteers'
import GapNoPredictiveVolunteerHourForecastingAtThe from './pages/GapNoPredictiveVolunteerHourForecastingAtThe'
import GapNoVolunteerProfileCrudBackendOnlyVia from './pages/GapNoVolunteerProfileCrudBackendOnlyVia'
import GapNoOpportunityCrudBackend from './pages/GapNoOpportunityCrudBackend'
import GapNoShiftScheduleDatabaseTables from './pages/GapNoShiftScheduleDatabaseTables'
import GapNoNotificationsSubsystemSmsEmailReminders from './pages/GapNoNotificationsSubsystemSmsEmailReminders'
import GapNoWebhooks from './pages/GapNoWebhooks'
import GapNoReportingExportEndpoints from './pages/GapNoReportingExportEndpoints'
import GapNoBackgroundCheckComplianceTracking from './pages/GapNoBackgroundCheckComplianceTracking'
import GapNoDonorFunderReportingIntegration from './pages/GapNoDonorFunderReportingIntegration'
import GapNoMultiOrganizationTenancy from './pages/GapNoMultiOrganizationTenancy'
import CustomViewsPage from './pages/CustomViewsPage.jsx';

import CodexCustomVizFeature from './pages/CodexCustomVizFeature';
import CodexOperationsFeature from './pages/CodexOperationsFeature';

import TimelineView from './pages/TimelineView';

function Sidebar() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  function onLogout() { logout(); nav('/'); }
  return (
    <nav className="sidebar">
      <h1>Volunteer Matching AI</h1>
      <NavLink to="/" end className={({ isActive }) => isActive ? 'active' : ''}>Dashboard</NavLink>
      <div style={{ marginTop: 12, fontSize: '0.75rem', textTransform: 'uppercase', color: '#9ca3af' }}>AI Tools</div>
      {TOOLS.map((t) => (
        <NavLink key={t.path} to={t.path} className={({ isActive }) => isActive ? 'active' : ''}>
          {t.title}
        </NavLink>
      ))}
      <div style={{ marginTop: 12, fontSize: '0.75rem', textTransform: 'uppercase', color: '#9ca3af' }}>Custom</div>
      <NavLink to="/custom-views" className={({ isActive }) => isActive ? 'active' : ''}>Volunteer Views</NavLink>
      <div className="user-box">
        <div>Signed in as</div>
        <div><strong>{user?.name || user?.email}</strong></div>
        <button onClick={onLogout}>Sign out</button>
      </div>
    </nav>
  );
}

function ProtectedShell({ children }) {
  const { user, ready } = useAuth();
  if (!ready) return <div style={{ padding: 40 }}>Loading...</div>;
  if (!user) return <Navigate to="/" replace />;
  return (
    <div className="app">
      <Sidebar />
      <div className="main">{children}</div>
    </div>
  );
}

export default function App() {
  const { user, ready } = useAuth();
  if (!ready) return <div style={{ padding: 40 }}>Loading...</div>;
  if (!user) {
    return (
      <Routes>
        <Route path="/insights/timeline" element={<ProtectedRoute><TimelineView /></ProtectedRoute>} />
        <Route path="/codex/custom-viz" element={<CodexCustomVizFeature />} />
        <Route path="/codex/operations" element={<CodexOperationsFeature />} />

        <Route path="/register" element={<Register />} />
        {/* // === Batch 08 Gaps & Frontend Mounts === */}
      <Route path="/cf-skills-to-opportunity-matching-engine-with-explainability" element={<ProtectedRoute><CfSkillsToOpportunityMatchingEngineWithExplainability /></ProtectedRoute>} />
      <Route path="/cf-retention-risk-scoring-with-proactive-re-engagement-campaigns" element={<ProtectedRoute><CfRetentionRiskScoringWithProactiveReEngagement /></ProtectedRoute>} />
      <Route path="/cf-impact-report-auto-generation-for-grant-submissions" element={<ProtectedRoute><CfImpactReportAutoGenerationForGrantSubmissions /></ProtectedRoute>} />
      <Route path="/cf-volunteer-hour-tracking-with-verification-workflow" element={<ProtectedRoute><CfVolunteerHourTrackingWithVerificationWorkflow /></ProtectedRoute>} />
      <Route path="/cf-background-check-integrations-sterling-checkr" element={<ProtectedRoute><CfBackgroundCheckIntegrationsSterlingCheckr /></ProtectedRoute>} />
      <Route path="/cf-mobile-companion-app-for-shift-check-in" element={<ProtectedRoute><CfMobileCompanionAppForShiftCheckIn /></ProtectedRoute>} />
      <Route path="/gap-no-vision-based-volunteer-id-verification" element={<ProtectedRoute><GapNoVisionBasedVolunteerIdVerification /></ProtectedRoute>} />
      <Route path="/gap-no-conversational-onboarding-bot-for-volunteers" element={<ProtectedRoute><GapNoConversationalOnboardingBotForVolunteers /></ProtectedRoute>} />
      <Route path="/gap-no-predictive-volunteer-hour-forecasting-at-the-organization-level" element={<ProtectedRoute><GapNoPredictiveVolunteerHourForecastingAtThe /></ProtectedRoute>} />
      <Route path="/gap-no-volunteer-profile-crud-backend-only-via-ai" element={<ProtectedRoute><GapNoVolunteerProfileCrudBackendOnlyVia /></ProtectedRoute>} />
      <Route path="/gap-no-opportunity-crud-backend" element={<ProtectedRoute><GapNoOpportunityCrudBackend /></ProtectedRoute>} />
      <Route path="/gap-no-shift-schedule-database-tables" element={<ProtectedRoute><GapNoShiftScheduleDatabaseTables /></ProtectedRoute>} />
      <Route path="/gap-no-notifications-subsystem-sms-email-reminders" element={<ProtectedRoute><GapNoNotificationsSubsystemSmsEmailReminders /></ProtectedRoute>} />
      <Route path="/gap-no-webhooks" element={<ProtectedRoute><GapNoWebhooks /></ProtectedRoute>} />
      <Route path="/gap-no-reporting-export-endpoints" element={<ProtectedRoute><GapNoReportingExportEndpoints /></ProtectedRoute>} />
      <Route path="/gap-no-background-check-compliance-tracking" element={<ProtectedRoute><GapNoBackgroundCheckComplianceTracking /></ProtectedRoute>} />
      <Route path="/gap-no-donor-funder-reporting-integration" element={<ProtectedRoute><GapNoDonorFunderReportingIntegration /></ProtectedRoute>} />
      <Route path="/gap-no-multi-organization-tenancy" element={<ProtectedRoute><GapNoMultiOrganizationTenancy /></ProtectedRoute>} />
      <Route path="*" element={<Login />} />
      </Routes>
    );
  }
  return (
    <Routes>
      <Route path="/" element={<ProtectedShell><Home /></ProtectedShell>} />
      <Route path="/tools/match-volunteers" element={<ProtectedShell><MatchVolunteers /></ProtectedShell>} />
      <Route path="/tools/recommend-opportunities" element={<ProtectedShell><RecommendOpportunities /></ProtectedShell>} />
      <Route path="/tools/skills-extract" element={<ProtectedShell><SkillsExtract /></ProtectedShell>} />
      <Route path="/tools/opportunity-description" element={<ProtectedShell><OpportunityDescription /></ProtectedShell>} />
      <Route path="/tools/shift-schedule" element={<ProtectedShell><ShiftSchedule /></ProtectedShell>} />
      <Route path="/tools/impact-report" element={<ProtectedShell><ImpactReport /></ProtectedShell>} />
      <Route path="/tools/retention-risk" element={<ProtectedShell><RetentionRisk /></ProtectedShell>} />
      <Route path="/tools/training-plan" element={<ProtectedShell><TrainingPlan /></ProtectedShell>} />
      <Route path="/tools/feedback-summary" element={<ProtectedShell><FeedbackSummary /></ProtectedShell>} />
      <Route path="/tools/recruitment-message" element={<ProtectedShell><RecruitmentMessage /></ProtectedShell>} />
      <Route path="/tools/recognition-note" element={<ProtectedShell><RecognitionNote /></ProtectedShell>} />
      <Route path="/custom-views" element={<ProtectedShell><CustomViewsPage /></ProtectedShell>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
