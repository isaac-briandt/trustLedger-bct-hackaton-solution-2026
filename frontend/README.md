# TrustLedger frontend — next milestone

The frontend will be a Next.js App Router application using TypeScript and Tailwind CSS.

## Initial pages

- `/dashboard` — pipeline summary and facility-level overview
- `/incidents` — warnings and sustained incidents
- `/incidents/[id]` — temperature evidence, outage context and potentially affected RBC/WB units
- `/data-quality` — invalid readings, missing hourly observations and data-quality trends

## API

The local FastAPI service runs at `http://localhost:8000`.

Set `NEXT_PUBLIC_API_BASE_URL=http://localhost:8000` in `.env.local`.

Available endpoints are documented in the root README and exposed at `http://localhost:8000/docs`.

The interface must clearly label all affected units as **investigation candidates** and must not provide a blood release or transfusion action. The next workflow milestone will add an authorized human decision interface backed by role checks and an audit trail.
