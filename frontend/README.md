# TrustLedger frontend

Next.js App Router dashboard built with TypeScript, Tailwind CSS, shadcn/ui, Recharts, Lucide React and TanStack Query.

## Run locally

From the repository root, start the FastAPI service in one terminal:

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

In another terminal, start the frontend:

```bash
npm --prefix frontend install
npm --prefix frontend run dev
```

Open `http://localhost:3000`. The API base defaults to `http://localhost:8000`; override it with `NEXT_PUBLIC_API_BASE_URL` when needed. The root `.env.example` contains the local default.

Useful checks:

```bash
npm --prefix frontend run lint
npm --prefix frontend run typecheck
npm --prefix frontend run build
```

## Pages

- `/dashboard` — live pipeline statistics, monthly incident counts, facility monitoring and latest incidents.
- `/incidents` — searchable, paginated incident list.
- `/incidents/[id]` — temperature history, outage correlations and investigation-candidate units.
- `/inventory` — searchable, paginated unit-to-incident matches.
- `/data-quality` — sensor glitches, missing observations, duplicates and range checks.
- `/review` and `/audit-log` — clearly marked placeholders until the API supports authenticated decisions and audit persistence.

Dashboard figures are fetched from the API; no dataset statistics are hardcoded. API errors are shown in the interface instead of replacing failed responses with sample data.

## Data and safety

Timestamp parsing repairs the missing date/time separator form `YYYY-MM-DDHH:MM:SS` at ingestion and before display. Invalid timestamps remain visibly unavailable instead of being used on charts.

Incident and inventory records are read-only. Potentially affected units are **investigation candidates only**; the application does not decide safety or authorize release, discard, quarantine removal, compatibility or transfusion. Review and audit actions must not be added until authentication, role checks and an append-only audit API are implemented.
