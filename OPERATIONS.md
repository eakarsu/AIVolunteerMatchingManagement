# Volunteer Matching and Management operations

## Supported boundary

The governed path covers organization tenancy, consented volunteer profiles, skills, availability and eligibility, opportunity capacity, a versioned organization-level hours forecast, independently reviewed matches, service receipts, reconciliation, and recovery. Volunteer CRM, scheduling, background-check, messaging, calendar, accounting, notification, and webhook names are typed adapter contracts—not claims that live partners are connected.

Protected attributes are excluded from matching inputs. The system never automatically commits a volunteer, discloses private profile data, or treats a forecast as guaranteed capacity. Generated routes are disabled by default and cannot be enabled in production.

## Deploy and run

Install dependencies explicitly in `backend/` and `frontend/`. Configure `.env` from `.env.example` with `DATABASE_URL`, a unique `GOVERNANCE_TENANT_ID`, and a random `JWT_SECRET` of at least 32 characters. Keep partner credentials in a secret manager.

Use `./start.sh check`, then—only after SQL review and backup—`ALLOW_SCHEMA_MIGRATION=1 ./start.sh migrate`, followed by `./start.sh start`. Application startup never creates tables, installs packages, or seeds data.

## Workflow and recovery

Create a consented, subject-scoped work item at `/api/governance` with provenance and `Idempotency-Key`, submit its version, and obtain an independent safeguarding/coordinator decision. Queue approved allow-listed operations through the leased outbox. On revoked consent, background-check ambiguity, capacity conflict, partner timeout, stale forecast inputs, or duplicate webhook, stop commitment, record the exception, correct the authoritative source, and resume the same idempotent item or use manual placement.

Run `node --test backend/governance/tests/*.test.js` and `bash -n start.sh`. No seed runs during startup.
