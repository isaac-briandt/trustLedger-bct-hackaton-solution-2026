import { ScrollText } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { PlaceholderWorkflow } from "@/components/placeholder-workflow";

export default function AuditLogPage() {
  return (
    <>
      <PageHeading
        eyebrow="Traceability"
        title="Audit log"
        description="A future record of authorized human decisions and actions."
      />
      <PlaceholderWorkflow
        icon={ScrollText}
        title="No audit records are available"
        description="The current system exposes processed dataset results only. It has not yet implemented a human decision workflow or audit event storage."
        missing="An append-only audit API with actor identity, role, timestamp, decision, reason and linked incident."
      />
    </>
  );
}
