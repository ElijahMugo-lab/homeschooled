import { createFileRoute } from "@tanstack/react-router";
import { AdminShell } from "@/components/admin/admin-shell";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({ meta: [{ title: "Admin · Settings · Homeschooled" }] }),
  component: () => (
    <AdminShell eyebrow="Verification Rules" title="Settings">
      <div className="border border-dashed border-border bg-parchment/30 p-12 text-center">
        <p className="ornament-row mx-auto mb-4 w-48 text-[0.55rem]">Coming Next</p>
        <p className="text-muted-foreground italic">
          Qualification thresholds, reviewer permissions, notification templates, risk rules, and analytics defaults — arrive in Stage 2.
        </p>
      </div>
    </AdminShell>
  ),
});
