import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";

export const Route = createFileRoute("/how-it-works")({
  head: () => ({
    meta: [
      { title: "How EduBridge Works — Vetting, Search, Messaging" },
      { name: "description", content: "How EduBridge connects homeschooling parents with vetted educators: a four-step path from signup to a successful match." },
      { property: "og:title", content: "How EduBridge Works" },
      { property: "og:description", content: "A four-step path from signup to a successful homeschool match." },
    ],
  }),
  component: HowPage,
});

const PARENT_STEPS = [
  { n: "I", title: "Create your family profile", body: "Tell us your child's age, learning needs, and the philosophy you wish to follow — Classical, Montessori, Charlotte Mason, or your own." },
  { n: "II", title: "Search the Agora", body: "Filter educators by subject, grade level, and teaching philosophy. Every educator carries the Laurel Wreath — proof of vetting." },
  { n: "III", title: "Begin a conversation", body: "Message educators directly through the quiet, distraction-free Bridge. Coordinate schedules and syllabi without algorithms in the way." },
  { n: "IV", title: "Honor with a rating", body: "After seven days, both you and the educator rate one another. Double-blind, mutually accountable, and built for the long term." },
];

const EDUCATOR_STEPS = [
  { n: "I", title: "Submit your credentials", body: "Upload a national ID and a Certificate of Good Conduct. Your profile remains hidden until verified." },
  { n: "II", title: "Earn the Laurel Wreath", body: "Once vetted by our team, your profile is published to the Agora — bearing the green laurel that signals trust." },
  { n: "III", title: "Receive serious inquiries", body: "Parents who write to you have already chosen you for your subjects and philosophy. No spam. No drive-bys." },
  { n: "IV", title: "Build your reputation", body: "Each completed match contributes to your rating — the only currency in the EduBridge marketplace." },
];

function HowPage() {
  return (
    <PageShell>
    <section className="border-b border-border px-6 py-20 md:px-10">
      <div className="mx-auto max-w-3xl text-center">
        <p className="ornament-row mx-auto w-64 mb-6">The Method</p>
        <h1 className="font-display text-5xl font-bold tracking-tight md:text-6xl">
          A path, not a feed
        </h1>
        <p className="mt-6 text-lg italic text-muted-foreground">
          EduBridge is built on the conviction that good education begins with trust, not with virality.
          Here is how the bridge is crossed — by both sides.
        </p>
      </div>
    </section>

    <section className="px-6 py-20 md:px-10">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-12 text-center font-display text-3xl font-bold">For Parents</h2>
        <div className="grid gap-px bg-border md:grid-cols-2 lg:grid-cols-4">
          {PARENT_STEPS.map((s) => (
            <Step key={s.n} {...s} />
          ))}
        </div>
      </div>
    </section>

    <section className="bg-parchment px-6 py-20 md:px-10">
      <div className="mx-auto max-w-6xl">
        <h2 className="mb-12 text-center font-display text-3xl font-bold">For Educators</h2>
        <div className="grid gap-px bg-border md:grid-cols-2 lg:grid-cols-4">
          {EDUCATOR_STEPS.map((s) => (
            <Step key={s.n} {...s} />
          ))}
        </div>
      </div>
    </section>

    <section className="px-6 py-20 md:px-10">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-3xl font-bold">Ready to begin?</h2>
        <p className="mt-4 italic text-muted-foreground">
          Whichever side of the bridge you stand on, your first step is the same.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            to="/sign-up"
            className="bg-primary px-9 py-4 font-display text-[0.72rem] tracking-[0.18em] text-primary-foreground uppercase transition-transform hover:-translate-y-0.5"
          >
            Create Profile
          </Link>
          <Link
            to="/agora"
            className="border border-border px-9 py-4 font-display text-[0.72rem] tracking-[0.18em] text-muted-foreground uppercase transition-colors hover:border-terracotta hover:text-terracotta"
          >
            Browse Educators
          </Link>
        </div>
      </div>
    </section>
    </PageShell>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="relative bg-card p-8">
      <span className="absolute right-5 top-3 font-display text-6xl font-black text-border">{n}</span>
      <h3 className="font-display text-base font-semibold tracking-wide">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
