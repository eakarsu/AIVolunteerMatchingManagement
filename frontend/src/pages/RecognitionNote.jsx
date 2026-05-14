import React from 'react';
import AiToolPage from '../AiToolPage.jsx';

export default function RecognitionNote() {
  return (
    <AiToolPage
      title="Recognition Note"
      intro="Write a personalized appreciation note for a volunteer."
      endpoint="recognition-note"
      fields={[
        { name: 'volunteerId', label: 'Volunteer ID', type: 'number' },
        { name: 'occasion', label: 'Occasion', type: 'text', default: 'Volunteer Appreciation' },
      ]}
    />
  );
}
