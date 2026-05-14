import React from 'react';
import AiToolPage from '../AiToolPage.jsx';

export default function OpportunityDescription() {
  return (
    <AiToolPage
      title="Opportunity Description"
      intro="Turn raw organizer notes into a polished volunteer opportunity listing."
      endpoint="opportunity-description"
      fields={[
        { name: 'notes', label: 'Raw organizer notes', type: 'textarea', rows: 8 },
        { name: 'organization', label: 'Organization', type: 'text' },
        { name: 'cause_area', label: 'Cause area', type: 'text', placeholder: 'education / health / environment / ...' },
        { name: 'audience_tone', label: 'Audience tone', type: 'text', default: 'Welcoming, accessible, motivating' },
      ]}
    />
  );
}
