import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/admin-shell";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({ meta: [{ title: "Admin · Reports · EduBridge" }] }),
  component: () => (
    <AdminShell eyebrow="Reporting Center" title="Reports">
      <div className="border border-dashed border-border bg-parchment/30 p-12 text-center">
        <p className="ornament-row mx-auto mb-4 w-48 text-[0.55rem]">Coming Next</p>
        <p className="text-muted-foreground italic">
          Report exports — Qualified Teachers, Pending Review, Rejection trends, SLA, and Reviewer Performance — arrive in Stage 2.
        </p>
      </div>
    </AdminShell>
  ),
});
