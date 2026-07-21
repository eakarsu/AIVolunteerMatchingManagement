const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluate } = require('../domain');

function fixture() {
  return {
  organization:{id:'org1',tenantId:'t1',ownerId:'owner',permissionVersion:'p1',consentPolicyVersion:'c1',retentionDays:30},
  volunteers:[{id:'v1',profileVersion:'pv1',consentVersion:'cv1',skills:['food-service'],availability:['2026-07-20'],eligibilityRef:'check:1',protectedAttributesUsed:false}],
  opportunities:[{id:'o1',requirementsVersion:'r1',scheduleVersion:'s1',capacity:5,sitePermissionVersion:'site1'}],
  forecast:{id:'f1',modelVersion:'m1',datasetVersion:'d1',horizon:'30d',predictedHours:120,uncertainty:'plus-minus-20',assumptions:['confirmed shifts']},
  match:{id:'m1',volunteerId:'v1',opportunityId:'o1',ruleVersion:'rule1',explanation:'skills and availability',uncertaintyNote:'attendance unconfirmed',autonomousPlacement:false,staffApproved:true,approvedBy:'coordinator2'},
  execution:{status:'completed',feedbackAt:'2026-07-20T18:00:00Z',receiptRef:'service:1'},
  validation:{fixtureVersion:'fx1',forecastError:4,matchAcceptanceRate:0.8,latencyMs:30,failurePaths:true,realizedOutcomeRecorded:true,reconciled:true},
  fixtures:{lateCancellation:true,capacityConflict:true,consentWithdrawal:true,backgroundCheckDelay:true,forecastCorrection:true,recovery:true}
};
}

test('accepts governed volunteer match', () => {
  const result = evaluate(fixture(), { tenant: 't1', actor: 'owner' });
  assert.deepEqual(result.errors, []);
});

test('blocks unsafe or ungoverned volunteer match', () => {
  const input = fixture();
  input.volunteers[0].protectedAttributesUsed = true;
  assert.ok(evaluate(input, { tenant: 't1', actor: 'owner' }).errors.length > 0);
  assert.ok(evaluate(fixture(), { tenant: 'other', actor: 'owner' }).errors.length > 0);
});
