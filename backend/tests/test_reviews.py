import sqlite3
import sys
from pathlib import Path

import pandas as pd
import pytest
from fastapi import HTTPException
from pydantic import ValidationError

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import main


@pytest.fixture
def review_environment(tmp_path, monkeypatch):
    output_dir = tmp_path / "processed"
    output_dir.mkdir()
    pd.DataFrame([{"incident_id": "INC-00001"}]).to_csv(
        output_dir / "incidents.csv", index=False
    )
    monkeypatch.setattr(main, "OUTPUT_DIR", output_dir)
    monkeypatch.setattr(main, "AUDIT_DB_PATH", output_dir / "review_audit.sqlite3")


def review_payload(**changes):
    payload = {
        "review_id": "0dd4f739-858e-4501-8b5a-fbc4ec5b54e4",
        "incident_id": "INC-00001",
        "actor_name": "Amina Reviewer",
        "role": "facility_staff",
        "decision": "change",
        "reason": "The sensor record needs a second check.",
        "changed_assessment": "Confirm the fridge log before escalating.",
    }
    return {**payload, **changes}


def test_review_is_persisted_and_returned_in_audit_log(review_environment):
    response = main.create_review(main.ReviewSubmission(**review_payload()))
    assert response["status"] == "recorded"

    audit = main.review_audit_log(100, 0)
    assert audit["total"] == 1
    assert audit["items"][0]["decision"] == "change"
    assert audit["items"][0]["actor_name"] == "Amina Reviewer"
    assert audit["items"][0]["changed_assessment"] == "Confirm the fridge log before escalating."
    assert "self-reported" in audit["notice"]


def test_review_ids_are_idempotent_and_cannot_be_reused_for_another_decision(review_environment):
    payload = review_payload()
    assert main.create_review(main.ReviewSubmission(**payload))["status"] == "recorded"
    assert main.create_review(main.ReviewSubmission(**payload))["status"] == "already_recorded"
    conflicting = main.ReviewSubmission(
        **review_payload(decision="reject", changed_assessment=None)
    )
    with pytest.raises(HTTPException) as error:
        main.create_review(conflicting)
    assert error.value.status_code == 409
    assert main.review_audit_log(100, 0)["total"] == 1


def test_review_cannot_make_product_disposition_decisions():
    with pytest.raises(ValidationError):
        main.ReviewSubmission(**review_payload(decision="release"))


def test_review_requires_an_assessment_for_change():
    with pytest.raises(ValidationError):
        main.ReviewSubmission(**review_payload(changed_assessment=None))


def test_review_requires_non_whitespace_reason():
    with pytest.raises(ValidationError):
        main.ReviewSubmission(**review_payload(reason="     "))


def test_unknown_incident_cannot_be_reviewed(review_environment):
    submission = main.ReviewSubmission(**review_payload(incident_id="INC-404"))
    with pytest.raises(HTTPException) as error:
        main.create_review(submission)
    assert error.value.status_code == 404


def test_audit_events_are_append_only(review_environment):
    main.create_review(main.ReviewSubmission(**review_payload()))
    with pytest.raises(sqlite3.IntegrityError, match="append-only"):
        with sqlite3.connect(main.AUDIT_DB_PATH) as connection:
            connection.execute(
                "UPDATE review_events SET reason = 'changed' WHERE review_id = ?",
                ("0dd4f739-858e-4501-8b5a-fbc4ec5b54e4",),
            )


def test_baseline_candidate_view_returns_candidates_without_evaluation_labels(
    review_environment,
):
    baseline = pd.DataFrame([
        {
            "incident_id": "INC-00001",
            "unit_id": "UNIT-1",
            "facility_id": "FAC-1",
            "exposure_start": "2026-01-01 01:00:00",
            "exposure_end": "2026-01-01 02:00:00",
            "component": "RBC",
            "blood_group": "O+",
            "unit_status": "in_stock",
            "temp_excursion_exposed_label": True,
        }
    ])
    baseline.to_csv(main.OUTPUT_DIR / "baseline_candidate_units.csv", index=False)

    response = main.affected_units_list(10, 0, None, "baseline")

    assert response["total"] == 1
    assert response["strategy"] == "baseline"
    assert "temp_excursion_exposed_label" not in response["items"][0]
    assert "Fallback baseline" in response["notice"]
