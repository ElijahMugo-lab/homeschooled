import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle, FileText, RefreshCw, Inbox, ExternalLink } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/admin/pending")({
  head: () => ({ meta: [{ title: "Admin · Pending Requests · Homeschooled" }] }),
  component: AdminPendingRequests,
});

interface PendingDoc {
  id: string;
  doc_type: "national_id" | "certificate" | "other";
  status: "pending" | "approved" | "rejected";
  file_path: string;
  reviewer_notes: string | null;
  created_at: string;
}

interface PendingEducator {
  id: string;
  display_name: string;
  full_name: string | null;
  bio: string | null;
  subjects: string[];
  grade_levels: string[];
  created_at: string;
  documents: PendingDoc[];
}

const DOC_LABEL: Record<PendingDoc["doc_type"], string> = {
  national_id: "National ID",
  certificate: "Certificate",
  other: "Other Document",
};

function AdminPendingRequests() {
  const { user } = useAuth();
  const [rows, setRows] = useState<PendingEducator[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    // Pending = educator profiles not yet verified
    const { data: profiles, error } = await supabase
      .from("educator_profiles")
      .select("id, display_name, bio, subjects, grade_levels, created_at, is_verified")
      .eq("is_verified", false)
      .order("created_at", { ascending: true });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    const ids = (profiles ?? []).map((p) => p.id);
    if (ids.length === 0) {
      setRows([]);
      setLoading(false);
      return;
    }

    const [{ data: docs }, { data: profs }] = await Promise.all([
      supabase
        .from("vetting_documents")
        .select("id, educator_id, doc_type, status, file_path, reviewer_notes, created_at")
        .in("educator_id", ids),
      supabase.from("profiles").select("id, full_name").in("id", ids),
    ]);

    const nameMap = new Map((profs ?? []).map((p) => [p.id, p.full_name]));

    const merged: PendingEducator[] = (profiles ?? []).map((p) => ({
      id: p.id,
      display_name: p.display_name,
      full_name: nameMap.get(p.id) ?? null,
      bio: p.bio,
      subjects: p.subjects ?? [],
      grade_levels: p.grade_levels ?? [],
      created_at: p.created_at,
      documents: (docs ?? [])
        .filter((d) => d.educator_id === p.id)
        .map((d) => ({
          id: d.id,
          doc_type: d.doc_type,
          status: d.status,
          file_path: d.file_path,
          reviewer_notes: d.reviewer_notes,
          created_at: d.created_at,
        })),
    }));

    setRows(merged);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openDoc = async (doc: PendingDoc) => {
    const { data, error } = await supabase.storage
      .from("vetting-docs")
      .createSignedUrl(doc.file_path, 300);
    if (error || !data) {
      toast.error(error?.message ?? "Could not open document");
      return;
    }
    window.open(data.signedUrl, "_blank");
  };

  const approveRequest = async (educator: PendingEducator) => {
    setBusyId(educator.id);
    try {
      // Approve any pending docs
      const pendingDocs = educator.documents.filter((d) => d.status === "pending");
      if (pendingDocs.length > 0) {
        const { error: docErr } = await supabase
          .from("vetting_documents")
          .update({
            status: "approved",
            reviewed_by: user?.id ?? null,
            reviewed_at: new Date().toISOString(),
          })
          .in(
            "id",
            pendingDocs.map((d) => d.id),
          );
        if (docErr) throw docErr;
      }
      // Verify educator profile (grants marketplace visibility per RLS)
      const { error: profErr } = await supabase
        .from("educator_profiles")
        .update({ is_verified: true })
        .eq("id", educator.id);
      if (profErr) throw profErr;

      toast.success(`${educator.display_name} approved — laurel granted`);
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Approval failed";
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  };

  const rejectRequest = async (educator: PendingEducator) => {
    const reason = prompt(
      `Reject ${educator.display_name}'s application?\nOptional reason (shown to reviewer notes):`,
    );
    if (reason === null) return; // cancelled

    setBusyId(educator.id);
    try {
      const pendingDocs = educator.documents.filter((d) => d.status === "pending");
      if (pendingDocs.length > 0) {
        const { error: docErr } = await supabase
          .from("vetting_documents")
          .update({
            status: "rejected",
            reviewer_notes: reason || "Rejected by admin",
            reviewed_by: user?.id ?? null,
            reviewed_at: new Date().toISOString(),
          })
          .in(
            "id",
            pendingDocs.map((d) => d.id),
          );
        if (docErr) throw docErr;
      }
      // Ensure profile is not marketplace-visible
      const { error: profErr } = await supabase
        .from("educator_profiles")
        .update({ is_verified: false })
        .eq("id", educator.id);
      if (profErr) throw profErr;

      toast.success(`${educator.display_name} rejected`);
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Rejection failed";
      toast.error(msg);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminShell
      eyebrow="Awaiting Decision"
      title="Pending Teacher Requests"
      actions={
        <button
          onClick={() => void load()}
          className="inline-flex items-center gap-2 border border-border bg-card px-4 py-2 font-display text-[0.6rem] tracking-[0.16em] text-muted-foreground uppercase hover:border-terracotta hover:text-terracotta"
        >
          <RefreshCw size={12} />
          Refresh
        </button>
      }
    >
      {loading ? (
        <p className="italic text-muted-foreground">Loading pending requests…</p>
      ) : rows.length === 0 ? (
        <div className="border border-border bg-card p-12 text-center">
          <Inbox size={28} className="mx-auto text-muted-foreground" />
          <p className="mt-3 font-display text-sm tracking-[0.16em] uppercase">Inbox empty</p>
          <p className="mt-1 text-xs italic text-muted-foreground">
            No teacher requests are currently awaiting review.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs italic text-muted-foreground">
            {rows.length} teacher request{rows.length === 1 ? "" : "s"} awaiting verification.
            Approving grants the laurel wreath and marketplace visibility.
          </p>

          {rows.map((edu) => {
            const submittedAgo = Math.max(
              1,
              Math.round((Date.now() - +new Date(edu.created_at)) / 86400000),
            );
            const pendingDocCount = edu.documents.filter((d) => d.status === "pending").length;
            const isBusy = busyId === edu.id;

            return (
              <article
                key={edu.id}
                className="border border-border bg-card p-5 md:p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-lg font-bold">
                        {edu.full_name ?? edu.display_name}
                      </h2>
                      <span className="border border-gold/50 bg-gold/10 px-2 py-0.5 font-display text-[0.55rem] tracking-[0.16em] text-gold uppercase">
                        Pending
                      </span>
                      {pendingDocCount > 0 && (
                        <span className="border border-border px-2 py-0.5 font-display text-[0.55rem] tracking-[0.16em] text-muted-foreground uppercase">
                          {pendingDocCount} doc{pendingDocCount === 1 ? "" : "s"} to review
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-xs italic text-muted-foreground">
                      Submitted {submittedAgo} day{submittedAgo === 1 ? "" : "s"} ago ·{" "}
                      {edu.subjects.length > 0 ? edu.subjects.join(", ") : "No subjects listed"}
                      {edu.grade_levels.length > 0 && ` · ${edu.grade_levels.join(", ")}`}
                    </p>
                    {edu.bio && (
                      <p className="mt-3 line-clamp-2 text-sm text-foreground/80">{edu.bio}</p>
                    )}
                  </div>

                  <Link
                    to="/admin/teachers/$id"
                    params={{ id: edu.id }}
                    className="inline-flex items-center gap-1.5 font-display text-[0.6rem] tracking-[0.16em] text-muted-foreground uppercase hover:text-terracotta"
                  >
                    Full review
                    <ExternalLink size={11} />
                  </Link>
                </div>

                {/* Documents */}
                <div className="mt-4 border-t border-border pt-4">
                  <p className="mb-2 font-display text-[0.55rem] tracking-[0.18em] text-muted-foreground uppercase">
                    Submitted documents
                  </p>
                  {edu.documents.length === 0 ? (
                    <p className="text-xs italic text-muted-foreground">
                      No documents uploaded yet.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {edu.documents.map((d) => (
                        <li
                          key={d.id}
                          className="flex flex-wrap items-center justify-between gap-2 border border-border/70 bg-parchment/30 px-3 py-2"
                        >
                          <div className="flex items-center gap-2 text-sm">
                            <FileText size={13} className="text-muted-foreground" />
                            <span>{DOC_LABEL[d.doc_type]}</span>
                            <DocStatusPill status={d.status} />
                          </div>
                          <button
                            onClick={() => void openDoc(d)}
                            className="font-display text-[0.55rem] tracking-[0.16em] text-muted-foreground uppercase hover:text-terracotta"
                          >
                            View
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
                  <button
                    onClick={() => void approveRequest(edu)}
                    disabled={isBusy}
                    className="inline-flex items-center gap-1.5 bg-laurel px-4 py-2 font-display text-[0.6rem] tracking-[0.16em] text-white uppercase hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <CheckCircle2 size={12} />
                    Approve request
                  </button>
                  <button
                    onClick={() => void rejectRequest(edu)}
                    disabled={isBusy}
                    className="inline-flex items-center gap-1.5 border border-destructive px-4 py-2 font-display text-[0.6rem] tracking-[0.16em] text-destructive uppercase hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <XCircle size={12} />
                    Reject
                  </button>
                  {isBusy && (
                    <span className="self-center text-xs italic text-muted-foreground">
                      Processing…
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </AdminShell>
  );
}

function DocStatusPill({ status }: { status: PendingDoc["status"] }) {
  const map = {
    pending: "border-gold/50 bg-gold/10 text-gold",
    approved: "border-laurel/50 bg-laurel/10 text-laurel",
    rejected: "border-destructive/50 bg-destructive/10 text-destructive",
  } as const;
  return (
    <span
      className={`border px-1.5 py-0 font-display text-[0.5rem] tracking-[0.16em] uppercase ${map[status]}`}
    >
      {status}
    </span>
  );
}
