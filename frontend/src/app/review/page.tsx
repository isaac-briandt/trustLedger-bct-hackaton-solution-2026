import { ClipboardCheck } from "lucide-react";
import { PageHeading } from "@/components/page-heading";
import { PlaceholderWorkflow } from "@/components/placeholder-workflow";

export default function ReviewPage() {
  return (
    <>
      <PageHeading
        eyebrow="Human oversight"
        title="Review centre"
        description="A future workspace for authorized review of incident evidence and recommendations."
      />
      <PlaceholderWorkflow
        icon={ClipboardCheck}
        title="Human review is not enabled yet"
        description="The current API is read-only. This prototype does not accept, change or reject recommendations and does not make product disposition decisions."
        missing="An authenticated review API, role-based authorization, decision validation and append-only audit persistence."
      />
    </>
  );
}
