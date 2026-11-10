export interface TemperatureQuality {
  raw_rows: number;
  usable_rows: number;
  missing_temperature_or_timestamp_rows: number;
  known_sensor_glitch_rows: number;
  duplicate_rows: number;
  conflicting_duplicate_timestamps: number;
  estimated_missing_hourly_readings: number;
  out_of_range_readings: number;
  above_range_readings: number;
  below_range_readings: number;
}

export interface IncidentTrend {
  month: string;
  warning_count: number;
  sustained_count: number;
}

export interface FacilityMonitoring {
  facility_id: string;
  incident_count: number;
  sustained_count: number;
  latest_incident_at: string | null;
}

export interface DashboardData {
  dataset_note: string;
  temperature_quality: TemperatureQuality;
  incident_count: number;
  sustained_incident_count: number;
  warning_episode_count: number;
  potentially_affected_unit_matches: number;
  unique_potentially_affected_units: number;
  incidents_with_power_outage_overlap: number;
  location_intervals_built: number;
  safety_note: string;
  incident_trends: IncidentTrend[];
  facility_monitoring: FacilityMonitoring[];
}

export interface Incident {
  incident_id: string;
  facility_id: string;
  start_time: string;
  end_time: string;
  duration_hours: number;
  reading_count: number;
  peak_temp_c: number;
  minimum_temp_c: number;
  direction: string;
  severity: "warning" | "sustained" | string;
  sustained_rule: string;
}

export interface AffectedUnit {
  incident_id: string;
  unit_id: string;
  facility_id: string;
  exposure_start: string;
  exposure_end: string;
  component: string;
  blood_group: string;
  unit_status: string;
}

export interface TemperaturePoint {
  recorded_at: string;
  temp_c: number | null;
  quality_status: "valid" | "known_sensor_glitch" | string;
}

export interface PowerCorrelation {
  incident_id: string;
  outage_id: string;
  backup_power_engaged: string | boolean;
  overlap_minutes: number;
}

export interface IncidentDetail {
  incident: Incident;
  potentially_affected_units: AffectedUnit[];
  temperature_history: TemperaturePoint[];
  power_correlations: PowerCorrelation[];
  decision_required: boolean;
  notice: string;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  notice?: string;
}

export type DataQuality = TemperatureQuality;
