import type {
  DashboardData,
  DataQuality,
  IncidentDetail,
  ListResponse,
  Incident,
  AffectedUnit,
  ReviewEvent,
  ReviewRole,
  ReviewDecision,
  SiteConfig,
  TransportAlert,
} from "@/lib/types";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/+$/, "");
const CACHE_PREFIX = "trustledger-api-cache:";
const OUTBOX_KEY = "trustledger-review-outbox";
const CONNECTION_EVENT = "trustledger:offline-state";

export interface ReviewSubmission {
  review_id: string;
  incident_id: string;
  actor_name: string;
  role: ReviewRole;
  decision: ReviewDecision;
  reason: string;
  changed_assessment: string | null;
}

export interface ReviewResponse {
  status: "recorded" | "already_recorded" | "queued_offline";
  review: ReviewEvent;
  notice: string;
}

function announceConnection(state: "online" | "offline" | "stale" | "sync-error" | "cache-error") {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(CONNECTION_EVENT, { detail: { state } }),
    );
  }
}

function readCache<T>(path: string): T | null {
  if (typeof window === "undefined") return null;
  const key = `${CACHE_PREFIX}${path}`;
  try {
    const value = window.localStorage.getItem(key);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch {
    try {
      window.localStorage.removeItem(key);
    } catch {
      announceConnection("cache-error");
    }
    announceConnection("cache-error");
    return null;
  }
}

function writeCache(path: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(`${CACHE_PREFIX}${path}`, JSON.stringify(value));
  } catch {
    announceConnection("cache-error");
  }
}

function offlineValue<T>(path: string): T | null {
  const cached = readCache<T>(path);
  if (cached !== null) announceConnection("stale");
  return cached;
}

async function responseError(response: Response): Promise<Error> {
  let detail = `Request failed (${response.status})`;
  try {
    const body = (await response.json()) as { detail?: string };
    if (body.detail) detail = body.detail;
  } catch {
    // Keep the HTTP status when the server does not return JSON.
  }
  return new Error(detail);
}

async function request<T>(path: string): Promise<T> {
  const url = `${API_BASE_URL}${path}`;
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    const cached = offlineValue<T>(path);
    if (cached !== null) return cached;
    announceConnection("offline");
    throw new Error(
      `Could not connect to the TrustLedger API at ${API_BASE_URL}. No cached copy of this view is available.`,
    );
  }

  if (!response.ok) {
    const error = await responseError(response);
    if (response.status >= 500) {
      const cached = offlineValue<T>(path);
      if (cached !== null) return cached;
    }
    throw error;
  }

  const data = (await response.json()) as T;
  writeCache(path, data);
  announceConnection("online");
  return data;
}

function listQuery(limit: number, offset: number, search: string) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (search.trim()) params.set("search", search.trim());
  return params.toString();
}

export function fetchDashboard() {
  return request<DashboardData>("/api/dashboard");
}

export function fetchSiteConfig() {
  return request<SiteConfig>("/api/config");
}

export function fetchDataQuality() {
  return request<DataQuality>("/api/data-quality");
}

export function fetchIncidents(limit = 50, offset = 0, search = "") {
  return request<ListResponse<Incident>>(
    `/api/incidents?${listQuery(limit, offset, search)}`,
  );
}

export function fetchTransportAlerts(limit = 50, offset = 0, search = "") {
  return request<ListResponse<TransportAlert>>(
    `/api/transport-alerts?${listQuery(limit, offset, search)}`,
  );
}

export function fetchIncidentDetail(incidentId: string) {
  return request<IncidentDetail>(
    `/api/incidents/${encodeURIComponent(incidentId)}`,
  );
}

export function fetchAffectedUnits(
  limit = 50,
  offset = 0,
  search = "",
  strategy: "sustained" | "baseline" = "sustained",
) {
  return request<ListResponse<AffectedUnit>>(
    `/api/units/affected?${listQuery(limit, offset, search)}&strategy=${strategy}`,
  );
}

export function fetchReviewAudit() {
  return request<ListResponse<ReviewEvent>>("/api/audit-log?limit=100&offset=0");
}

export function getPendingReviews(): ReviewEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const serialized = window.localStorage.getItem(OUTBOX_KEY);
    if (!serialized) return [];
    return JSON.parse(serialized) as ReviewEvent[];
  } catch {
    try {
      window.localStorage.removeItem(OUTBOX_KEY);
    } catch {
      announceConnection("cache-error");
    }
    announceConnection("cache-error");
    return [];
  }
}

function savePendingReviews(events: ReviewEvent[]) {
  if (typeof window === "undefined") {
    throw new Error("Offline review storage is available only in the browser.");
  }
  try {
    if (events.length) {
      window.localStorage.setItem(OUTBOX_KEY, JSON.stringify(events));
    } else {
      window.localStorage.removeItem(OUTBOX_KEY);
    }
  } catch {
    throw new Error("This device could not save the offline review. Free browser storage and retry.");
  }
}

async function postReview(submission: ReviewSubmission): Promise<ReviewResponse> {
  const response = await fetch(`${API_BASE_URL}/api/reviews`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(submission),
  });
  if (!response.ok) throw await responseError(response);
  return (await response.json()) as ReviewResponse;
}

export async function submitReview(
  submission: ReviewSubmission,
): Promise<ReviewResponse> {
  try {
    const response = await postReview(submission);
    announceConnection("online");
    return response;
  } catch (error) {
    if (!(error instanceof TypeError)) throw error;
    const event: ReviewEvent = {
      ...submission,
      created_at: new Date().toISOString(),
      sync_status: "pending_sync",
    };
    savePendingReviews([...getPendingReviews(), event]);
    announceConnection("offline");
    return {
      status: "queued_offline",
      review: event,
      notice: "Saved on this device only. It will sync when the API is reachable.",
    };
  }
}

export async function syncPendingReviews(): Promise<number> {
  const pending = getPendingReviews();
  if (!pending.length || (typeof navigator !== "undefined" && !navigator.onLine)) {
    return 0;
  }

  const remaining = [...pending];
  let synced = 0;
  for (const event of pending) {
    try {
      await postReview({
        review_id: event.review_id,
        incident_id: event.incident_id,
        actor_name: event.actor_name,
        role: event.role,
        decision: event.decision,
        reason: event.reason,
        changed_assessment: event.changed_assessment,
      });
      remaining.shift();
      synced += 1;
    } catch (error) {
      savePendingReviews(remaining);
      if (error instanceof TypeError) {
        announceConnection("offline");
        return synced;
      }
      announceConnection("sync-error");
      throw error;
    }
  }
  savePendingReviews(remaining);
  announceConnection("online");
  return synced;
}
