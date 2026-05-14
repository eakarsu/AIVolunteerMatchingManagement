import React from 'react';
import AiToolPage from '../AiToolPage.jsx';

export default function RecruitmentMessage() {
  return (
    <AiToolPage
      title="Recruitment Message"
      intro="Draft 3 outreach versions tuned to the channel."
      endpoint="recruitment-message"
      fields={[
        { name: 'opportunityId', label: 'Opportunity ID', type: 'number' },
        { name: 'channel', label: 'Channel', type: 'text', placeholder: 'email / sms / instagram-post / linkedin-post / slack-announcement / flyer' },
        { name: 'audience', label: 'Audience', type: 'text', default: 'General community members' },
      ]}
    />
  );
}
