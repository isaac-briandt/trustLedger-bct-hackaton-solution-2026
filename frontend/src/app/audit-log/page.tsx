"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { ErrorState, LoadingState } from "@/components/query-states";
import { PageHeading } from "@/components/page-heading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { fetchReviewAudit, getPendingReviews } from "@/lib/api";
import type { ReviewEvent } from "@/lib/types";
import { formatDateTime } from "@/lib/date";

export default function AuditLogPage() {
  const queryClient = useQueryClient();
  const [pendingEvents, setPendingEvents] = useState<ReviewEvent[]>([]);
  const audit = useQuery({
    queryKey: ["audit-log"],
    queryFn: fetchReviewAudit,
  });

  useEffect(() => {
    const refresh = () => setPendingEvents(getPendingReviews());
    const onConnectionChange = () => {
      refresh();
      void queryClient.invalidateQueries({ queryKey: ["audit-log"] });
    };
    refresh();
    window.addEventListener("trustledger:offline-state", onConnectionChange);
    return () => window.removeEventListener("trustledger:offline-state", onConnectionChange);
  }, [queryClient]);

  const events = [
    ...pendingEvents,
    ...(audit.data?.items ?? []).filter(
      (record) => !pendingEvents.some((pending) => pending.review_id === record.review_id),
    ),
  ];

  return (
    <>
      <PageHeading
        eyebrow="Traceability"
        title="Audit log"
        description="A chronological record of human investigation reviews, with pending offline entries clearly marked."
        action={<ScrollText className="size-5 text-primary" aria-hidden="true" />}
      />

      <div role="note" className="mb-6 rounded-xl border bg-muted/50 px-4 py-3 text-sm leading-6 text-muted-foreground">
        Review events are append-only in the local prototype database. Offline entries are held in this browser until they sync. Demo names and roles are self-reported and are not an identity or authorization system.
      </div>

      {audit.isPending && events.length === 0 && <LoadingState label="Loading the audit log…" />}
      {audit.isError && events.length === 0 && (
        <ErrorState message={audit.error.message} onRetry={() => void audit.refetch()} />
      )}
      {audit.isError && events.length > 0 && (
        <p role="status" className="mb-4 text-sm text-amber-900">
          The API is unavailable. Showing available browser-pending and cached records.
        </p>
      )}
      {events.length > 0 ? (
        <ol className="space-y-3">
          {events.map((event) => (
            <li key={event.review_id}>
              <Card className="border-0 shadow-sm ring-1 ring-border/80">
                <CardContent className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{event.incident_id}</span>
                      <Badge variant="outline">{event.decision}</Badge>
                      {event.sync_status === "pending_sync" && (
                        <Badge className="border-amber-300 bg-amber-50 text-amber-900" variant="outline">Pending sync</Badge>
                      )}
                    </div>
                    <p className="mt-2 text-sm leading-6">{event.reason}</p>
                    {event.changed_assessment && (
                      <p className="mt-2 rounded-md bg-muted/60 p-2 text-sm">
                        Changed assessment: {event.changed_assessment}
                      </p>
                    )}
                    <p className="mt-3 text-xs text-muted-foreground">
                      {event.actor_name} · {event.role === "facility_staff" ? "Facility staff" : "Blood service supervisor"}
                    </p>
                  </div>
                  <time className="text-xs text-muted-foreground" dateTime={event.created_at}>
                    {formatDateTime(event.created_at)}
                  </time>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      ) : audit.data?.total === 0 ? (
        <div className="rounded-xl border border-dashed px-6 py-14 text-center text-sm text-muted-foreground">
          No human review events have been recorded yet. Start at the Review centre; the log is populated by saved decisions, not sample data.
        </div>
      ) : null}
    </>
  );
}
