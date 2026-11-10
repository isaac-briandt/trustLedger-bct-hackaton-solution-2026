# TrustLedger frontend

Next.js App Router dashboard built with TypeScript, Tailwind CSS, Recharts, Lucide React and TanStack Query.

## Run locally

Run the data pipeline and FastAPI service as described in the [root README](../README.md). Then:

```bash
cp frontend/.env.example frontend/.env.local
npm --prefix frontend install
npm --prefix frontend run dev
```

Open `http://localhost:3000`. The app uses `NEXT_PUBLIC_API_BASE_URL` (default `http://localhost:8000`).

## Pages

- `/dashboard` — API-fed counts, facility monitoring, incident trends and retrospective feature-vs-baseline metrics.
- `/incidents` and `/incidents/[id]` — searchable incident evidence, temperature timeline, outage context and candidate units.
- `/inventory` — searchable, paginated investigation candidates with an explicit single-reading baseline fallback view.
- `/data-quality` — sensor glitches, missing observations, duplicates and the configured range.
- `/review` — human Accept / Change / Reject of an investigation flag; two self-reported demo roles, reason required.
- `/audit-log` — append-only local review events and browser-pending offline reviews.

## Offline behavior and safety

Successful GET responses are cached in browser local storage. In production, the service worker caches the app shell and static assets. If an API request fails, a cached response may be shown with a stale-data banner; uncached data remains unavailable. Review actions may be stored in a browser-only outbox and retried when connectivity returns. A pending action is not an API audit event until synced.

The role selector is a demo device, not authentication. Review choices concern the incident investigation flag only; they do not make or authorize a blood-unit disposition, compatibility or transfusion decision.

## Checks

```bash
npm --prefix frontend run lint
npm --prefix frontend run typecheck
npm --prefix frontend run build
```
