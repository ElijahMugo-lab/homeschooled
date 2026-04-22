import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, Filter } from "lucide-react";
import { AdminShell } from "@/components/admin/admin-shell";
import { StatusChip, RiskChip } from "@/components/admin/status-chip";
import { supabase } from "@/integrations/supabase/client";
import {
  MOCK_TEACHERS, type TeacherApplication, type AppStatus, labelForStatus,
} from "@/lib/admin-data";

export const Route = createFileRoute("/admin/teachers")({
  head: () => ({ meta: [{ title: "Admin · Teachers · EduBridge" }] }),
  component: AdminTeachers,
});

const TABS = [
  { key: "all", label: "All" },
  { key: "ready", label: "Ready to Review" },
  { key: "missing", label: "Missing Documents" },
  { key: "risk", label: "High Risk" },
  { key: "qualified", label: "Qualified" },
  { key: "rejected", label: "Rejected" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function AdminTeachers() {
  const [tab, setTab] = useState<TabKey>("all");
  const [statusFilter, setStatusFilter] = useState<AppStatus | "all">("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [reviewerFilter, setReviewerFilter] = useState<string>("all");
  const [riskOnly, setRiskOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"newest" | "oldest" | "score_high" | "score_low" | "longest">("newest");
  const [live, setLive] = useState<TeacherApplication[]>([]);

  useEffect(() => {
    void fetchLive().then(setLive);
  }, []);

  const all = useMemo(() => [...live, ...MOCK_TEACHERS], [live]);

  const subjects = useMemo(
    () => Array.from(new Set(all.flatMap((t) => t.subjects))).sort(),
    [all],
  );
  const reviewers = useMemo(
    () => Array.from(new Set(all.map((t) => t.assigned_reviewer))).sort(),
    [all],
  );

  const filtered = useMemo(() => {
    let rows = [...all];

    // Tabs
    if (tab === "ready") rows = rows.filter((r) => r.status === "submitted" || r.status === "under_review");
    else if (tab === "missing") rows = rows.filter((r) => r.documents.some((d) => d.status === "pending"));
    else if (tab === "risk") rows = rows.filter((r) => r.risk_flag !== null);
    else if (tab === "qualified") rows = rows.filter((r) => r.status === "qualified");
    else if (tab === "rejected") rows = rows.filter((r) => r.status === "rejected");

    if (statusFilter !== "all") rows = rows.filter((r) => r.status === statusFilter);
    if (subjectFilter !== "all") rows = rows.filter((r) => r.subjects.includes(subjectFilter));
    if (reviewerFilter !== "all") rows = rows.filter((r) => r.assigned_reviewer === reviewerFilter);
    if (riskOnly) rows = rows.filter((r) => r.risk_flag !== null);

    if (query.trim()) {
      const q = query.toLowerCase();
      rows = rows.filter(
        (r) => r.full_name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q),
      );
    }

    rows.sort((a, b) => {
      switch (sort) {
        case "newest": return +new Date(b.submitted_at) - +new Date(a.submitted_at);
        case "oldest": return +new Date(a.submitted_at) - +new Date(b.submitted_at);
        case "score_high": return b.qualification_score - a.qualification_score;
        case "score_low": return a.qualification_score - b.qualification_score;
        case "longest": {
          const ageA = Date.now() - +new Date(a.submitted_at);
          const ageB = Date.now() - +new Date(b.submitted_at);
          const pendA = a.status === "submitted" || a.status === "under_review";
          const pendB = b.status === "submitted" || b.status === "under_review";
          if (pendA && !pendB) return -1;
          if (!pendA && pendB) return 1;
          return ageB - ageA;
        }
      }
    });

    return rows;
  }, [all, tab, statusFilter, subjectFilter, reviewerFilter, riskOnly, query, sort]);

  const tabCounts: Record<TabKey, number> = useMemo(() => ({
    all: all.length,
    ready: all.filter((r) => r.status === "submitted" || r.status === "under_review").length,
    missing: all.filter((r) => r.documents.some((d) => d.status === "pending")).length,
    risk: all.filter((r) => r.risk_flag !== null).length,
    qualified: all.filter((r) => r.status === "qualified").length,
    rejected: all.filter((r) => r.status === "rejected").length,
  }), [all]);

  return (
    <AdminShell
      eyebrow="Verification Queue"
      title="Teacher Applications"
      actions={
        <button
          onClick={() => exportCsv(filtered)}
          className="border border-border bg-card px-4 py-2 font-display text-[0.6rem] tracking-[0.16em] text-muted-foreground uppercase hover:border-terracotta hover:text-terracotta"
        >
          Export CSV
        </button>
      }
    >
      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 font-display text-[0.62rem] tracking-[0.16em] uppercase transition-colors ${
              tab === t.key
                ? "border-terracotta text-terracotta"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
            <span className="border border-border bg-parchment px-1.5 py-0 text-[0.55rem] tracking-wider">
              {tabCounts[t.key]}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-6">
        <label className="relative col-span-1 lg:col-span-2">
          <Search size={14} className="absolute top-3 left-3 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full border border-border bg-card py-2.5 pr-3 pl-9 font-body text-sm placeholder:italic placeholder:text-muted-foreground focus:border-terracotta focus:outline-none"
          />
        </label>
        <FilterSelect label="Status" value={statusFilter} onChange={(v) => setStatusFilter(v as AppStatus | "all")}
          options={[
            { value: "all", label: "All statuses" },
            ...(["submitted", "under_review", "needs_more_info", "qualified", "rejected", "suspended"] as AppStatus[])
              .map((s) => ({ value: s, label: labelForStatus(s) })),
          ]}
        />
        <FilterSelect label="Subject" value={subjectFilter} onChange={setSubjectFilter}
          options={[{ value: "all", label: "All subjects" }, ...subjects.map((s) => ({ value: s, label: s }))]}
        />
        <FilterSelect label="Reviewer" value={reviewerFilter} onChange={setReviewerFilter}
          options={[{ value: "all", label: "All reviewers" }, ...reviewers.map((r) => ({ value: r, label: r }))]}
        />
        <FilterSelect label="Sort" value={sort} onChange={(v) => setSort(v as typeof sort)}
          options={[
            { value: "newest", label: "Newest first" },
            { value: "oldest", label: "Oldest first" },
            { value: "score_high", label: "Highest score" },
            { value: "score_low", label: "Lowest score" },
            { value: "longest", label: "Longest waiting" },
          ]}
        />
      </div>

      <div className="mt-3 flex items-center gap-4">
        <label className="inline-flex items-center gap-2 text-xs italic text-muted-foreground">
          <input type="checkbox" checked={riskOnly} onChange={(e) => setRiskOnly(e.target.checked)} className="accent-terracotta" />
          Show only flagged risks
        </label>
        <span className="ml-auto text-xs italic text-muted-foreground">
          <Filter size={12} className="-mt-0.5 mr-1 inline" />
          {filtered.length} of {all.length} applications
        </span>
      </div>

      {/* Table */}
      <div className="mt-4 overflow-x-auto border border-border bg-card">
        <table className="w-full min-w-[1000px] text-sm">
          <thead>
            <tr className="border-b border-border bg-parchment/40 text-left">
              {[
                "Teacher", "Submitted", "Subjects", "Grades",
                "Score", "Status", "Missing", "Reviewer", "Visible",
              ].map((h) => (
                <th key={h} className="px-4 py-3 font-display text-[0.55rem] tracking-[0.16em] text-muted-foreground uppercase">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-12 text-center italic text-muted-foreground">
                  No applications match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((t) => {
                const missingCount = t.documents.filter((d) => d.status === "pending").length;
                return (
                  <tr key={t.id} className="border-b border-border/60 last:border-0 hover:bg-parchment/40">
                    <td className="px-4 py-3 align-top">
                      <Link
                        to="/admin/teachers/$id"
                        params={{ id: t.id }}
                        className="block"
                      >
                        <p className="font-display text-sm font-semibold text-foreground hover:text-terracotta">
                          {t.full_name}
                        </p>
                        <p className="text-xs italic text-muted-foreground">{t.email}</p>
                        {t.risk_flag && <span className="mt-1 inline-block"><RiskChip flag={t.risk_flag} /></span>}
                      </Link>
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-muted-foreground">
                      {new Date(t.submitted_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 align-top text-xs">
                      {t.subjects.slice(0, 2).join(", ")}
                      {t.subjects.length > 2 && <span className="text-muted-foreground"> +{t.subjects.length - 2}</span>}
                    </td>
                    <td className="px-4 py-3 align-top text-xs text-muted-foreground">
                      {t.grade_levels.join(", ")}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <ScoreBar value={t.qualification_score} />
                    </td>
                    <td className="px-4 py-3 align-top">
                      <StatusChip status={t.status} />
                    </td>
                    <td className="px-4 py-3 align-top text-xs">
                      {missingCount > 0 ? (
                        <span className="font-display text-gold">{missingCount}</span>
                      ) : (
                        <span className="italic text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 align-top text-xs italic text-muted-foreground">
                      {t.assigned_reviewer}
                    </td>
                    <td className="px-4 py-3 align-top text-xs">
                      {t.marketplace_visible ? (
                        <span className="text-laurel">Yes</span>
                      ) : (
                        <span className="italic text-muted-foreground">No</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}

function FilterSelect({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-border bg-card px-3 py-2.5 font-body text-sm focus:border-terracotta focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

function ScoreBar({ value }: { value: number }) {
  const color = value >= 85 ? "bg-laurel" : value >= 60 ? "bg-gold" : "bg-terracotta";
  return (
    <div className="w-24">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-xs font-semibold">{value}</span>
        <span className="font-display text-[0.55rem] tracking-wider text-muted-foreground">/100</span>
      </div>
      <div className="mt-1 h-1.5 w-full bg-parchment">
        <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

function exportCsv(rows: TeacherApplication[]) {
  const headers = ["Name", "Email", "Status", "Score", "Subjects", "Grades", "Reviewer", "Submitted", "Visible"];
  const lines = rows.map((r) => [
    r.full_name, r.email, r.status, r.qualification_score,
    r.subjects.join("; "), r.grade_levels.join("; "),
    r.assigned_reviewer, r.submitted_at, r.marketplace_visible ? "yes" : "no",
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
  const csv = [headers.join(","), ...lines].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `teachers-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function fetchLive(): Promise<TeacherApplication[]> {
  const { data: profiles, error } = await supabase
    .from("educator_profiles")
    .select("id, display_name, bio, philosophy, subjects, grade_levels, hourly_rate_kes, is_verified, avatar_url, created_at, updated_at");
  if (error || !profiles) return [];

  const ids = profiles.map((p) => p.id);
  const [{ data: docs }, { data: profs }] = await Promise.all([
    supabase.from("vetting_documents").select("*").in("educator_id", ids),
    supabase.from("profiles").select("id, full_name").in("id", ids),
  ]);
  const nameMap = new Map((profs ?? []).map((p) => [p.id, p.full_name ?? "Unnamed"]));

  return profiles.map((p) => {
    const myDocs = (docs ?? []).filter((d) => d.educator_id === p.id);
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

    return {
      id: p.id,
      source: "live" as const,
      full_name: nameMap.get(p.id) ?? p.display_name,
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
      documents: myDocs.map((d) => ({
        id: d.id,
        type: d.doc_type === "national_id" ? "government_id" as const : d.doc_type === "certificate" ? "credential" as const : "other" as const,
        status: d.status as "pending" | "approved" | "rejected",
        uploaded_at: d.created_at,
        review_notes: d.reviewer_notes ?? undefined,
        filename: d.file_path.split("/").pop() ?? "document.pdf",
      })),
      timeline: [],
      reviewer_confidence: 3,
    };
  });
}
