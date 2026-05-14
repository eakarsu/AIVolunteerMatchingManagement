import React from 'react';
import AiToolPage from '../AiToolPage.jsx';

export default function TrainingPlan() {
  return (
    <AiToolPage
      title="Training Plan"
      intro="Personalized onboarding and training plan for a volunteer-opportunity pair."
      endpoint="training-plan"
      fields={[
        { name: 'volunteerId', label: 'Volunteer ID', type: 'number' },
        { name: 'opportunityId', label: 'Opportunity ID', type: 'number' },
      ]}
    />
  );
}
