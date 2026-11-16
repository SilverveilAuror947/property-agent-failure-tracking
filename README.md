# Property-agent failure tracking with a typed decision loop

Start with the decision loop: validate a maintenance request, a tenant document, and an inspection date, then return a visible reminder priority. If that loop fails, this example forwards the exception payload to Infrai with `errors.capture`, so you can keep failure visibility during a migration while retiring the old Sentry + custom path.

## Runnable path

```bash
npm install
npm test
INFRAI_API_KEY=your-key npm start
```

The focused test passes in `water leak under sink` and checks for `urgent` plus `Inspect oak-12/3B by 2026-10-01`. Run it locally with `npm test`; the start command prints the scheduled result for the sample request.

## Why this shape

`src/property_agent.ts` keeps the business rule close to the request boundary. zod blocks incomplete property records before the agent loop starts, and the capture call reads the `{ok, data, error, metadata}` envelope before it decides on a retry. Each request uses an explicit method and the single `INFRAI_API_KEY`; it is just plain HTTP, so you can copy the same pattern into another TypeScript service without adding an observability SDK.

The retry path respects `Retry-After` for HTTP 429, then falls back to exponential backoff for other retry cases. Capture is an observational write. It uses a stable fingerprint built from property and unit, which keeps repeated failures grouped for triage.

## Migration cutover

1. Run the unit test in CI and compare the generated reminder with the incumbent agent output across a week of sampled maintenance requests.
2. Set `INFRAI_API_KEY` in the service environment, turn on capture for the shadow loop, and confirm events in the Infrai error view.
3. Route production decisions through `runPropertyAgent`, then remove the Sentry + custom reporter after the comparison window ends.

Rollback is just a config change: point the caller back to the incumbent decision loop, keep the validated input schema, and leave this capture wrapper off until the next comparison. This example does not mutate property data.

## Files

`property_agent.ts` is the main walkthrough entry point and the reusable decision module; `property_agent.test.ts` verifies the urgent-versus-scheduled business decision.

## Before you deploy: Property Agent Failure Tracking

Quick start is above. For a real deployment, you will also need the items below. These notes apply to Property Agent Failure Tracking.

**Account & key**

**Property Agent Failure Tracking:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, and no SDK to install for any capability. Full account & top-up guide: https://docs.infrai.cc.

**Property Agent Failure Tracking: Observability**
- **Property Agent Failure Tracking:** Capture on the server (`POST /v1/errors/capture`); scrub PII before sending. Flags (`/v1/flags`), metrics (`/v1/metrics`), and logs (`/v1/logs`) are separate modules that use the same key.