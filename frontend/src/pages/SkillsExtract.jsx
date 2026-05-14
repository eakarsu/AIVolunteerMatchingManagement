import React from 'react';
import AiToolPage from '../AiToolPage.jsx';

export default function SkillsExtract() {
  return (
    <AiToolPage
      title="Skills Extract"
      intro="Extract structured skills, interests, and causes from a free-text volunteer bio."
      endpoint="skills-extract"
      fields={[
        { name: 'bio', label: 'Volunteer bio', type: 'textarea', rows: 8 },
        { name: 'volunteerId', label: 'Volunteer ID (optional)', type: 'text' },
      ]}
    />
  );
}
