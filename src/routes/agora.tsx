import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

interface Educator {
  id: string;
  display_name: string;
  philosophy: string | null;
  subjects: string[];
  grade_levels: string[];
  bio: string | null;
  hourly_rate_kes: number | null;
  rating_avg: number;
  rating_count: number;
  avatar_url: string | null;
}

const SUBJECT_OPTIONS = ["All", "Mathematics", "Reading", "Latin", "Greek", "Literature", "Science", "Music", "Art", "French", "Coding", "Logic", "Composition"];
const PHILOSOPHY_OPTIONS = ["All", "Classical", "Montessori", "Charlotte Mason", "Eclectic"];
const GRADE_OPTIONS = ["All", "Early Years", "Primary", "Upper Primary", "Lower Secondary", "Upper Secondary"];

const TITLE = "Find a Homeschool Tutor — Verified teachers · Homeschooled";
const DESC = "Browse verified homeschool tutors in Kenya. Filter by subject, teaching style, and grade level.";
const URL = "https://homeschooled.lovable.app/agora";

export const Route = createFileRoute("/agora")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: URL },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
    ],
    links: [{ rel: "canonical", href: URL }],
  }),
  component: AgoraPage,
});

function AgoraPage() {
  const [educators, setEducators] = useState<Educator[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState("All");
  const [philosophy, setPhilosophy] = useState("All");
  const [grade, setGrade] = useState("All");
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from("educator_profiles")
        .select("id, display_name, philosophy, subjects, grade_levels, bio, hourly_rate_kes, rating_avg, rating_count, avatar_url")
        .eq("is_verified", true)
        .order("rating_avg", { ascending: false });

      if (error) {
        toast.error("Could not load tutors");
      } else {
        setEducators(data ?? []);
      }
      setLoading(false);
    };

    void load();

    const channel = supabase
      .channel("agora-educators")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "educator_profiles" },
        (payload) => {
          const isVerified = (row: Record<string, unknown> | null) =>
            !!row && (row as { is_verified?: boolean }).is_verified === true;

          if (payload.eventType === "DELETE") {
            const oldId = (payload.old as { id?: string })?.id;
            if (oldId) setEducators((prev) => prev.filter((e) => e.id !== oldId));
            return;
          }

          const next = payload.new as Educator & { is_verified: boolean };
          if (!isVerified(payload.new as Record<string, unknown>)) {
            setEducators((prev) => prev.filter((e) => e.id !== next.id));
            return;
          }

          setEducators((prev) => {
            const exists = prev.some((e) => e.id === next.id);
            const merged = exists
              ? prev.map((e) => (e.id === next.id ? { ...e, ...next } : e))
              : [...prev, next];
            return [...merged].sort((a, b) => b.rating_avg - a.rating_avg);
          });

          if (payload.eventType === "INSERT" || (payload.eventType === "UPDATE" && !((payload.old as { is_verified?: boolean })?.is_verified))) {
            toast(`${next.display_name} just joined Homeschooled`);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  const filtered = educators.filter((e) => {
    if (subject !== "All" && !e.subjects.some((s) => s.toLowerCase() === subject.toLowerCase())) return false;
    if (philosophy !== "All" && e.philosophy !== philosophy) return false;
    if (grade !== "All" && !e.grade_levels.some((g) => g === grade)) return false;
    return true;
  });

  const handleMessage = (educatorId: string, name: string) => {
    if (!user) {
      toast("Sign in to send a message", { description: `You can message ${name} once you sign up.` });
      router.navigate({ to: "/sign-up" });
      return;
    }
    router.navigate({ to: "/messages", search: { educator: educatorId } });
  };

  return (
    <PageShell>
      <section className="border-b border-border px-6 py-16 md:px-10">
        <div className="mx-auto max-w-6xl">
          <p className="ornament-row mx-auto w-64 mb-6">Find a Tutor</p>
          <h1 className="text-center font-display text-5xl font-bold tracking-tight md:text-6xl">
            Browse verified tutors
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-center text-muted-foreground">
            Every tutor below has been ID-checked and has a clean Certificate of Good Conduct.
          </p>

          {/* VERIFIED LEGEND */}
          <div className="mx-auto mt-10 flex max-w-xl items-center gap-3 border-l-4 border-laurel bg-laurel/10 px-5 py-3 text-sm text-muted-foreground">
            <span className="text-lg">✓</span>
            <span>The <strong className="text-laurel">green check</strong> means the tutor’s documents have been reviewed and approved.</span>
          </div>

          {/* FILTERS */}
          <div className="mt-10 grid grid-cols-1 gap-4 border border-border bg-card p-6 shadow-[0_2px_24px_rgba(101,85,60,0.08)] md:grid-cols-3">
            <FilterField label="Subject" value={subject} onChange={setSubject} options={SUBJECT_OPTIONS} />
            <FilterField label="Teaching Style" value={philosophy} onChange={setPhilosophy} options={PHILOSOPHY_OPTIONS} />
            <FilterField label="Grade Level" value={grade} onChange={setGrade} options={GRADE_OPTIONS} />
          </div>
        </div>
      </section>

      {/* GRID */}
      <section className="px-6 py-16 md:px-10">
        <div className="mx-auto max-w-6xl">
          {loading ? (
            <p className="text-center text-muted-foreground">Loading tutors…</p>
          ) : filtered.length === 0 ? (
            <div className="border border-border bg-card p-16 text-center">
              <p className="font-display text-xl">No tutors match your filters.</p>
              <p className="mt-2 text-muted-foreground">Try widening your search.</p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((e) => (
                <EducatorCard key={e.id} educator={e} onMessage={() => handleMessage(e.id, e.display_name)} />
              ))}
            </div>
          )}
          <p className="mt-10 text-center text-sm text-muted-foreground">
            Are you a tutor? <Link to="/sign-up" className="text-terracotta underline-offset-4 hover:underline">Join Homeschooled</Link>.
          </p>
        </div>
      </section>
    </PageShell>
  );
}

function FilterField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label className="mb-2 block font-display text-[0.62rem] tracking-[0.16em] text-muted-foreground uppercase">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none border border-border bg-background px-4 py-3 font-body text-base text-foreground transition-colors focus:border-terracotta focus:outline-none"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}

function EducatorCard({ educator: e, onMessage }: { educator: Educator; onMessage: () => void }) {
  const initials = e.display_name.split(" ").map((n) => n[0]).slice(0, 2).join("");
  const stars = Math.round(e.rating_avg);

  return (
    <article className="group relative overflow-hidden border border-border bg-card p-7 transition-all hover:-translate-y-1 hover:shadow-[0_8px_48px_rgba(101,85,60,0.14)]">
      <div className="mb-4 flex items-start gap-4">
        <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden border border-border bg-parchment">
          {e.avatar_url ? (
            <img src={e.avatar_url} alt={e.display_name} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-display text-lg font-semibold text-ink">
              {initials}
            </div>
          )}
          <span
            title="Verified"
            className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-laurel text-[0.55rem] text-white ring-2 ring-card"
          >
            ✓
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <Link to="/educators/$id" params={{ id: e.id }} className="font-display text-base font-semibold leading-tight hover:text-terracotta">
            {e.display_name}
          </Link>
          <p className="mt-1 text-xs italic text-muted-foreground">Vetted Educator</p>
        </div>
      </div>

      {e.philosophy && (
        <span className="mb-3 inline-block border border-gold px-2.5 py-0.5 font-display text-[0.58rem] tracking-[0.14em] text-gold uppercase">
          {e.philosophy}
        </span>
      )}

      <div className="mb-3 flex flex-wrap gap-1.5">
        {e.subjects.slice(0, 3).map((s) => (
          <span key={s} className="border border-border bg-parchment px-2 py-0.5 text-xs text-muted-foreground">
            {s}
          </span>
        ))}
      </div>

      <div className="mb-3 flex items-center gap-2">
        <span className="text-sm tracking-widest text-terracotta">
          {"★".repeat(stars)}
          <span className="text-border">{"★".repeat(5 - stars)}</span>
        </span>
        <span className="text-xs text-muted-foreground">
          {e.rating_avg.toFixed(1)} ({e.rating_count})
        </span>
      </div>

      {e.bio && (
        <p className="mb-5 line-clamp-2 text-[0.9rem] italic text-muted-foreground">{e.bio}</p>
      )}

      <div className="flex items-center justify-between border-t border-border pt-4">
        <span className="font-display text-base font-semibold">
          KSh {e.hourly_rate_kes?.toLocaleString() ?? "—"}
          <span className="ml-1 font-body text-xs text-muted-foreground">/ hr</span>
        </span>
        <button
          onClick={onMessage}
          className="bg-primary px-4 py-2 font-display text-[0.58rem] tracking-[0.14em] text-primary-foreground uppercase transition-colors hover:bg-terracotta-deep"
        >
          Message
        </button>
      </div>
    </article>
  );
}
