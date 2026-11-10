import type {
  DashboardData,
  DataQuality,
  IncidentDetail,
  ListResponse,
  Incident,
  AffectedUnit,
} from "@/lib/types";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/+$/, "");

async function request<T>(path: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`);
  } catch {
    throw new Error(
      `Could not connect to the TrustLedger API at ${API_BASE_URL}. Check that the backend is running.`,
    );
  }

  if (!response.ok) {
    let detail = `Request failed (${response.status})`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) detail = body.detail;
    } catch {
      // Keep the HTTP status message when the API did not return JSON.
    }
    throw new Error(detail);
  }
  return (await response.json()) as T;
}

function listQuery(limit: number, offset: number, search: string) {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (search.trim()) params.set("search", search.trim());
  return params.toString();
}

export function fetchDashboard() {
  return request<DashboardData>("/api/dashboard");
}

export function fetchDataQuality() {
  return request<DataQuality>("/api/data-quality");
}

export function fetchIncidents(limit = 50, offset = 0, search = "") {
  return request<ListResponse<Incident>>(
    `/api/incidents?${listQuery(limit, offset, search)}`,
  );
}

export function fetchIncidentDetail(incidentId: string) {
  return request<IncidentDetail>(
    `/api/incidents/${encodeURIComponent(incidentId)}`,
  );
}

export function fetchAffectedUnits(limit = 50, offset = 0, search = "") {
  return request<ListResponse<AffectedUnit>>(
    `/api/units/affected?${listQuery(limit, offset, search)}`,
  );
}
