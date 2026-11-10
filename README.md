# TrustLedger

**Cold-chain incident detection and human investigation support for blood-bank teams.**
Terumo BCT Africa Hackathon 2026 · Challenge area: Cold chain and data quality

## Problem, user and workflow

A facility cold-chain officer needs to identify temperature excursions, understand which blood units may have overlapped the event, and send the evidence to a qualified reviewer without treating a data flag as a clinical decision. A blood-service supervisor can review the incident evidence and record an Accept, Change or Reject decision for the **investigation flag**.

The supplied synthetic data models Kenyan facilities. The named user roles are prototype personas and must be checked with a blood-service expert before being presented as validated local workflow.

1. The pipeline validates temperature records and groups continuous out-of-range readings.
2. Four consecutive hourly readings above the configured upper limit are marked sustained. Confirmed unit-location intervals are overlapped with sustained events to create investigation candidates.
3. Staff inspect temperature history, sensor-quality indicators, possible power-outage context and candidate units.
4. A signed-in demo reviewer records an investigation review with a reason. The backend assigns the reviewer name and role from a pre-provisioned account and appends the event to the local audit log.

No page releases, quarantines, discards or declares a unit safe or compatible. No real inventory or patient-care system is changed.

## Working prototype

- **API:** FastAPI endpoints serve generated pipeline results and review/audit events.
- **Dashboard:** Next.js responsive pages cover overview, facility incidents, transport temperature alerts, incident details, inventory traceability, data quality, review and audit.
- **Source data:** Synthetic hackathon CSVs in `data/raw/`; generated outputs in `data/processed/`.
- **Live API values:** Dashboard counts and benchmark values come from the pipeline output; they are not hardcoded in the UI.

### Data feature compared with baseline

The data feature is a sustained-event filter: require four consecutive hourly readings above the configured upper temperature limit before matching units. The baseline matches units for any single out-of-range reading. Both are evaluated against the starter dataset's evaluation-only exposure labels, at unique RBC/WB unit level:

| Method | Candidate units | Precision | Recall | True positives | False positives | False negatives |
|---|---:|---:|---:|---:|---:|---:|
| Four consecutive readings (feature) | 6,396 | 94.5% | 90.4% | 6,042 | 354 | 641 |
| Any out-of-range reading (baseline) | 23,017 | 28.2% | 97.1% | 6,492 | 16,525 | 191 |

This retrospective evaluation uses the supplied synthetic labels; it is **not held out** and does not establish real-world or cross-country performance. The feature returns fewer candidates and has higher measured precision, with lower recall than the baseline. The interface shows this trade-off, sample size and limitation. It is a transparent data rule, not a trained AI model, probability or clinical recommendation.

## Human control, audit and fallback

- Accept / Change / Reject records a human review of an **investigation flag**; a reason is required and Change also requires the revised assessment.
- The backend uses SQLite with database triggers that reject event updates and deletions. A client-generated review ID makes offline retries idempotent.
- The app has two pre-provisioned demo accounts. The backend verifies credentials, assigns each account a fixed role, and requires a signed HttpOnly session cookie for review and audit operations. This is prototype authentication only, not production identity management.
- The browser caches successful API GET responses, caches visited app pages with a service worker, and queues review submissions locally when the API cannot be reached. Queued actions are visibly marked and sync when the API returns.
- Inventory has a selectable single-reading baseline view for use when the sustained-event rule is unavailable or uncertain. The broader list is marked as a fallback and remains an investigation queue, not a disposition recommendation.
- Cached readings can be stale; pending events remain on that browser until accepted by the API. If there is no cached copy, the app reports that data is unavailable. Do not treat a cached or baseline result as a disposition decision.

## Architecture and data standards

See [docs/architecture.md](docs/architecture.md) for the architecture/data-flow diagram, data model, wider-system position, offline behavior and a conceptual mapping to HL7 FHIR and ISBT 128. Those standards are mapping targets only; no standards-compliant adapter is implemented.

## Run locally

Requirements: Python 3.10+, Node.js 22+, npm.

1. Place the organizer's synthetic CSVs in `data/raw/`.
2. Create and activate a Python environment, then install dependencies:

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate  # Windows: .venv\Scripts\activate
   pip install -r backend/requirements.txt
   ```

3. Configure the demo login before starting the API:

   - Copy `.env.example` to `.env` and set a random `TRUSTLEDGER_AUTH_SECRET` (at least 32 characters), both demo usernames, display names, and unique passwords of at least 12 characters.
   - Generate a secret with `python3 -c 'import secrets; print(secrets.token_urlsafe(32))'`. Never commit `.env` or use the sample accounts/passwords for deployment.
   - Load the values into the API shell (`set -a; . ./.env; set +a` in POSIX shells), then keep that shell open when starting the API. In hosted environments, set these values in the provider's secret manager instead.

4. Generate processed data:

   ```bash
   cd backend
   python -m app.run_pipeline --data ../data/raw --output ../data/processed
   cd ..
   ```

5. Start the API in one terminal:

   ```bash
   source .venv/bin/activate
   cd backend
   set -a
   . ../.env
   set +a
   uvicorn app.main:app --reload --port 8000
   ```

6. In another terminal, copy `frontend/.env.example` to `frontend/.env.local`, install and start:

   ```bash
   npm --prefix frontend install
   npm --prefix frontend run dev
   ```

7. Open [http://localhost:3000](http://localhost:3000) and sign in with one of the configured accounts. API documentation is at [http://localhost:8000/docs](http://localhost:8000/docs).

Run backend checks from the repository root with `.venv/bin/pytest -q`. Run frontend checks with `npm --prefix frontend run lint`, `npm --prefix frontend run typecheck` and `npm --prefix frontend run build`.

## Configuration for another site

The API reads site, threshold, CORS, demo-account, session-secret and cookie settings from its environment. For deployment across different frontend/backend sites, set `TRUSTLEDGER_COOKIE_SECURE=true` and `TRUSTLEDGER_COOKIE_SAMESITE=none`; keep the CORS allowlist restricted to the exact frontend origin. The frontend reads `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_COUNTRY_LABEL` and `NEXT_PUBLIC_API_BASE_URL`; examples are in `.env.example` and `frontend/.env.example`. `TRUSTLEDGER_AUDIT_DB_PATH` optionally selects the local audit database path. Set policy values only after the relevant blood-service authority confirms them, then rerun the pipeline with the same settings. The current workflow supports one RBC/WB temperature range and English labels; component-specific rules, translation, and country-specific legal workflows need further implementation and expert review.

## Safety and limitations

- Data is synthetic and for demonstration only. Do not use it to make real facility or patient-care decisions.
- Hourly observations bound incident timing approximately; the dataset has no fridge/device identifier.
- A candidate match is evidence for investigation, not proof of unsafe product. An unknown transfer receipt means unknown location.
- Sensor glitches and missing-hour estimates are surfaced; estimated gaps are not observed records.
- Transport cool-box maximum temperatures above the configured RBC/WB upper limit appear in a separate transport-alert view. A single maximum is not a continuous trace and does not prove exposure duration or product safety.
- Facility temperature readings have no fridge or sensor identifier, so incidents are facility-level and cannot be attributed to a specific appliance.
- The threshold and four-reading rule are prototype settings, not universal clinical policy.
- The demo login uses environment-provisioned credentials and signed cookies; it has no managed identity, MFA, account recovery/lifecycle, or production-grade abuse controls. Local review storage, browser cache and outbox are single-device demo mechanisms. Production requires a managed identity provider, blood-service-approved authorization, a protected shared audit store, retention policy, encrypted transport/storage, and integration with authorized inventory/quarantine systems.
- Weak-network fallback uses last-known cached data and queues review events; it does not support SMS and cannot synchronize until connectivity returns.

## Demo readiness

[docs/demo-script.md](docs/demo-script.md) contains a timed walkthrough under three minutes and the checklist for recording. A real team-recorded demo video still needs to be produced and attached to the submission; no recording is claimed in this repository.

## Evidence

- Backend unit/API tests: `backend/tests/`
- Data audit and calculation definitions: [docs/data-audit.md](docs/data-audit.md)
- Architecture diagram and mapping: [docs/architecture.md](docs/architecture.md)
- Demo recording plan: [docs/demo-script.md](docs/demo-script.md)

## AI tools

AI tools assisted with code drafting and analysis. Team members must review the implementation, understand the benchmark and limitations, and be able to explain the workflow and safety boundaries to judges.
