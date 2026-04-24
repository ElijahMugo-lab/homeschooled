import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, XAxis, YAxis } from "recharts";
import { AdminShell } from "@/components/admin/admin-shell";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { supabase } from "@/integrations/supabase/client";

type DayBucket = { date: string; label: string; signups: number };

const chartConfig = {
  signups: { label: "Signups", color: "oklch(0.55 0.15 35)" },
} satisfies ChartConfig;

function buildLast7Days(): DayBucket[] {
  const days: DayBucket[] = [];
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const iso = d.toISOString().slice(0, 10);
    days.push({
      date: iso,
      label: d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" }),
      signups: 0,
    });
  }
  return days;
}

function ReportsPage() {
  const [data, setData] = useState<DayBucket[]>(() => buildLast7Days());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      const since = new Date();
      since.setDate(since.getDate() - 6);
      since.setHours(0, 0, 0, 0);

      const { data: rows, error: err } = await supabase
        .from("profiles")
        .select("created_at")
        .gte("created_at", since.toISOString());

      if (cancelled) return;
      if (err) {
        setError(err.message);
        setLoading(false);
        return;
      }
      const buckets = buildLast7Days();
      const byDate = new Map(buckets.map((b) => [b.date, b]));
      for (const row of rows ?? []) {
        const key = new Date(row.created_at).toISOString().slice(0, 10);
        const bucket = byDate.get(key);
        if (bucket) bucket.signups += 1;
      }
      setData(buckets);
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const total = useMemo(() => data.reduce((sum, d) => sum + d.signups, 0), [data]);

  return (
    <AdminShell eyebrow="Reporting Center" title="Reports">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="border border-border bg-card p-5">
            <p className="font-display text-[0.55rem] tracking-[0.2em] text-muted-foreground uppercase">
              Last 7 Days
            </p>
            <p className="mt-2 font-display text-3xl font-bold">{total}</p>
            <p className="mt-1 text-xs italic text-muted-foreground">Total new signups</p>
          </div>
          <div className="border border-border bg-card p-5">
            <p className="font-display text-[0.55rem] tracking-[0.2em] text-muted-foreground uppercase">
              Daily Average
            </p>
            <p className="mt-2 font-display text-3xl font-bold">
              {(total / 7).toFixed(1)}
            </p>
            <p className="mt-1 text-xs italic text-muted-foreground">Signups per day</p>
          </div>
          <div className="border border-border bg-card p-5">
            <p className="font-display text-[0.55rem] tracking-[0.2em] text-muted-foreground uppercase">
              Peak Day
            </p>
            <p className="mt-2 font-display text-3xl font-bold">
              {Math.max(0, ...data.map((d) => d.signups))}
            </p>
            <p className="mt-1 text-xs italic text-muted-foreground">
              {data.reduce((peak, d) => (d.signups > peak.signups ? d : peak), data[0]).label}
            </p>
          </div>
        </div>

        <div className="border border-border bg-card p-6">
          <div className="mb-6 flex items-end justify-between">
            <div>
              <p className="ornament-row mb-2 w-40 text-[0.55rem]">Signup Trends</p>
              <h2 className="font-display text-xl font-bold">User Signups · Last 7 Days</h2>
              <p className="mt-1 text-xs italic text-muted-foreground">
                Sourced live from the profiles ledger.
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex h-72 items-center justify-center">
              <p className="font-display text-[0.6rem] tracking-[0.18em] text-muted-foreground uppercase">
                Loading…
              </p>
            </div>
          ) : error ? (
            <div className="flex h-72 items-center justify-center border border-dashed border-destructive/40 bg-destructive/5 p-6 text-center">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : (
            <ChartContainer config={chartConfig} className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={11} width={32} />
                  <ChartTooltip cursor={{ fill: "oklch(0.95 0.01 80)" }} content={<ChartTooltipContent />} />
                  <Bar dataKey="signups" fill="var(--color-signups)" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          )}
        </div>
      </div>
    </AdminShell>
  );
}

export const Route = createFileRoute("/admin/reports")({
  head: () => ({ meta: [{ title: "Admin · Reports · Homeschooled" }] }),
  component: ReportsPage,
});
