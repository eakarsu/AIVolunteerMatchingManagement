import React from 'react';
import AiToolPage from '../AiToolPage.jsx';

export default function RecommendOpportunities() {
  return (
    <AiToolPage
      title="Recommend Opportunities"
      intro="Recommend the best open opportunities for a volunteer. Requires volunteerId."
      endpoint="recommend-opportunities"
      fields={[
        { name: 'volunteerId', label: 'Volunteer ID', type: 'number' },
        { name: 'count', label: 'Top N recommendations', type: 'number', default: '5' },
      ]}
    />
  );
}
