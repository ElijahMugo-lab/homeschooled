import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";
import heroImg from "@/assets/hero-homeschool.jpg";
import principleVerified from "@/assets/principle-verified.jpg";
import principleChoose from "@/assets/principle-choose.jpg";
import principleRatings from "@/assets/principle-ratings.jpg";

const TITLE = "Homeschooled — Find vetted homeschool tutors in Kenya";
const DESC =
  "Find safe, qualified homeschool tutors in Kenya. Every teacher is ID-checked and police-cleared before they appear on the site.";
const URL = "https://homeschooled.lovable.app/";

export const Route = createFileRoute("/")({
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
          <p className="ornament-row mb-6">Helping families teach at home.</p>
          <h1 className="font-display text-5xl font-black leading-[1.05] tracking-tight md:text-7xl">
            Find <em className="not-italic text-terracotta">trusted</em> homeschool tutors
          </h1>
          <p className="mt-6 font-display text-lg italic text-gold md:text-xl">
            Safe teachers. Real credentials. No noise.
          </p>
          <p className="mx-auto mt-8 max-w-xl text-lg text-muted-foreground">
            Homeschooled is a simple way for parents in Kenya to meet homeschool tutors.
            Every teacher passes an ID check and a police clearance before they appear here.
          </p>

          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <Link
              to="/agora"
              className="bg-primary px-9 py-4 font-display text-[0.72rem] tracking-[0.18em] text-primary-foreground uppercase shadow-[0_6px_24px_rgba(196,90,67,0.3)] transition-transform hover:-translate-y-0.5"
            >
              Find a Tutor
            </Link>
            <Link
              to="/sign-up"
              className="border border-border bg-transparent px-9 py-4 font-display text-[0.72rem] tracking-[0.18em] text-muted-foreground uppercase transition-colors hover:border-terracotta hover:text-terracotta"
            >
              Join as a Tutor
            </Link>
          </div>

          <div className="mt-16 grid grid-cols-3 gap-4 border-t border-border pt-10">
            {[
              { num: "100%", lbl: "ID-checked tutors" },
              { num: "1:1", lbl: "Direct messaging" },
              { num: "5★", lbl: "Two-way ratings" },
            ].map((b) => (
              <div key={b.lbl} className="text-center">
                <div className="font-display text-3xl font-bold text-terracotta md:text-4xl">{b.num}</div>
                <div className="mt-1 text-xs text-muted-foreground">{b.lbl}</div>
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
            <p className="ornament-row mx-auto w-72 mb-4">How we keep it safe</p>
            <h2 className="font-display text-4xl font-bold">Built on three simple rules</h2>
          </div>
          <div className="grid gap-px bg-border md:grid-cols-3">
            {[
              {
                num: "I",
                title: "Every tutor is checked",
                body: "Tutors must submit a national ID and a Certificate of Good Conduct before they can be seen on the site.",
              },
              {
                num: "II",
                title: "You search, you choose",
                body: "Browse tutors by subject, grade level, and teaching style. No ads. No algorithm. Just your search.",
              },
              {
                num: "III",
                title: "Ratings go both ways",
                body: "Parents and tutors rate each other after working together, so everyone is held to the same standard.",
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
            Ready to get started?
          </h2>
          <p className="mt-4 text-muted-foreground">
            Whether you’re looking for a tutor for your child or want to teach other families, you’re welcome here.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              to="/sign-up"
              className="bg-primary px-9 py-4 font-display text-[0.72rem] tracking-[0.18em] text-primary-foreground uppercase transition-transform hover:-translate-y-0.5"
            >
              Create an account
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
