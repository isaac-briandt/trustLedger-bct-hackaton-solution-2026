import pandas as pd
from app.services.pipeline import validate_temperature, build_incidents, build_location_intervals


def test_sentinel_values_are_not_counted_as_excursions():
    df = pd.DataFrame({
        "facility_id": ["F1"] * 4,
        "recorded_at": pd.date_range("2026-01-01", periods=4, freq="h"),
        "temp_c": [4.0, 7.0, 99.9, 1.0],
    })
    usable, quality = validate_temperature(df)
    assert quality["summary"]["known_sensor_glitch_rows"] == 1
    assert quality["summary"]["out_of_range_readings"] == 2
    incidents = build_incidents(usable)
    assert len(incidents) == 2


def test_missing_receipt_does_not_assume_destination_location():
    units = pd.DataFrame([{
        "unit_id": "U1", "processed_at_id": "F1", "collection_date": pd.Timestamp("2026-01-01"),
        "status": "in_stock", "status_date": pd.NaT,
    }])
    transfers = pd.DataFrame([{
        "unit_id": "U1", "from_facility_id": "F1", "to_facility_id": "F2",
        "dispatched_at": pd.Timestamp("2026-01-02"), "received_at": pd.NaT,
    }])
    intervals = build_location_intervals(units, transfers)
    assert len(intervals) == 1
    assert intervals.iloc[0]["facility_id"] == "F1"
    assert intervals.iloc[0]["end_time"] == pd.Timestamp("2026-01-02")
