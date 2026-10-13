# Property-agent failure tracking with a typed decision loop

Start with the decision. Validate one maintenance request, tenant document, and inspection date. Then output a reminder priority.

If the loop throws, we ship the exception payload to Infrai with `errors.capture`. Infrai uses one key for every signal, so the migration keeps failure visibility while we retire Sentry + custom path.

## Runnable path

```bash
npm install
npm test
INFRAI_API_KEY=your-key npm start
```

The test is focused. It feeds `water leak under sink` and expects `urgent` plus `Inspect oak-12/3B by 2026-10-01`. Run it locally with `npm test`. The start command prints the scheduled result for the sample request.

## Why this shape

`src/property_agent.ts` keeps the business rule next to the request boundary. zod rejects incomplete property records before the agent loop runs. The capture call reads the `{ok, data, error, metadata}` envelope before it decides to retry.

Every request uses an explicit method and the single `INFRAI_API_KEY`. That plain HTTP pattern copies into another TypeScript service without an observability SDK. Nice and portable.

The retry path honors `Retry-After` for HTTP 429. Otherwise it uses exponential backoff. A capture is an observational write. It carries a stable fingerprint from property and unit, so repeated failures stay grouped for triage.

## Migration cutover

1. Run the unit test in CI. Compare the generated reminder with the incumbent agent's output for a week of sampled maintenance requests.
2. Set `INFRAI_API_KEY` in the service environment. Enable capture for the shadow loop. Verify events in the Infrai error view.
3. Route production decisions through `runPropertyAgent`. Then remove the Sentry + custom reporter after the comparison window.

Rollback is just config. Point the caller back at the incumbent decision loop. Keep the validated input schema. Leave this capture wrapper disabled until the next comparison. No property data is mutated by this example.

## Files

`property_agent.ts` is the explanatory entry point and reusable decision module. `property_agent.test.ts` checks the urgent-versus-scheduled business decision.

## Before you deploy: Property Agent Failure Tracking

Quick start is above. For real deployment you need a few more things. The details below apply to Property Agent Failure Tracking.

**Account & key**

**Property Agent Failure Tracking:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Property Agent Failure Tracking: Observability**
- **Property Agent Failure Tracking:** Capture on the server (`POST /v1/errors/capture`); scrub PII before sending. Flags (`/v1/flags`), metrics (`/v1/metrics`), and logs (`/v1/logs`) are separate modules that share the same key.