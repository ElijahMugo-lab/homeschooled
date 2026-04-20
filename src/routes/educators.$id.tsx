import { createFileRoute, Link, useRouter, notFound } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

export const Route = createFileRoute("/educators/$id")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("educator_profiles")
      .select("id, display_name, philosophy, subjects, grade_levels, bio, hourly_rate_kes, rating_avg, rating_count, is_verified")
      .eq("id", params.id)
      .eq("is_verified", true)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.display_name} — Vetted Educator · EduBridge` },
          { name: "description", content: loaderData.bio?.slice(0, 155) ?? `Meet ${loaderData.display_name}, a vetted homeschool educator.` },
          { property: "og:title", content: `${loaderData.display_name} — Vetted Educator` },
          { property: "og:description", content: loaderData.bio?.slice(0, 155) ?? "" },
        ]
      : [],
  }),
  errorComponent: ({ error }) => (
    <PageShell>
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="font-display text-3xl">Something went wrong</h1>
        <p className="mt-3 italic text-muted-foreground">{error.message}</p>
        <Link to="/agora" className="mt-6 inline-block text-terracotta underline-offset-4 hover:underline">← Back to the Agora</Link>
      </div>
    </PageShell>
  ),
  notFoundComponent: () => (
    <PageShell>
      <div className="mx-auto max-w-2xl px-6 py-24 text-center">
        <h1 className="font-display text-3xl">Educator not found</h1>
        <p className="mt-3 italic text-muted-foreground">This educator may not yet be vetted, or the link is incorrect.</p>
        <Link to="/agora" className="mt-6 inline-block text-terracotta underline-offset-4 hover:underline">← Browse the Agora</Link>
      </div>
    </PageShell>
  ),
  component: EducatorDetailPage,
});

function EducatorDetailPage() {
  const e = Route.useLoaderData();
  const { user } = useAuth();
  const router = useRouter();

  const initials = e.display_name.split(" ").map((n) => n[0]).slice(0, 2).join("");
  const stars = Math.round(e.rating_avg);

  const handleMessage = () => {
    if (!user) {
      toast("Sign in to begin a conversation", { description: `You'll be able to message ${e.display_name} after signup.` });
      router.navigate({ to: "/sign-up" });
      return;
    }
    router.navigate({ to: "/messages", search: { educator: e.id } });
  };

  return (
    <PageShell>
      <div className="mx-auto max-w-4xl px-6 py-12 md:px-10 md:py-16">
        <Link to="/agora" className="mb-8 inline-block font-display text-[0.62rem] tracking-[0.16em] text-muted-foreground uppercase hover:text-terracotta">
          ← The Agora
        </Link>

        {/* HERO */}
        <header className="border-b border-border pb-10">
          <div className="flex flex-col items-start gap-6 md:flex-row">
            <div className="relative flex h-24 w-24 flex-shrink-0 items-center justify-center border border-border bg-parchment font-display text-3xl font-semibold text-ink">
              {initials}
              <span
                title="Verified — Laurel Wreath"
                className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-laurel text-xs text-white ring-2 ring-card"
              >
                ✓
              </span>
            </div>
            <div className="flex-1">
              <p className="ornament-row w-48 mb-3">Vetted Educator</p>
              <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">{e.display_name}</h1>
              {e.philosophy && (
                <span className="mt-4 inline-block border border-gold px-3 py-1 font-display text-[0.62rem] tracking-[0.16em] text-gold uppercase">
                  {e.philosophy}
                </span>
              )}
              <div className="mt-4 flex items-center gap-3">
                <span className="text-base tracking-widest text-terracotta">
                  {"★".repeat(stars)}
                  <span className="text-border">{"★".repeat(5 - stars)}</span>
                </span>
                <span className="text-sm text-muted-foreground">
                  {e.rating_avg.toFixed(1)} ({e.rating_count} {e.rating_count === 1 ? "review" : "reviews"})
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* BODY */}
        <div className="grid gap-10 py-10 md:grid-cols-3">
          <div className="md:col-span-2 space-y-8">
            <section>
              <h2 className="font-display text-[0.62rem] tracking-[0.16em] text-muted-foreground uppercase">About</h2>
              <p className="mt-3 whitespace-pre-line font-body text-lg leading-relaxed text-ink">
                {e.bio ?? <span className="italic text-muted-foreground">This educator has not yet written a bio.</span>}
              </p>
            </section>

            <section>
              <h2 className="font-display text-[0.62rem] tracking-[0.16em] text-muted-foreground uppercase">Subjects taught</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {e.subjects.length === 0 ? (
                  <span className="italic text-muted-foreground">Not specified</span>
                ) : (
                  e.subjects.map((s) => (
                    <span key={s} className="border border-border bg-parchment px-3 py-1 text-sm text-ink">{s}</span>
                  ))
                )}
              </div>
            </section>

            <section>
              <h2 className="font-display text-[0.62rem] tracking-[0.16em] text-muted-foreground uppercase">Grade levels</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {e.grade_levels.length === 0 ? (
                  <span className="italic text-muted-foreground">Not specified</span>
                ) : (
                  e.grade_levels.map((g) => (
                    <span key={g} className="border border-border bg-parchment px-3 py-1 text-sm text-ink">{g}</span>
                  ))
                )}
              </div>
            </section>
          </div>

          {/* SIDEBAR — RATE + CTA */}
          <aside className="md:col-span-1">
            <div className="sticky top-6 border border-border bg-card p-6 shadow-[0_2px_24px_rgba(101,85,60,0.08)]">
              <p className="font-display text-[0.62rem] tracking-[0.16em] text-muted-foreground uppercase">Hourly Rate</p>
              <p className="mt-2 font-display text-3xl font-semibold text-ink">
                KSh {e.hourly_rate_kes?.toLocaleString() ?? "—"}
                <span className="ml-1 font-body text-sm font-normal text-muted-foreground">/ hr</span>
              </p>

              <button
                onClick={handleMessage}
                className="mt-6 w-full bg-primary px-4 py-3 font-display text-[0.62rem] tracking-[0.16em] text-primary-foreground uppercase transition-colors hover:bg-terracotta-deep"
              >
                Message {e.display_name.split(" ")[0]}
              </button>

              <p className="mt-4 flex items-center gap-2 text-xs italic text-muted-foreground">
                <span className="text-base text-laurel">🌿</span>
                Laurel Wreath verified — ID & credentials reviewed.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </PageShell>
  );
}
