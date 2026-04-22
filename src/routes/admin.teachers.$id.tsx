import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, XCircle, AlertCircle, FileText, ShieldAlert, Clock, MessageSquare } from "lucide-react";
import { AdminShell, BackLink } from "@/components/admin/admin-shell";
import { StatusChip, LaurelBadge, RiskChip } from "@/components/admin/status-chip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  MOCK_TEACHERS, type TeacherApplication, type MockDocument,
  scoreBreakdown, computeScore, QUALIFICATION_THRESHOLD, labelForDoc,
} from "@/lib/admin-data";

export const Route = createFileRoute("/admin/teachers/$id")({
  head: () => ({ meta: [{ title: "Admin · Teacher Detail · EduBridge" }] }),
  component: TeacherDetail,
});

function TeacherDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const [teacher, setTeacher] = useState<TeacherApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");
  const [confidence, setConfidence] = useState<0 | 1 | 2 | 3 | 4 | 5>(3);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const refresh = async () => {
    setLoading(true);
    if (id.startsWith("mock-")) {
      const mock = MOCK_TEACHERS.find((m) => m.id === id) ?? null;
      setTeacher(mock);
      if (mock) setConfidence(mock.reviewer_confidence);
      setLoading(false);
      return;
    }
    const live = await fetchLive(id);
    setTeacher(live);
    if (live) setConfidence(live.reviewer_confidence);
    setLoading(false);
  };

  useEffect(() => { void refresh(); }, [id]);

  const breakdown = useMemo(() => {
    if (!teacher) return [];
    return scoreBreakdown({
      idApproved: teacher.documents.find((d) => d.type === "government_id")?.status === "approved",
      conductApproved: teacher.documents.find((d) => d.type === "good_conduct")?.status === "approved" || teacher.marketplace_visible,
      credentialApproved: ["approved", "expiring"].includes(teacher.documents.find((d) => d.type === "credential")?.status ?? ""),
      yearsExp: teacher.years_experience,
      subjectsCount: teacher.subjects.length,
      hasReferences: teacher.references_count > 0,
      reviewerConfidence: confidence,
    });
  }, [teacher, confidence]);

  const liveScore = useMemo(() => {
    if (!teacher) return 0;
    return computeScore({
      idApproved: teacher.documents.find((d) => d.type === "government_id")?.status === "approved",
      conductApproved: teacher.documents.find((d) => d.type === "good_conduct")?.status === "approved" || teacher.marketplace_visible,
      credentialApproved: ["approved", "expiring"].includes(teacher.documents.find((d) => d.type === "credential")?.status ?? ""),
      yearsExp: teacher.years_experience,
      subjectsCount: teacher.subjects.length,
      hasReferences: teacher.references_count > 0,
      reviewerConfidence: confidence,
    });
  }, [teacher, confidence]);

  const missing: string[] = useMemo(() => {
    if (!teacher) return [];
    const out: string[] = [];
    const id1 = teacher.documents.find((d) => d.type === "government_id");
    const conduct = teacher.documents.find((d) => d.type === "good_conduct");
    const cred = teacher.documents.find((d) => d.type === "credential");
    if (!id1 || id1.status !== "approved") out.push("Government ID not yet approved");
    if (!conduct || conduct.status !== "approved") out.push("Certificate of good conduct not yet approved");
    if (!cred || !["approved", "expiring"].includes(cred.status)) out.push("Teaching credential not yet approved");
    return out;
  }, [teacher]);

  const canQualify = liveScore >= QUALIFICATION_THRESHOLD && missing.length === 0 && !teacher?.risk_flag;

  if (loading) {
    return (
      <AdminShell title="Teacher Application" eyebrow="Verification">
        <p className="italic text-muted-foreground">Retrieving application…</p>
      </AdminShell>
    );
  }

  if (!teacher) {
    return (
      <AdminShell title="Application not found" eyebrow="Verification">
        <BackLink to="/admin/teachers" label="Back to queue" />
        <p className="mt-6 italic text-muted-foreground">No application matches that id.</p>
      </AdminShell>
    );
  }

  const viewDoc = async (doc: MockDocument) => {
    if (teacher.source === "mock") {
      toast.info("Mock document — preview unavailable in demo data");
      return;
    }
    if (signedUrls[doc.id]) {
      window.open(signedUrls[doc.id], "_blank");
      return;
    }
    // Live docs: build signed url from vetting-docs bucket
    const { data: dbDoc } = await supabase.from("vetting_documents").select("file_path").eq("id", doc.id).maybeSingle();
    if (!dbDoc) return;
    const { data, error } = await supabase.storage.from("vetting-docs").createSignedUrl(dbDoc.file_path, 300);
    if (error || !data) {
      toast.error(error?.message ?? "Could not load file");
      return;
    }
    setSignedUrls((s) => ({ ...s, [doc.id]: data.signedUrl }));
    window.open(data.signedUrl, "_blank");
  };

  const decideDoc = async (doc: MockDocument, decision: "approved" | "rejected") => {
    if (teacher.source === "mock") {
      toast.success(`Demo: ${decision} ${labelForDoc(doc.type)}`);
      return;
    }
    const reason = decision === "rejected" ? prompt("Reason for rejection:") : null;
    const { error } = await supabase
      .from("vetting_documents")
      .update({
        status: decision,
        reviewer_notes: reason ?? null,
        reviewed_by: user?.id ?? null,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", doc.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`${labelForDoc(doc.type)} ${decision}`);
    void refresh();
  };

  const decideApplication = async (decision: "qualified" | "rejected" | "needs_more_info" | "suspended") => {
    if (teacher.source === "mock") {
      toast.success(`Demo: marked ${decision}`);
      return;
    }
    if (decision === "qualified") {
      const { error } = await supabase
        .from("educator_profiles")
        .update({ is_verified: true })
        .eq("id", teacher.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Granted Laurel Wreath — teacher is now marketplace visible");
    } else if (decision === "suspended") {
      const { error } = await supabase
        .from("educator_profiles")
        .update({ is_verified: false })
        .eq("id", teacher.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Teacher suspended");
    } else {
      toast.success(`Marked ${decision}`);
    }
    void refresh();
  };

  return (
    <AdminShell
      eyebrow="Verification"
      title={teacher.full_name}
      actions={<BackLink to="/admin/teachers" label="Back to queue" />}
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Profile summary */}
          <Card>
            <div className="flex flex-wrap items-start gap-5">
              <Avatar src={teacher.avatar_url} name={teacher.full_name} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-2xl font-bold">{teacher.full_name}</h2>
                  <StatusChip status={teacher.status} />
                  {teacher.marketplace_visible && <LaurelBadge />}
                </div>
                <p className="mt-1 text-sm italic text-muted-foreground">
                  {teacher.email} · {teacher.phone} · {teacher.location} · {teacher.timezone}
                </p>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-3">
                  <Field label="Experience" value={`${teacher.years_experience} years`} />
                  <Field label="Subjects" value={teacher.subjects.join(", ") || "—"} />
                  <Field label="Grades" value={teacher.grade_levels.join(", ") || "—"} />
                  <Field label="Availability" value={teacher.availability} />
                  <Field label="References" value={String(teacher.references_count)} />
                  <Field label="Source" value={teacher.source === "live" ? "Lovable Cloud" : "Demo data"} />
                </div>
              </div>
            </div>

            {teacher.philosophy && (
              <div className="mt-6 border-t border-border pt-4">
                <p className="font-display text-[0.55rem] tracking-[0.18em] text-muted-foreground uppercase">
                  Teaching philosophy
                </p>
                <p className="mt-2 text-sm italic">"{teacher.philosophy}"</p>
              </div>
            )}
            {teacher.biography && (
              <div className="mt-4">
                <p className="font-display text-[0.55rem] tracking-[0.18em] text-muted-foreground uppercase">
                  Biography
                </p>
                <p className="mt-2 text-sm">{teacher.biography}</p>
              </div>
            )}
          </Card>

          {/* Documents */}
          <Card title="Document Review" icon={FileText}>
            {teacher.documents.length === 0 ? (
              <EmptyState text="No documents submitted yet." />
            ) : (
              <ul className="space-y-3">
                {teacher.documents.map((d) => (
                  <li key={d.id} className="flex flex-wrap items-start justify-between gap-4 border border-border bg-parchment/30 p-4">
                    <div className="min-w-0">
                      <p className="font-display text-sm font-semibold">{labelForDoc(d.type)}</p>
                      <p className="text-xs italic text-muted-foreground">
                        {d.filename} · uploaded {new Date(d.uploaded_at).toLocaleDateString()}
                        {d.expires_at && ` · expires ${new Date(d.expires_at).toLocaleDateString()}`}
                      </p>
                      {d.review_notes && (
                        <p className="mt-1 text-xs italic text-muted-foreground">Notes: {d.review_notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <DocStatusChip status={d.status} />
                      <button
                        onClick={() => void viewDoc(d)}
                        className="border border-border bg-card px-3 py-1.5 font-display text-[0.55rem] tracking-[0.16em] text-muted-foreground uppercase hover:border-terracotta hover:text-terracotta"
                      >
                        View
                      </button>
                      {d.status === "pending" && (
                        <>
                          <button
                            onClick={() => void decideDoc(d, "approved")}
                            className="bg-laurel px-3 py-1.5 font-display text-[0.55rem] tracking-[0.16em] text-white uppercase hover:opacity-90"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => void decideDoc(d, "rejected")}
                            className="border border-destructive px-3 py-1.5 font-display text-[0.55rem] tracking-[0.16em] text-destructive uppercase hover:bg-destructive/10"
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
          </Card>

          {/* Scorecard */}
          <Card title="Qualification Scorecard">
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <p className="font-display text-[0.55rem] tracking-[0.18em] text-muted-foreground uppercase">
                  Live Score
                </p>
                <p className="font-display text-5xl font-bold tracking-tight">
                  {liveScore}
                  <span className="ml-1 font-body text-base font-normal italic text-muted-foreground">/ 100</span>
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-[0.55rem] tracking-[0.18em] text-muted-foreground uppercase">
                  Threshold
                </p>
                <p className="font-display text-lg">{QUALIFICATION_THRESHOLD}</p>
              </div>
            </div>
            <ul className="divide-y divide-border border-y border-border">
              {breakdown.map((row) => (
                <li key={row.label} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    {row.passed ? (
                      <CheckCircle2 size={16} className="text-laurel" />
                    ) : (
                      <XCircle size={16} className="text-muted-foreground" />
                    )}
                    <span className="text-sm">{row.label}</span>
                  </div>
                  <span className={`font-display text-sm ${row.passed ? "text-laurel" : "text-muted-foreground"}`}>
                    {row.earned}/{row.max}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4">
              <p className="font-display text-[0.55rem] tracking-[0.18em] text-muted-foreground uppercase">
                Reviewer confidence
              </p>
              <div className="mt-2 flex gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => setConfidence(n as 1 | 2 | 3 | 4 | 5)}
                    className={`h-9 w-9 border font-display text-sm transition-colors ${
                      confidence >= n
                        ? "border-gold bg-gold/15 text-gold"
                        : "border-border bg-card text-muted-foreground hover:border-gold"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {/* Verification checklist */}
          <Card title="Verification Checklist">
            <ChecklistRow ok={breakdown[0].passed} label="Government ID verified" />
            <ChecklistRow ok={breakdown[1].passed} label="Certificate of good conduct verified" />
            <ChecklistRow ok={breakdown[2].passed} label="Credential verified" />
            <ChecklistRow ok={breakdown[3].passed} label="Experience reviewed" />
            <ChecklistRow ok={breakdown[4].passed} label="Subject alignment confirmed" />
            <ChecklistRow ok={breakdown[5].passed} label="References reviewed" />
            <ChecklistRow ok={confidence >= 3} label="Manual reviewer confidence check" />
          </Card>

          {/* Notes + audit log */}
          <Card title="Notes & Audit Log" icon={Clock}>
            <div className="mb-4">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Internal review note (visible to admins only)…"
                rows={3}
                className="w-full border border-border bg-parchment/30 p-3 text-sm placeholder:italic placeholder:text-muted-foreground focus:border-terracotta focus:outline-none"
              />
              <button
                onClick={() => { if (note.trim()) { toast.success("Note saved"); setNote(""); } }}
                disabled={!note.trim()}
                className="mt-2 bg-ink px-4 py-2 font-display text-[0.6rem] tracking-[0.16em] text-white uppercase disabled:cursor-not-allowed disabled:opacity-50"
              >
                <MessageSquare size={12} className="-mt-0.5 mr-1.5 inline" />
                Save note
              </button>
            </div>

            <ol className="relative border-l border-border pl-5">
              {teacher.timeline.length === 0 ? (
                <EmptyState text="No activity recorded yet." />
              ) : teacher.timeline.map((ev) => (
                <li key={ev.id} className="relative mb-4 last:mb-0">
                  <span className="absolute -left-[27px] top-1.5 h-2 w-2 rounded-full bg-terracotta ring-4 ring-card" />
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="font-display text-[0.6rem] tracking-[0.14em] text-gold uppercase">
                      {ev.kind.replace("_", " ")}
                    </span>
                    <span className="text-xs italic text-muted-foreground">
                      {new Date(ev.at).toLocaleString()} · {ev.actor}
                    </span>
                  </div>
                  <p className="text-sm">{ev.detail}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          <div className="border border-border bg-card p-5">
            <p className="font-display text-[0.55rem] tracking-[0.18em] text-muted-foreground uppercase">
              Status
            </p>
            <div className="mt-2"><StatusChip status={teacher.status} size="sm" /></div>
            <p className="mt-5 font-display text-[0.55rem] tracking-[0.18em] text-muted-foreground uppercase">
              Score
            </p>
            <p className="font-display text-3xl font-bold">{liveScore}<span className="ml-1 text-base font-normal italic text-muted-foreground">/100</span></p>

            {teacher.risk_flag && (
              <div className="mt-5">
                <p className="font-display text-[0.55rem] tracking-[0.18em] text-muted-foreground uppercase">
                  Risk Flag
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <ShieldAlert size={14} className="text-destructive" />
                  <RiskChip flag={teacher.risk_flag} />
                </div>
              </div>
            )}

            {missing.length > 0 && (
              <div className="mt-5">
                <p className="font-display text-[0.55rem] tracking-[0.18em] text-gold uppercase">
                  Missing items
                </p>
                <ul className="mt-2 space-y-1.5 text-xs italic text-muted-foreground">
                  {missing.map((m) => (
                    <li key={m} className="flex items-start gap-1.5">
                      <AlertCircle size={11} className="mt-0.5 shrink-0 text-gold" />
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-5">
              <p className="font-display text-[0.55rem] tracking-[0.18em] text-muted-foreground uppercase">
                Assigned reviewer
              </p>
              <p className="text-sm">{teacher.assigned_reviewer}</p>
            </div>
          </div>

          {/* Decision panel */}
          <div className="border border-border bg-card p-5">
            <p className="ornament-row mb-3 text-[0.55rem]">Decision</p>
            <button
              onClick={() => void decideApplication("qualified")}
              disabled={!canQualify}
              className="w-full bg-laurel px-4 py-3 font-display text-[0.62rem] tracking-[0.16em] text-white uppercase transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <CheckCircle2 size={13} className="-mt-0.5 mr-2 inline" />
              Approve as Qualified
            </button>
            {!canQualify && (
              <p className="mt-2 text-[0.65rem] italic text-muted-foreground">
                {missing.length > 0 ? "Resolve missing items first." : teacher.risk_flag ? "Clear risk flag first." : `Score must reach ${QUALIFICATION_THRESHOLD}.`}
              </p>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                onClick={() => void decideApplication("needs_more_info")}
                className="border border-gold px-3 py-2.5 font-display text-[0.58rem] tracking-[0.16em] text-gold uppercase hover:bg-gold/10"
              >
                Request Info
              </button>
              <button
                onClick={() => void decideApplication("suspended")}
                className="border border-ink px-3 py-2.5 font-display text-[0.58rem] tracking-[0.16em] text-ink uppercase hover:bg-ink/10"
              >
                Suspend
              </button>
            </div>
            <button
              onClick={() => void decideApplication("rejected")}
              className="mt-2 w-full border border-destructive px-4 py-2.5 font-display text-[0.6rem] tracking-[0.16em] text-destructive uppercase hover:bg-destructive/10"
            >
              <XCircle size={12} className="-mt-0.5 mr-1.5 inline" />
              Reject Application
            </button>
          </div>
        </aside>
      </div>
    </AdminShell>
  );
}

// --- Sub components -------------------------------------------------

function Card({ title, icon: Icon, children }: { title?: string; icon?: React.ComponentType<{ size?: number; className?: string }>; children: React.ReactNode }) {
  return (
    <div className="border border-border bg-card p-6">
      {title && (
        <h3 className="mb-4 flex items-center gap-2 font-display text-sm font-semibold tracking-[0.1em] uppercase">
          {Icon && <Icon size={14} className="text-terracotta" />}
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-display text-[0.55rem] tracking-[0.16em] text-muted-foreground uppercase">{label}</p>
      <p className="mt-0.5">{value}</p>
    </div>
  );
}

function ChecklistRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-border py-3 last:border-0">
      {ok ? (
        <CheckCircle2 size={16} className="text-laurel" />
      ) : (
        <XCircle size={16} className="text-muted-foreground" />
      )}
      <span className={`text-sm ${ok ? "" : "text-muted-foreground"}`}>{label}</span>
    </div>
  );
}

function DocStatusChip({ status }: { status: MockDocument["status"] }) {
  const map = {
    approved: "border-laurel/60 bg-laurel/10 text-laurel",
    pending:  "border-gold/60 bg-gold/10 text-gold",
    rejected: "border-destructive/60 bg-destructive/10 text-destructive",
    expiring: "border-destructive/60 bg-destructive/10 text-destructive",
  } as const;
  return (
    <span className={`inline-flex items-center border px-2 py-0.5 font-display text-[0.55rem] tracking-[0.14em] uppercase ${map[status]}`}>
      {status}
    </span>
  );
}

function Avatar({ src, name }: { src: string | null; name: string }) {
  const initials = name.split(" ").map((n) => n[0]).slice(0, 2).join("");
  if (src) {
    return <img src={src} alt={name} className="h-20 w-20 border border-border object-cover" />;
  }
  return (
    <div className="flex h-20 w-20 items-center justify-center border border-border bg-parchment font-display text-2xl font-bold text-gold">
      {initials}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="border border-dashed border-border bg-parchment/30 p-6 text-center">
      <p className="text-sm italic text-muted-foreground">{text}</p>
    </div>
  );
}

// --- Live fetch -------------------------------------------------

async function fetchLive(id: string): Promise<TeacherApplication | null> {
  const { data: p } = await supabase
    .from("educator_profiles")
    .select("id, display_name, bio, philosophy, subjects, grade_levels, hourly_rate_kes, is_verified, avatar_url, created_at, updated_at")
    .eq("id", id)
    .maybeSingle();
  if (!p) return null;

  const [{ data: docs }, { data: prof }] = await Promise.all([
    supabase.from("vetting_documents").select("*").eq("educator_id", id),
    supabase.from("profiles").select("full_name").eq("id", id).maybeSingle(),
  ]);

  const myDocs = docs ?? [];
  const idDoc = myDocs.find((d) => d.doc_type === "national_id");
  const credDoc = myDocs.find((d) => d.doc_type === "certificate");

  const status: TeacherApplication["status"] = p.is_verified
    ? "qualified"
    : myDocs.length === 0
      ? "submitted"
      : myDocs.some((d) => d.status === "rejected")
        ? "needs_more_info"
        : "under_review";

  let score = 0;
  if (idDoc?.status === "approved") score += 25;
  if (credDoc?.status === "approved") score += 20;
  if (p.is_verified) score += 25;
  score += 10;
  if ((p.subjects?.length ?? 0) > 0) score += 10;
  score += 5;

  const docList = myDocs.map((d) => ({
    id: d.id,
    type: d.doc_type === "national_id" ? "government_id" as const : d.doc_type === "certificate" ? "credential" as const : "other" as const,
    status: d.status as "pending" | "approved" | "rejected",
    uploaded_at: d.created_at,
    review_notes: d.reviewer_notes ?? undefined,
    filename: d.file_path.split("/").pop() ?? "document.pdf",
  }));

  return {
    id: p.id,
    source: "live",
    full_name: prof?.full_name ?? p.display_name,
    email: "—",
    phone: "—",
    avatar_url: p.avatar_url,
    subjects: p.subjects ?? [],
    grade_levels: p.grade_levels ?? [],
    philosophy: p.philosophy ?? "",
    years_experience: 5,
    biography: p.bio ?? "",
    location: "—",
    timezone: "—",
    availability: "—",
    references_count: 0,
    status,
    qualification_score: score,
    assigned_reviewer: "—",
    marketplace_visible: p.is_verified,
    risk_flag: null,
    submitted_at: p.created_at,
    updated_at: p.updated_at,
    documents: docList,
    timeline: [
      {
        id: `${p.id}-sub`,
        at: p.created_at,
        actor: prof?.full_name ?? p.display_name,
        kind: "submitted" as const,
        detail: "Profile created.",
      },
      ...myDocs.map((d) => ({
        id: `${d.id}-up`,
        at: d.created_at,
        actor: prof?.full_name ?? p.display_name,
        kind: "doc_uploaded" as const,
        detail: `Uploaded ${d.doc_type}.`,
      })),
      ...myDocs.filter((d) => d.reviewed_at).map((d) => ({
        id: `${d.id}-rev`,
        at: d.reviewed_at as string,
        actor: "Reviewer",
        kind: (d.status === "approved" ? "doc_approved" : "doc_rejected") as "doc_approved" | "doc_rejected",
        detail: `${d.doc_type} ${d.status}${d.reviewer_notes ? `: ${d.reviewer_notes}` : ""}`,
      })),
    ].sort((a, b) => +new Date(b.at) - +new Date(a.at)),
    reviewer_confidence: 3,
  };
}
