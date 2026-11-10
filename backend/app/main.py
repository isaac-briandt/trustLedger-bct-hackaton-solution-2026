from pathlib import Path
import json

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.services.pipeline import parse_timestamp_series

APP_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = APP_DIR.parents[1]
OUTPUT_DIR = PROJECT_ROOT / "data" / "processed"
RAW_DIR = PROJECT_ROOT / "data" / "raw"

app = FastAPI(title="TrustLedger API", version="0.2.0", description="Cold-chain incident investigation prototype")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
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
    import pandas as pd
    incidents_path = OUTPUT_DIR / "incidents.csv"
    if not incidents_path.exists():
        raise HTTPException(status_code=503, detail="Run the data pipeline first.")
    summary = read_json("pipeline_summary.json")
    df = pd.read_csv(incidents_path)
    if df.empty:
        summary["incident_trends"] = []
        summary["facility_monitoring"] = []
        return summary

    df["start_time"] = parse_timestamp_series(df["start_time"])
    df["month"] = df["start_time"].dt.to_period("M")
    trends = []
    for month, group in df.groupby("month", sort=True):
        trends.append({
            "month": month.strftime("%b %Y"),
            "warning_count": int((group["severity"] == "warning").sum()),
            "sustained_count": int((group["severity"] == "sustained").sum()),
        })

    facilities = []
    for facility_id, group in df.groupby("facility_id", sort=True):
        latest = group["start_time"].max()
        facilities.append({
            "facility_id": facility_id,
            "incident_count": int(len(group)),
            "sustained_count": int((group["severity"] == "sustained").sum()),
            "latest_incident_at": latest.strftime("%Y-%m-%d %H:%M:%S") if pd.notna(latest) else None,
        })
    facilities.sort(key=lambda facility: (-facility["sustained_count"], -facility["incident_count"], facility["facility_id"]))
    summary["incident_trends"] = trends
    summary["facility_monitoring"] = facilities
    return summary


@app.get("/api/incidents")
def incidents(
    limit: int = 100,
    offset: int = 0,
    search: str | None = None,
):
    import pandas as pd
    path = OUTPUT_DIR / "incidents.csv"
    if not path.exists():
        raise HTTPException(status_code=503, detail="Run the data pipeline first.")
    limit = max(1, min(limit, 500))
    offset = max(0, offset)
    df = pd.read_csv(path)
    if search:
        searchable = [column for column in ["incident_id", "facility_id", "severity", "direction"] if column in df]
        matched = df[searchable].fillna("").astype(str).apply(
            lambda column: column.str.contains(search, case=False, regex=False)
        ).any(axis=1)
        df = df[matched]
    total = int(len(df))
    rows = df.iloc[offset:offset + limit]
    return {
        "items": rows.astype(object).where(pd.notna(rows), None).to_dict("records"),
        "total": total,
        "limit": limit,
        "offset": offset,
    }


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


@app.get("/api/units/affected")
def affected_units_list(
    limit: int = 100,
    offset: int = 0,
    search: str | None = None,
):
    import pandas as pd
    path = OUTPUT_DIR / "potentially_affected_units.csv"
    if not path.exists():
        raise HTTPException(status_code=503, detail="Run the data pipeline first.")
    limit = max(1, min(limit, 500))
    offset = max(0, offset)
    df = pd.read_csv(path).drop(columns=["temp_excursion_exposed_label"], errors="ignore")
    if search:
        searchable = [column for column in ["unit_id", "incident_id", "facility_id", "component", "blood_group", "unit_status"] if column in df]
        matched = df[searchable].fillna("").astype(str).apply(
            lambda column: column.str.contains(search, case=False, regex=False)
        ).any(axis=1)
        df = df[matched]
    total = int(len(df))
    rows = df.iloc[offset:offset + limit]
    return {
        "items": rows.astype(object).where(pd.notna(rows), None).to_dict("records"),
        "total": total,
        "limit": limit,
        "offset": offset,
        "notice": "Investigation candidates only. A qualified person must assess and decide disposition.",
    }


@app.get("/api/incidents/{incident_id}")
def incident_detail(incident_id: str):
    import pandas as pd
    incident_path = OUTPUT_DIR / "incidents.csv"
    affected_path = OUTPUT_DIR / "potentially_affected_units.csv"
    history_path = RAW_DIR / "temperature_logs.csv"
    correlations_path = OUTPUT_DIR / "incident_power_correlations.csv"
    if not incident_path.exists() or not affected_path.exists() or not history_path.exists() or not correlations_path.exists():
        raise HTTPException(status_code=503, detail="Run the data pipeline first.")
    incidents_df = pd.read_csv(incident_path)
    found = incidents_df[incidents_df["incident_id"] == incident_id]
    if found.empty:
        raise HTTPException(status_code=404, detail="Incident not found")
    affected = pd.read_csv(affected_path)
    units = affected[affected["incident_id"] == incident_id].drop(columns=["temp_excursion_exposed_label"], errors="ignore")
    incident = found.iloc[0].astype(object).where(pd.notna(found.iloc[0]), None).to_dict()

    history = pd.read_csv(history_path)
    required_history_columns = {"facility_id", "recorded_at", "temp_c"}
    if not required_history_columns.issubset(history.columns):
        raise HTTPException(status_code=503, detail="Temperature history source is missing required columns.")
    history["recorded_at"] = parse_timestamp_series(history["recorded_at"])
    history["temp_c"] = pd.to_numeric(history["temp_c"], errors="coerce")
    incident_start = parse_timestamp_series(pd.Series([incident["start_time"]])).iloc[0]
    incident_end = parse_timestamp_series(pd.Series([incident["end_time"]])).iloc[0]
    history = history[
        (history["facility_id"] == incident["facility_id"])
        & history["recorded_at"].between(incident_start - pd.Timedelta(hours=6), incident_end + pd.Timedelta(hours=6))
    ].sort_values("recorded_at")
    temperature_history = []
    for row in history.itertuples(index=False):
        is_glitch = row.temp_c in {-99.0, 99.9, 0.0}
        temperature_history.append({
            "recorded_at": row.recorded_at.strftime("%Y-%m-%d %H:%M:%S"),
            "temp_c": None if is_glitch or pd.isna(row.temp_c) else float(row.temp_c),
            "quality_status": "known_sensor_glitch" if is_glitch else "valid",
        })

    correlations = pd.read_csv(correlations_path)
    correlations = correlations[correlations["incident_id"] == incident_id]
    return {
        "incident": incident,
        "potentially_affected_units": units.astype(object).where(pd.notna(units), None).to_dict("records"),
        "temperature_history": temperature_history,
        "power_correlations": correlations.astype(object).where(pd.notna(correlations), None).to_dict("records"),
        "decision_required": True,
        "notice": "Investigation candidates only. A qualified person must assess and decide disposition.",
    }
