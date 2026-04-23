import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Homeschooled — A vetted marketplace for homeschooling families" },
      {
        name: "description",
        content:
          "Find vetted, credentialed homeschooling educators in Nairobi. Search by subject, philosophy, and grade level.",
      },
      { property: "og:title", content: "Homeschooled — Where homeschooling families meet vetted educators" },
      {
        property: "og:description",
        content: "A quiet, classical marketplace built on trust. Find a tutor or apply as one.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <PageShell>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border px-6 pt-24 pb-32 md:px-10">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 50% 60%, oklch(0.65 0.14 35 / 0.07), transparent 70%), radial-gradient(ellipse 40% 40% at 18% 18%, oklch(0.55 0.09 80 / 0.06), transparent 60%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <p className="ornament-row mb-6">Training Up Life-Long Learners. </p>
          <h1 className="font-display text-5xl font-black leading-[1.05] tracking-tight md:text-7xl">
            Where families find <em className="not-italic text-terracotta">vetted</em> educators
          </h1>
          <p className="mt-6 font-display text-lg italic text-gold md:text-xl">
            Sapere aude — dare to teach, dare to learn.
          </p>
          <p className="mx-auto mt-8 max-w-xl text-lg italic text-muted-foreground">
            Homeschooled is a quiet, high-trust marketplace for the homeschooling family. No noise.
            No infinite feed. Only credentials, philosophy, and the slow work of education.
          </p>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/agora"
              className="bg-primary px-9 py-4 font-display text-[0.72rem] tracking-[0.18em] text-primary-foreground uppercase shadow-[0_6px_24px_rgba(196,90,67,0.3)] transition-transform hover:-translate-y-0.5"
            >
              Enter the Agora
            </Link>
            <Link
              to="/sign-up"
              className="border border-border bg-transparent px-9 py-4 font-display text-[0.72rem] tracking-[0.18em] text-muted-foreground uppercase transition-colors hover:border-terracotta hover:text-terracotta"
            >
              Apply as Educator
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-3 gap-4 border-t border-border pt-10">
            {[
              { num: "100%", lbl: "Credential-vetted" },
              { num: "1:1", lbl: "Async messaging" },
              { num: "5★", lbl: "Two-way ratings" },
            ].map((b) => (
              <div key={b.lbl} className="text-center">
                <div className="font-display text-3xl font-bold text-terracotta md:text-4xl">{b.num}</div>
                <div className="mt-1 text-xs italic text-muted-foreground">{b.lbl}</div>
              </div>
            ))}
          </div>
        </div>

        <div aria-hidden className="absolute bottom-0 left-0 right-0 h-1 greek-key opacity-50" />
      </section>

      {/* PRINCIPLES */}
      <section className="bg-parchment px-6 py-24 md:px-10">
        <div className="mx-auto max-w-5xl">
          <div className="mb-16 text-center">
            <p className="ornament-row mx-auto w-72 mb-4">Our Principles</p>
            <h2 className="font-display text-4xl font-bold">Built on three pillars</h2>
          </div>
          <div className="grid gap-px bg-border md:grid-cols-3">
            {[
              {
                num: "I",
                title: "Vetting Gateway",
                body: "Every educator submits ID and a Certificate of Good Conduct. The Laurel Wreath is earned, not given.",
              },
              {
                num: "II",
                title: "The Agora",
                body: "A searchable directory by subject, grade, and teaching philosophy. No algorithms — only your search.",
              },
              {
                num: "III",
                title: "Mutual Honor",
                body: "Double-blind two-way ratings keep both parents and educators accountable to high standards.",
              },
            ].map((p) => (
              <div key={p.num} className="relative bg-card p-10">
                <span className="absolute right-6 top-4 font-display text-7xl font-black text-border">
                  {p.num}
                </span>
                <h3 className="font-display text-lg font-semibold tracking-wide">{p.title}</h3>
                <p className="mt-4 text-[0.95rem] leading-relaxed text-muted-foreground">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA STRIP */}
      <section className="px-6 py-24 md:px-10">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="font-display text-3xl font-bold md:text-4xl">
            Begin the conversation
          </h2>
          <p className="mt-4 italic text-muted-foreground">
            Whether you seek a guide for your child or wish to teach others' children — your place is here.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              to="/sign-up"
              className="bg-primary px-9 py-4 font-display text-[0.72rem] tracking-[0.18em] text-primary-foreground uppercase transition-transform hover:-translate-y-0.5"
            >
              Create Your Profile
            </Link>
            <Link
              to="/how-it-works"
              className="border border-border px-9 py-4 font-display text-[0.72rem] tracking-[0.18em] text-muted-foreground uppercase transition-colors hover:border-terracotta hover:text-terracotta"
            >
              How it Works
            </Link>
          </div>
        </div>
      </section>
    </PageShell>
  );
}
