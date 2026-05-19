import React from 'react';
import AiToolPage from '../AiToolPage.jsx';

export default function ShiftSchedule() {
  return (
    <AiToolPage
      title="Shift Schedule"
      intro="Design an optimal shift schedule for an opportunity."
      endpoint="shift-schedule"
      fields={[
        { name: 'opportunityId', label: 'Opportunity ID', type: 'number' },
        { name: 'dateRange', label: 'Date range (optional)', type: 'text', placeholder: 'e.g. 2026-05-10 to 2026-05-20' },
      ]}
    />
  );
}
