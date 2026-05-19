import React from 'react';
import HoursPerProgramChart from '../components/customViews/HoursPerProgramChart.jsx';
import MatchHeatmap from '../components/customViews/MatchHeatmap.jsx';
import ImpactReportPdf from '../components/customViews/ImpactReportPdf.jsx';
import MatchingRulesEditor from '../components/customViews/MatchingRulesEditor.jsx';

export default function CustomViewsPage() {
  return (
    <div data-testid="custom-views-page">
      <h2>Volunteer Views</h2>
      <p className="muted">Operational dashboards and editors that aggregate matching, impact, and program data.</p>

      <HoursPerProgramChart />
      <MatchHeatmap />
      <ImpactReportPdf />
      <MatchingRulesEditor />
    </div>
  );
}
