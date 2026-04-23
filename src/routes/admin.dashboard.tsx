import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { AdminShell } from "@/components/admin/admin-shell";
import { supabase } from "@/integrations/supabase/client";
import {
  MOCK_TEACHERS, buildKPIs, applicationsOverTime, qualificationRateOverTime,
  statusDistribution, rejectionReasons, teachersBySubject, teachersByGradeBand,
  reviewerActivity, documentHealth, avgReviewTimeOverTime, funnelData,
  type TeacherApplication,
} from "@/lib/admin-data";

export const Route = createFileRoute("/admin/dashboard")({
  head: () => ({ meta: [{ title: "Admin · Dashboard · Homeschooled" }] }),
  component: AdminDashboard,
});

const RANGES = [
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "12m", days: 365 },
] as const;

const PIE_COLORS = [
  "var(--color-gold)",
  "var(--color-terracotta)",
  "var(--color-laurel)",
  "var(--color-ink)",
  "var(--color-stone)",
  "var(--color-terracotta-deep)",
];

function AdminDashboard() {
  const [range, setRange] = useState<(typeof RANGES)[number]>(RANGES[1]);
  const [liveTeachers, setLiveTeachers] = useState<TeacherApplication[]>([]);

  useEffect(() => {
    void fetchLiveTeachers().then(setLiveTeachers);
  }, []);

  const teachers = useMemo(() => [...liveTeachers, ...MOCK_TEACHERS], [liveTeachers]);
  const kpis = useMemo(() => buildKPIs(teachers), [teachers]);
  const apps = useMemo(() => applicationsOverTime(teachers, range.days), [teachers, range]);
  const qualRate = useMemo(() => qualificationRateOverTime(teachers, range.days), [teachers, range]);
  const status = useMemo(() => statusDistribution(teachers), [teachers]);
  const reasons = rejectionReasons();
  const subjects = useMemo(() => teachersBySubject(teachers), [teachers]);
  const grades = useMemo(() => teachersByGradeBand(teachers), [teachers]);
  const reviewTime = useMemo(() => avgReviewTimeOverTime(range.days), [range]);
  const reviewers = useMemo(() => reviewerActivity(teachers), [teachers]);
  const docHealth = useMemo(() => documentHealth(teachers), [teachers]);
  const funnel = useMemo(() => funnelData(teachers), [teachers]);

  return (
    <AdminShell
      eyebrow="Verification Pipeline"
      title="Operational Overview"
      actions={
        <div className="flex border border-border bg-card">
          {RANGES.map((r) => (
            <button
              key={r.label}
              onClick={() => setRange(r)}
              className={`px-4 py-2 font-display text-[0.6rem] tracking-[0.16em] uppercase transition-colors ${
                range.label === r.label
                  ? "bg-terracotta text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      }
    >
      {/* KPI Grid */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <Kpi label="Total Applications" value={kpis.totalApplications} />
        <Kpi label="Pending Review" value={kpis.pendingReview} accent="gold" />
        <Kpi label="Under Review" value={kpis.underReview} accent="terracotta" />
        <Kpi label="Qualified" value={kpis.qualified} accent="laurel" />
        <Kpi label="Rejected" value={kpis.rejected} accent="destructive" />
        <Kpi label="Suspended" value={kpis.suspended} />
        <Kpi label="Qualification Rate" value={`${kpis.qualificationRate}%`} accent="laurel" />
        <Kpi label="Avg Review Time" value={`${kpis.avgReviewDays}d`} />
        <Kpi label="Missing Documents" value={kpis.missingDocs} accent="gold" />
        <Kpi label="Expiring (30d)" value={kpis.expiringSoon} accent="destructive" />
      </div>

      {/* Charts Grid */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Applications over time */}
        <ChartCard title="Applications Over Time" subtitle="Submission cadence">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={apps} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={chartTick} stroke="var(--color-border)" />
              <YAxis tick={chartTick} stroke="var(--color-border)" allowDecimals={false} />
              <Tooltip {...tooltipProps} />
              <Line
                type="monotone"
                dataKey="count"
                stroke="var(--color-terracotta)"
                strokeWidth={2}
                dot={{ r: 2.5, fill: "var(--color-terracotta)" }}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Qualification rate */}
        <ChartCard title="Qualification Rate Trend" subtitle="14-day rolling, target 70%">
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={qualRate} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={chartTick} stroke="var(--color-border)" />
              <YAxis tick={chartTick} stroke="var(--color-border)" domain={[0, 100]} />
              <Tooltip {...tooltipProps} formatter={(v) => `${v}%`} />
              <ReferenceLine y={70} stroke="var(--color-gold)" strokeDasharray="3 3" />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="var(--color-laurel)"
                strokeWidth={2}
                dot={{ r: 2.5, fill: "var(--color-laurel)" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Status distribution donut */}
        <ChartCard title="Application Status Distribution" subtitle="Live + historical">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={status}
                dataKey="value"
                nameKey="label"
                cx="40%"
                cy="50%"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={2}
                strokeWidth={1}
                stroke="var(--color-card)"
              >
                {status.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip {...tooltipProps} />
            </PieChart>
          </ResponsiveContainer>
          <ul className="-mt-6 grid grid-cols-2 gap-1.5 px-2 text-xs">
            {status.map((s, i) => (
              <li key={s.status} className="flex items-center gap-2 italic text-muted-foreground">
                <span
                  className="inline-block h-2 w-2"
                  style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                />
                <span className="flex-1">{s.label}</span>
                <span className="font-display tracking-wider">{s.value}</span>
              </li>
            ))}
          </ul>
        </ChartCard>

        {/* Rejection reasons */}
        <ChartCard title="Rejection Reasons" subtitle="Last 12 months">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart layout="vertical" data={reasons} margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--color-border)" horizontal={false} />
              <XAxis type="number" tick={chartTick} stroke="var(--color-border)" allowDecimals={false} />
              <YAxis type="category" dataKey="reason" tick={{ ...chartTick, width: 140 }} stroke="var(--color-border)" width={150} />
              <Tooltip {...tooltipProps} />
              <Bar dataKey="count" fill="var(--color-terracotta)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Teachers by subject */}
        <ChartCard title="Teachers by Subject" subtitle="All applications">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={subjects} margin={{ top: 8, right: 16, left: -8, bottom: 40 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--color-border)" />
              <XAxis dataKey="subject" tick={chartTick} angle={-30} textAnchor="end" stroke="var(--color-border)" interval={0} height={60} />
              <YAxis tick={chartTick} stroke="var(--color-border)" allowDecimals={false} />
              <Tooltip {...tooltipProps} />
              <Bar dataKey="count" fill="var(--color-gold)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Grade band stacked */}
        <ChartCard title="Teachers by Grade Band" subtitle="Qualified vs pending">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={grades} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--color-border)" />
              <XAxis dataKey="grade" tick={chartTick} stroke="var(--color-border)" />
              <YAxis tick={chartTick} stroke="var(--color-border)" allowDecimals={false} />
              <Tooltip {...tooltipProps} />
              <Bar dataKey="qualified" stackId="a" fill="var(--color-laurel)" />
              <Bar dataKey="pending" stackId="a" fill="var(--color-stone)" />
            </BarChart>
          </ResponsiveContainer>
          <div className="-mt-4 flex justify-center gap-4 text-xs italic text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-laurel" /> Qualified</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-stone" /> Pending</span>
          </div>
        </ChartCard>

        {/* Avg review time area */}
        <ChartCard title="Average Review Time" subtitle="Days from submission to decision">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={reviewTime} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="timeFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-terracotta)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--color-terracotta)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={chartTick} stroke="var(--color-border)" />
              <YAxis tick={chartTick} stroke="var(--color-border)" />
              <Tooltip {...tooltipProps} formatter={(v) => `${v} days`} />
              <Area type="monotone" dataKey="days" stroke="var(--color-terracotta)" strokeWidth={2} fill="url(#timeFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Reviewer activity */}
        <ChartCard title="Reviewer Activity" subtitle="Decisions per reviewer">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={reviewers} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--color-border)" />
              <XAxis dataKey="reviewer" tick={chartTick} stroke="var(--color-border)" />
              <YAxis tick={chartTick} stroke="var(--color-border)" allowDecimals={false} />
              <Tooltip {...tooltipProps} />
              <Bar dataKey="approvals" stackId="b" fill="var(--color-laurel)" />
              <Bar dataKey="info" stackId="b" fill="var(--color-gold)" />
              <Bar dataKey="rejections" stackId="b" fill="var(--color-terracotta)" />
            </BarChart>
          </ResponsiveContainer>
          <div className="-mt-4 flex flex-wrap justify-center gap-4 text-xs italic text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-laurel" /> Approve</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-gold" /> Info</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 bg-terracotta" /> Reject</span>
          </div>
        </ChartCard>

        {/* Document health */}
        <ChartCard title="Document Health" subtitle="All uploaded documents">
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={docHealth}
                dataKey="value"
                nameKey="name"
                cx="40%"
                cy="50%"
                innerRadius={50}
                outerRadius={85}
                paddingAngle={2}
                strokeWidth={1}
                stroke="var(--color-card)"
              >
                {docHealth.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip {...tooltipProps} />
            </PieChart>
          </ResponsiveContainer>
          <ul className="-mt-6 grid grid-cols-2 gap-1.5 px-2 text-xs">
            {docHealth.map((s, i) => (
              <li key={s.name} className="flex items-center gap-2 italic text-muted-foreground">
                <span
                  className="inline-block h-2 w-2"
                  style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                />
                <span className="flex-1">{s.name}</span>
                <span className="font-display tracking-wider">{s.value}</span>
              </li>
            ))}
          </ul>
        </ChartCard>

        {/* Funnel */}
        <ChartCard title="Verification Funnel" subtitle="Stage-by-stage attrition">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart layout="vertical" data={funnel} margin={{ top: 8, right: 24, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="2 4" stroke="var(--color-border)" horizontal={false} />
              <XAxis type="number" tick={chartTick} stroke="var(--color-border)" allowDecimals={false} />
              <YAxis type="category" dataKey="stage" tick={chartTick} stroke="var(--color-border)" width={100} />
              <Tooltip {...tooltipProps} />
              <Bar dataKey="count" fill="var(--color-ink)" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </AdminShell>
  );
}

const chartTick = {
  fill: "var(--color-muted-foreground)",
  fontSize: 11,
  fontFamily: "var(--font-body)",
};

const tooltipProps = {
  contentStyle: {
    background: "var(--color-card)",
    border: "1px solid var(--color-border)",
    borderRadius: "0px",
    fontFamily: "var(--font-body)",
    fontSize: "12px",
    color: "var(--color-foreground)",
  },
  cursor: { fill: "color-mix(in oklab, var(--color-gold) 12%, transparent)" },
};

function Kpi({
  label, value, accent,
}: {
  label: string;
  value: string | number;
  accent?: "gold" | "terracotta" | "laurel" | "destructive";
}) {
  const accentCls = {
    gold: "text-gold",
    terracotta: "text-terracotta",
    laurel: "text-laurel",
    destructive: "text-destructive",
  }[accent ?? "gold"];
  return (
    <div className="border border-border bg-card p-5">
      <p className="font-display text-[0.55rem] tracking-[0.18em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className={`mt-2 font-display text-3xl font-bold tracking-tight ${accent ? accentCls : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="border border-border bg-card p-5">
      <div className="mb-4 flex items-baseline justify-between">
        <h3 className="font-display text-sm font-semibold tracking-[0.1em] uppercase">{title}</h3>
        {subtitle && <p className="text-xs italic text-muted-foreground">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

// --- Live data hydration -------------------------------------------------

async function fetchLiveTeachers(): Promise<TeacherApplication[]> {
  const { data: profiles, error } = await supabase
    .from("educator_profiles")
    .select("id, display_name, bio, philosophy, subjects, grade_levels, hourly_rate_kes, is_verified, avatar_url, created_at, updated_at, rating_avg, rating_count");
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
    const otherDocs = myDocs.filter((d) => d.doc_type === "other");

    const docList = [
      idDoc && {
        id: idDoc.id,
        type: "government_id" as const,
        status: idDoc.status as "pending" | "approved" | "rejected",
        uploaded_at: idDoc.created_at,
        review_notes: idDoc.reviewer_notes ?? undefined,
        filename: idDoc.file_path.split("/").pop() ?? "id.pdf",
      },
      credDoc && {
        id: credDoc.id,
        type: "credential" as const,
        status: credDoc.status as "pending" | "approved" | "rejected",
        uploaded_at: credDoc.created_at,
        review_notes: credDoc.reviewer_notes ?? undefined,
        filename: credDoc.file_path.split("/").pop() ?? "credential.pdf",
      },
      ...otherDocs.map((d) => ({
        id: d.id,
        type: "other" as const,
        status: d.status as "pending" | "approved" | "rejected",
        uploaded_at: d.created_at,
        review_notes: d.reviewer_notes ?? undefined,
        filename: d.file_path.split("/").pop() ?? "document.pdf",
      })),
    ].filter(Boolean) as TeacherApplication["documents"];

    const status: TeacherApplication["status"] = p.is_verified
      ? "qualified"
      : myDocs.length === 0
        ? "submitted"
        : myDocs.some((d) => d.status === "rejected")
          ? "needs_more_info"
          : myDocs.every((d) => d.status === "approved")
            ? "under_review"
            : "under_review";

    const idApproved = idDoc?.status === "approved";
    const credApproved = credDoc?.status === "approved";

    let score = 0;
    if (idApproved) score += 25;
    if (credApproved) score += 20;
    if (p.is_verified) score += 25; // good_conduct verified manually
    score += 10; // experience assumed
    if ((p.subjects?.length ?? 0) > 0) score += 10;
    score += 5; // reviewer confidence

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
      documents: docList,
      timeline: [
        {
          id: `${p.id}-sub`,
          at: p.created_at,
          actor: nameMap.get(p.id) ?? p.display_name,
          kind: "submitted" as const,
          detail: "Profile created.",
        },
        ...myDocs.map((d) => ({
          id: `${d.id}-up`,
          at: d.created_at,
          actor: nameMap.get(p.id) ?? p.display_name,
          kind: "doc_uploaded" as const,
          detail: `Uploaded ${d.doc_type}.`,
        })),
      ].sort((a, b) => +new Date(b.at) - +new Date(a.at)),
      reviewer_confidence: 3,
    };
  });
}
