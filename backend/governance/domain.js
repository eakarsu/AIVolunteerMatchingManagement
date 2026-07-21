'use strict';
function evaluate(input = {}, context = {}) {
  const errors = [];
  const organization = input.organization || {};
  const volunteers = input.volunteers || [];
  const opportunities = input.opportunities || [];
  const forecast = input.forecast || {};
  const match = input.match || {};
  const execution = input.execution || {};
  const validation = input.validation || {};
  if (!organization.id || !organization.tenantId || organization.tenantId !== context.tenant || !organization.ownerId || organization.ownerId !== context.actor || !organization.permissionVersion
      || !organization.consentPolicyVersion || !organization.retentionDays) errors.push('scoped volunteer organization required');
  const volunteerIds = new Set();
  for (const volunteer of volunteers) {
    if (!volunteer.id || volunteerIds.has(String(volunteer.id)) || !volunteer.profileVersion || !volunteer.consentVersion
        || !Array.isArray(volunteer.skills) || !Array.isArray(volunteer.availability) || !volunteer.eligibilityRef
        || volunteer.protectedAttributesUsed) errors.push('consented eligible volunteer profile invalid');
    volunteerIds.add(String(volunteer.id));
  }
  const opportunityIds = new Set();
  for (const opportunity of opportunities) {
    if (!opportunity.id || opportunityIds.has(String(opportunity.id)) || !opportunity.requirementsVersion
        || !opportunity.scheduleVersion || !Number.isInteger(opportunity.capacity) || opportunity.capacity < 1
        || !opportunity.sitePermissionVersion) errors.push('versioned opportunity invalid');
    opportunityIds.add(String(opportunity.id));
  }
  if (!forecast.id || !forecast.modelVersion || !forecast.datasetVersion || !forecast.horizon
      || !Number.isFinite(forecast.predictedHours) || !forecast.uncertainty || !forecast.assumptions) errors.push('versioned volunteer-hour forecast required');
  if (!match.id || !volunteerIds.has(String(match.volunteerId)) || !opportunityIds.has(String(match.opportunityId))
      || !match.ruleVersion || !match.explanation || !match.uncertaintyNote || match.autonomousPlacement
      || match.staffApproved !== true || !match.approvedBy || match.approvedBy === organization.ownerId) errors.push('independently approved non-autonomous match required');
  if (!['queued','confirmed','completed','cancelled','failed','recovery'].includes(execution.status) || !execution.feedbackAt
      || (execution.status === 'completed' && !execution.receiptRef)) errors.push('service confirmation or recovery state invalid');
  for (const key of ['fixtureVersion','forecastError','matchAcceptanceRate','latencyMs','failurePaths','realizedOutcomeRecorded','reconciled']) {
    if (validation[key] === undefined) errors.push(`validation ${key} required`);
  }
  for (const key of ['lateCancellation','capacityConflict','consentWithdrawal','backgroundCheckDelay','forecastCorrection','recovery']) {
    if (input.fixtures?.[key] !== true) errors.push(`fixture ${key} required`);
  }
  return { errors, result: { organizationId: organization.id, forecastHours: forecast.predictedHours, disposition: errors.length ? 'review' : 'staff-reviewed' },
    assumptions: ['Forecasts support planning and do not determine volunteer eligibility'],
    uncertainty: { partnerSystemsConnected: false, staffReviewRequired: true } };
}
module.exports = { evaluate };
