CREATE TABLE IF NOT EXISTS public.review_events (
    review_id TEXT PRIMARY KEY,
    incident_id TEXT NOT NULL,
    actor_name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('facility_staff', 'blood_service_supervisor')),
    decision TEXT NOT NULL CHECK (decision IN ('accept', 'change', 'reject')),
    reason TEXT NOT NULL,
    changed_assessment TEXT,
    created_at TEXT NOT NULL,
    auth_method TEXT NOT NULL DEFAULT 'legacy_self_reported'
        CHECK (auth_method IN ('legacy_self_reported', 'preprovisioned_demo_account'))
);

ALTER TABLE public.review_events
    ADD COLUMN IF NOT EXISTS auth_method TEXT NOT NULL DEFAULT 'legacy_self_reported';

CREATE OR REPLACE FUNCTION public.reject_review_event_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'review events are append-only';
END;
$$;

DROP TRIGGER IF EXISTS review_events_no_update ON public.review_events;
CREATE TRIGGER review_events_no_update
    BEFORE UPDATE ON public.review_events
    FOR EACH ROW EXECUTE FUNCTION public.reject_review_event_mutation();

DROP TRIGGER IF EXISTS review_events_no_delete ON public.review_events;
CREATE TRIGGER review_events_no_delete
    BEFORE DELETE ON public.review_events
    FOR EACH ROW EXECUTE FUNCTION public.reject_review_event_mutation();
