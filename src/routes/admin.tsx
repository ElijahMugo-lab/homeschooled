import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin · Vetting Review · EduBridge" }] }),
  component: AdminPage,
});

interface PendingDoc {
  id: string;
  educator_id: string;
  doc_type: "national_id" | "certificate" | "other";
  file_path: string;
  status: "pending" | "approved" | "rejected";
  reviewer_notes: string | null;
  created_at: string;
  educator_name: string;
}

function AdminPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [docs, setDocs] = useState<PendingDoc[]>([]);
  const [filter, setFilter] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!loading && !user) router.navigate({ to: "/sign-in" });
    if (!loading && user && role !== "admin") {
      toast.error("Admin access required");
      router.navigate({ to: "/dashboard" });
    }
  }, [user, role, loading, router]);

  const refresh = async () => {
    setLoadingDocs(true);
    let q = supabase
      .from("vetting_documents")
      .select("*")
      .order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data, error } = await q;
    if (error) {
      toast.error(error.message);
      setLoadingDocs(false);
      return;
    }
    const ids = Array.from(new Set((data ?? []).map((d) => d.educator_id)));
    const nameMap = new Map<string, string>();
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      for (const p of profs ?? []) nameMap.set(p.id, p.full_name ?? "Unnamed");
    }
    setDocs(
      (data ?? []).map((d) => ({
        ...d,
        educator_name: nameMap.get(d.educator_id) ?? "Unknown",
      })),
    );
    setLoadingDocs(false);
  };

  useEffect(() => {
    if (role === "admin") void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, filter]);

  const viewFile = async (doc: PendingDoc) => {
    if (signedUrls[doc.id]) {
      window.open(signedUrls[doc.id], "_blank");
      return;
    }
    const { data, error } = await supabase.storage
      .from("vetting-docs")
      .createSignedUrl(doc.file_path, 300);
    if (error || !data) {
      toast.error(error?.message ?? "Could not load file");
      return;
    }
    setSignedUrls((s) => ({ ...s, [doc.id]: data.signedUrl }));
    window.open(data.signedUrl, "_blank");
  };

  const decide = async (doc: PendingDoc, decision: "approved" | "rejected") => {
    if (!user) return;
    const notes = decision === "rejected" ? prompt("Reason for rejection (optional):") ?? null : null;
    const { error } = await supabase
      .from("vetting_documents")
      .update({
        status: decision,
        reviewer_notes: notes,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", doc.id);
    if (error) {
      toast.error(error.message);
      return;
    }

    // If approved, also flip educator profile to verified
    if (decision === "approved") {
      const { error: pErr } = await supabase
        .from("educator_profiles")
        .update({ is_verified: true })
        .eq("id", doc.educator_id);
      if (pErr) toast.error(`Doc approved but profile update failed: ${pErr.message}`);
      else toast.success(`Approved ${doc.educator_name}`);
    } else {
      toast.success(`Rejected ${doc.educator_name}`);
    }
    void refresh();
  };

  if (loading || role !== "admin") {
    return (
      <PageShell>
        <section className="flex min-h-[60vh] items-center justify-center">
          <p className="italic text-muted-foreground">Verifying access…</p>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="border-b border-border px-6 py-12 md:px-10">
        <div className="mx-auto max-w-5xl">
          <p className="ornament-row mb-4 w-48">Admin Council</p>
          <h1 className="font-display text-4xl font-bold tracking-tight">Vetting Review</h1>
          <p className="mt-3 text-sm italic text-muted-foreground">
            Approve credentials to grant the Laurel Wreath. Reject with notes if a document is unclear.
          </p>
        </div>
      </section>

      <section className="px-6 py-10 md:px-10">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="flex flex-wrap gap-2">
            {(["pending", "approved", "rejected", "all"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`border px-4 py-2 font-display text-[0.6rem] tracking-[0.14em] uppercase ${
                  filter === f
                    ? "border-terracotta bg-terracotta text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-terracotta hover:text-terracotta"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {loadingDocs ? (
            <p className="italic text-muted-foreground">Loading submissions…</p>
          ) : docs.length === 0 ? (
            <div className="border border-border bg-card p-12 text-center">
              <p className="italic text-muted-foreground">No documents in this view.</p>
            </div>
          ) : (
            <ul className="space-y-3">
              {docs.map((d) => (
                <li key={d.id} className="border border-border bg-card p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-display text-base font-semibold">{d.educator_name}</p>
                      <p className="text-xs italic text-muted-foreground">
                        {labelFor(d.doc_type)} · submitted {new Date(d.created_at).toLocaleString()}
                      </p>
                      {d.reviewer_notes && (
                        <p className="mt-1 text-xs italic text-muted-foreground">Notes: {d.reviewer_notes}</p>
                      )}
                    </div>
                    <span
                      className={`border px-2.5 py-0.5 font-display text-[0.58rem] tracking-[0.14em] uppercase ${
                        d.status === "pending"
                          ? "border-gold text-gold"
                          : d.status === "approved"
                            ? "border-laurel text-laurel"
                            : "border-destructive text-destructive"
                      }`}
                    >
                      {d.status}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => void viewFile(d)}
                      className="border border-border px-4 py-2 font-display text-[0.58rem] tracking-[0.14em] text-muted-foreground uppercase hover:border-terracotta hover:text-terracotta"
                    >
                      View Document
                    </button>
                    {d.status === "pending" && (
                      <>
                        <button
                          onClick={() => void decide(d, "approved")}
                          className="bg-laurel px-4 py-2 font-display text-[0.58rem] tracking-[0.14em] text-white uppercase"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => void decide(d, "rejected")}
                          className="border border-destructive px-4 py-2 font-display text-[0.58rem] tracking-[0.14em] text-destructive uppercase"
                        >
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </PageShell>
  );
}

function labelFor(t: PendingDoc["doc_type"]) {
  if (t === "national_id") return "National ID";
  if (t === "certificate") return "Teaching Certificate";
  return "Other";
}
