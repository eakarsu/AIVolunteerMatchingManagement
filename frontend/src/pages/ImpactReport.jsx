import React from 'react';
import AiToolPage from '../AiToolPage.jsx';

export default function ImpactReport() {
  return (
    <AiToolPage
      title="Impact Report"
      intro="Generate a volunteer impact report for the board / donors."
      endpoint="impact-report"
      fields={[
        { name: 'startDate', label: 'Start date (YYYY-MM-DD, optional)', type: 'text' },
        { name: 'endDate', label: 'End date (YYYY-MM-DD, optional)', type: 'text' },
        { name: 'audience', label: 'Audience', type: 'text', default: 'Board of directors and donors' },
      ]}
    />
  );
}
