import React from 'react';
import AiToolPage from '../AiToolPage.jsx';

export default function FeedbackSummary() {
  return (
    <AiToolPage
      title="Feedback Summary"
      intro="Synthesize volunteer/host feedback into actionable insights."
      endpoint="feedback-summary"
      fields={[
        { name: 'opportunityId', label: 'Opportunity ID (optional)', type: 'text' },
        { name: 'lookbackDays', label: 'Lookback days', type: 'number', default: '90' },
      ]}
    />
  );
}
