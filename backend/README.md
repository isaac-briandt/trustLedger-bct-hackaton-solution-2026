# TrustLedger backend (Milestone 1)

FastAPI service and reproducible ingestion/validation pipeline for the Terumo BCT Africa Hackathon synthetic starter dataset.

## Setup

From the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -r backend/requirements.txt
```

Place the organizer CSV files in `data/raw/`. Do not commit real patient or donor data. The supplied starter data is synthetic.

## Run the pipeline

```bash
cd backend
python -m app.run_pipeline --data ../data/raw --output ../data/processed
```

The pipeline creates:

- `pipeline_summary.json`
- `incidents.csv`
- `potentially_affected_units.csv`
- `unit_location_intervals.csv`
- `temperature_gaps_by_facility.csv`
- `incident_power_correlations.csv`

## Start the API

From `backend/`:

```bash
uvicorn app.main:app --reload --port 8000
```

Open `http://localhost:8000/docs` for the API explorer.

Endpoints:

- `GET /health`
- `GET /api/dashboard`
- `GET /api/data-quality`
- `GET /api/incidents?limit=50&offset=0&search=...`
- `GET /api/incidents/{incident_id}`
- `GET /api/units/affected?limit=50&offset=0&search=...`
- `GET /api/units/affected/{incident_id}`
- `GET /api/power-correlations`

The dashboard endpoint includes calculated monthly incident trends and per-facility counts. Incident details include the surrounding facility temperature history, outage correlations and investigation-candidate units. A missing date/time separator (`YYYY-MM-DDHH:MM:SS`) is normalized while reading timestamp columns; unparseable timestamps are still treated as missing.

## Safety and interpretation

- The dataset is synthetic and models a Kenyan blood system. Do not describe its findings as facts about real facilities.
- Temperature logger data is hourly. Incident start/end bounds are approximate.
- `0.0`, `-99.0`, and `99.9` are treated as known sensor glitches, not real excursions.
- The prototype uses the dictionary's 2–6°C red-cell/whole-blood range. Component-specific rules must be configured and confirmed by the blood-service expert before broader use.
- Unit location reconstruction is conservative: a missing `received_at` makes location unknown after dispatch.
- Potentially affected units are investigation candidates only. The system does not decide product safety, compatibility, release, discard, or transfusion. A qualified person retains authority.
- `temp_excursion_exposed` is carried only as a reference label for later evaluation; it is not used to detect incidents or construct exposure matches.
