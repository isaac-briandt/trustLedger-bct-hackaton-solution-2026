# TrustLedger

**AI-assisted cold-chain incident detection, data quality validation and blood-unit traceability.**  
Terumo BCT Africa Hackathon 2026 · Challenge area: Data Quality & Cold Chain

## Milestone 1 status

The initial Python data foundation and read-only API are implemented and tested.

- [x] Initial monorepo structure
- [x] CSV ingestion for facilities, temperature logs, units, donations, transfers and power outages
- [x] Temperature sentinel, duplicate and missing-hour validation
- [x] Out-of-range episode grouping and sustained-event classification
- [x] Conservative historical unit-location reconstruction
- [x] RBC/WB incident-to-unit overlap matching
- [x] Power-outage correlation
- [x] Initial FastAPI read endpoints
- [x] Pipeline unit tests and API smoke tests
- [ ] Next.js dashboard
- [ ] Human decision workflow and audit trail
- [ ] AI model and baseline evaluation
- [ ] Offline mode / sync

## Repository structure

```text
trustledger/
├── backend/              # FastAPI and Python data pipeline
├── data/
│   ├── raw/              # Organizer CSV files (ignored by Git)
│   └── processed/        # Generated outputs (ignored by Git)
└── docs/                 # Architecture and dataset audit
```

## Quick start

Requirements: Python 3.10+.

1. Unzip the organizer's starter dataset.
2. Copy the CSV files into `data/raw/`.
3. Create and activate a virtual environment from the repository root:

```bash
python3 -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -r backend/requirements.txt
```

4. Run the pipeline:

```bash
cd backend
python -m app.run_pipeline --data ../data/raw --output ../data/processed
```

5. Run tests:

```bash
pytest -q
```

6. Start the API:

```bash
uvicorn app.main:app --reload --port 8000
```

Open `http://localhost:8000/docs` for interactive API documentation.

## API endpoints

- `GET /health`
- `GET /api/dashboard`
- `GET /api/data-quality`
- `GET /api/incidents`
- `GET /api/incidents/{incident_id}`
- `GET /api/units/affected/{incident_id}`
- `GET /api/power-correlations`

## Current pipeline findings

The supplied synthetic dataset contains 399,280 hourly temperature rows, 55 known sensor glitches, an estimated 12,440 missing hourly observations, 4,607 readings above 6°C, 360 sustained high-temperature episodes under the prototype's four-consecutive-reading rule, and 6,396 unique RBC/WB unit candidates overlapping those sustained episodes.

These are synthetic-data results, not facts about real facilities. See [`docs/data-audit.md`](docs/data-audit.md) for definitions and limitations.

## Safety and interpretation

- The prototype is advisory. It does not determine product safety or authorize release, discard, quarantine removal, compatibility or transfusion.
- A qualified blood-service professional must review evidence and make disposition decisions.
- The 2–6°C threshold is taken from the starter dataset for RBC/WB only. Component-specific requirements and incident escalation rules must be validated with a blood-service expert.
- Missing transfer receipt timestamps result in unknown location, not an assumed arrival.
- The dataset is synthetic and models a Kenyan blood system. Do not present its findings as real-world Kenyan facility statistics.

## AI tools used

ChatGPT was used to assist with dataset inspection, architecture planning, code drafting and test generation. The team must review, understand, test and be able to explain all submitted code.

## Next milestone

Implement the Next.js dashboard against the API contract, then add the human Accept / Change / Reject decision flow with role checks and an append-only audit trail. AI anomaly detection and its baseline comparison follow after the deterministic pipeline is stable.
