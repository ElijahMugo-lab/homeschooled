import { createFileRoute, Link } from "@tanstack/react-router";
import { PageShell } from "@/components/page-shell";

const TITLE = "How Homeschooled Works — Find a tutor in 4 steps";
const DESC =
  "How Homeschooled works for parents and tutors: sign up, browse vetted tutors, message safely, and rate each other after working together.";
const URL = "https://homeschooled.lovable.app/how-it-works";

export const Route = createFileRoute("/how-it-works")({
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
  component: HowPage,
});

const PARENT_STEPS = [
  { n: "I", title: "Create your family profile", body: "Tell us your child’s age, what they need help with, and the teaching style you prefer." },
  { n: "II", title: "Browse tutors", body: "Filter by subject, grade level, and teaching style. Every tutor on the site has been ID-checked and police-cleared." },
  { n: "III", title: "Start a conversation", body: "Message tutors directly. Agree on a schedule and what to teach without ads or pop-ups in the way." },
  { n: "IV", title: "Rate each other", body: "After seven days, you and the tutor rate each other. Ratings are private until both sides have rated, so feedback stays honest." },
];

const EDUCATOR_STEPS = [
  { n: "I", title: "Submit your documents", body: "Upload your national ID and Certificate of Good Conduct. Your profile stays hidden until we approve them." },
  { n: "II", title: "Get verified", body: "Once our team approves your documents, your profile goes live and shows a green ‘verified’ check." },
  { n: "III", title: "Get serious enquiries", body: "Parents who message you have already chosen you for your subjects and style. No spam." },
  { n: "IV", title: "Build your reputation", body: "Every completed match adds to your rating — the main thing parents look at when picking a tutor." },
];

function HowPage() {
  return (
    <PageShell>
    <section className="border-b border-border px-6 py-20 md:px-10">
      <div className="mx-auto max-w-3xl text-center">
        <p className="ornament-row mx-auto w-64 mb-6">The process</p>
        <h1 className="font-display text-5xl font-bold tracking-tight md:text-6xl">
          Simple, safe, and clear
        </h1>
        <p className="mt-6 text-lg text-muted-foreground">
          Homeschooled is built on trust. Here’s how it works — for parents and for tutors.
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
        <h2 className="mb-12 text-center font-display text-3xl font-bold">For Tutors</h2>
        <div className="grid gap-px bg-border md:grid-cols-2 lg:grid-cols-4">
          {EDUCATOR_STEPS.map((s) => (
            <Step key={s.n} {...s} />
          ))}
        </div>
      </div>
    </section>

    <section className="px-6 py-20 md:px-10">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-3xl font-bold">Ready to start?</h2>
        <p className="mt-4 text-muted-foreground">
          Whether you’re looking for a tutor or want to be one, your first step is the same.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            to="/sign-up"
            className="bg-primary px-9 py-4 font-display text-[0.72rem] tracking-[0.18em] text-primary-foreground uppercase transition-transform hover:-translate-y-0.5"
          >
            Create account
          </Link>
          <Link
            to="/agora"
            className="border border-border px-9 py-4 font-display text-[0.72rem] tracking-[0.18em] text-muted-foreground uppercase transition-colors hover:border-terracotta hover:text-terracotta"
          >
            Browse Tutors
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
