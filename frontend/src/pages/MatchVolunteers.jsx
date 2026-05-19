import React from 'react';
import AiToolPage from '../AiToolPage.jsx';

export default function MatchVolunteers() {
  return (
    <AiToolPage
      title="Match Volunteers"
      intro="Rank candidate volunteers for an opportunity (uses your DB). Requires opportunityId."
      endpoint="match-volunteers"
      fields={[
        { name: 'opportunityId', label: 'Opportunity ID', type: 'number' },
        { name: 'count', label: 'Top N matches', type: 'number', default: '5' },
      ]}
    />
  );
}
