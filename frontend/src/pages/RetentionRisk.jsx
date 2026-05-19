import React from 'react';
import AiToolPage from '../AiToolPage.jsx';

export default function RetentionRisk() {
  return (
    <AiToolPage
      title="Retention Risk"
      intro="Identify at-risk volunteers and generate tailored re-engagement messages."
      endpoint="retention-risk"
      fields={[
        { name: 'lookbackDays', label: 'Lookback days', type: 'number', default: '90' },
      ]}
    />
  );
}
