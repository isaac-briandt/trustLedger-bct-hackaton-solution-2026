from pathlib import Path
import json

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

APP_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = APP_DIR.parents[1]
OUTPUT_DIR = PROJECT_ROOT / "data" / "processed"

app = FastAPI(title="TrustLedger API", version="0.1.0", description="Cold-chain incident investigation prototype")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def read_json(name: str):
    path = OUTPUT_DIR / name
    if not path.exists():
        raise HTTPException(status_code=503, detail="Data pipeline has not been run yet. Run `python -m app.run_pipeline` first.")
    return json.loads(path.read_text(encoding="utf-8"))


@app.get("/health")
def health():
    return {"status": "ok", "service": "trustledger-api"}


@app.get("/api/dashboard")
def dashboard():
    return read_json("pipeline_summary.json")


@app.get("/api/incidents")
def incidents(limit: int = 100):
    import pandas as pd
    path = OUTPUT_DIR / "incidents.csv"
    if not path.exists():
        raise HTTPException(status_code=503, detail="Run the data pipeline first.")
    df = pd.read_csv(path)
    return {"items": df.head(max(1, min(limit, 500))).astype(object).where(pd.notna(df), None).to_dict("records"), "total": int(len(df))}


@app.get("/api/data-quality")
def data_quality():
    return read_json("pipeline_summary.json")["temperature_quality"]


@app.get("/api/power-correlations")
def power_correlations(limit: int = 100):
    import pandas as pd
    path = OUTPUT_DIR / "incident_power_correlations.csv"
    if not path.exists():
        raise HTTPException(status_code=503, detail="Run the data pipeline first.")
    df = pd.read_csv(path)
    return {"items": df.head(max(1, min(limit, 500))).astype(object).where(pd.notna(df), None).to_dict("records"), "total": int(len(df))}


@app.get("/api/units/affected/{incident_id}")
def affected_units(incident_id: str):
    import pandas as pd
    path = OUTPUT_DIR / "potentially_affected_units.csv"
    if not path.exists():
        raise HTTPException(status_code=503, detail="Run the data pipeline first.")
    df = pd.read_csv(path)
    rows = df[df["incident_id"] == incident_id].copy()
    # Dataset exposure labels are evaluation-only and must not be shown as model output.
    rows = rows.drop(columns=["temp_excursion_exposed_label"], errors="ignore")
    return {"items": rows.astype(object).where(pd.notna(rows), None).to_dict("records"), "total": int(len(rows))}


@app.get("/api/incidents/{incident_id}")
def incident_detail(incident_id: str):
    import pandas as pd
    incident_path = OUTPUT_DIR / "incidents.csv"
    affected_path = OUTPUT_DIR / "potentially_affected_units.csv"
    if not incident_path.exists() or not affected_path.exists():
        raise HTTPException(status_code=503, detail="Run the data pipeline first.")
    incidents_df = pd.read_csv(incident_path)
    found = incidents_df[incidents_df["incident_id"] == incident_id]
    if found.empty:
        raise HTTPException(status_code=404, detail="Incident not found")
    affected = pd.read_csv(affected_path)
    units = affected[affected["incident_id"] == incident_id].drop(columns=["temp_excursion_exposed_label"], errors="ignore")
    return {
        "incident": found.iloc[0].astype(object).where(pd.notna(found.iloc[0]), None).to_dict(),
        "potentially_affected_units": units.astype(object).where(pd.notna(units), None).to_dict("records"),
        "decision_required": True,
        "notice": "Investigation candidates only. A qualified person must assess and decide disposition.",
    }
