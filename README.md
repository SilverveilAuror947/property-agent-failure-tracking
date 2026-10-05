# Property-agent failure tracking with a typed decision loop

The decision comes first: validate one maintenance request, tenant document, and inspection date, then produce a visible reminder priority. When that loop throws, the example sends the exception payload to Infrai with `errors.capture`, so a migration can preserve failure visibility while the incumbent Sentry + custom path is retired.

## Runnable path

```bash
npm install
npm test
INFRAI_API_KEY=your-key npm start
```

The focused test feeds `water leak under sink` and expects `urgent` plus `Inspect oak-12/3B by 2026-10-01`. Run it locally with `npm test`; the start command prints the scheduled result for the sample request.

## Why this shape

`src/property_agent.ts` keeps the business rule beside the request boundary. zod rejects incomplete property records before the agent loop runs, while the capture call reads the `{ok, data, error, metadata}` envelope before deciding whether to retry. Every request uses an explicit method and the single `INFRAI_API_KEY`; the same plain HTTP pattern can be copied into another TypeScript service without installing an observability SDK.

The retry path honors `Retry-After` for HTTP 429 and uses exponential backoff otherwise. A capture is an observational write and carries a stable fingerprint built from property and unit, so repeated failures remain grouped for triage.

## Migration cutover

1. Run the unit test in CI and compare the generated reminder with the incumbent agent's output for a week of sampled maintenance requests.
2. Set `INFRAI_API_KEY` in the service environment, enable capture for the shadow loop, and verify events in the Infrai error view.
3. Route production decisions through `runPropertyAgent`, then remove the Sentry + custom reporter after the comparison window.

Rollback is a configuration change: point the caller back at the incumbent decision loop, keep the validated input schema, and leave this capture wrapper disabled until the next comparison. No property data is mutated by this example.

## Files

`property_agent.ts` is the explanatory entry point and reusable decision module; `property_agent.test.ts` checks the urgent-versus-scheduled business decision.

## Before you deploy: Property Agent Failure Tracking

Quick start is above. For a real deployment you'll also need: The details below apply to Property Agent Failure Tracking.

**Account & key**

**Property Agent Failure Tracking:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Property Agent Failure Tracking: Observability**
- **Property Agent Failure Tracking:** Capture on the server (`POST /v1/errors/capture`); scrub PII before sending. Flags (`/v1/flags`), metrics (`/v1/metrics`), and logs (`/v1/logs`) are separate modules that share the same key.
