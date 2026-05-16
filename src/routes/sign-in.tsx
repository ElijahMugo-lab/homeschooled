import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageShell } from "@/components/page-shell";
import { toast } from "sonner";

const schema = z.object({
  email: z.string().trim().email({ message: "A valid email is required" }).max(255),
  password: z.string().min(6, { message: "At least 6 characters" }).max(128),
});

export const Route = createFileRoute("/sign-in")({
  head: () => ({
    meta: [
      { title: "Sign In · Homeschooled" },
      { name: "description", content: "Sign in to your Homeschooled account." },
      { property: "og:title", content: "Sign In · Homeschooled" },
      { property: "og:description", content: "Sign in to your Homeschooled account." },
      { property: "og:url", content: "https://homeschooled.lovable.app/sign-in" },
      { name: "robots", content: "noindex,follow" },
    ],
    links: [{ rel: "canonical", href: "https://homeschooled.lovable.app/sign-in" }],
  }),
  component: SignInPage,
});

function SignInPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && user) router.navigate({ to: "/dashboard" });
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Welcome back");
    router.navigate({ to: "/dashboard" });
  };

  return (
    <PageShell>
      <section className="flex min-h-[calc(100vh-256px)] items-center justify-center px-6 py-20">
        <div className="w-full max-w-md border border-border bg-card p-10 shadow-[0_2px_24px_rgba(101,85,60,0.08)]">
          <p className="ornament-row mb-6">Welcome</p>
          <h1 className="font-display text-3xl font-bold">Sign in</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sign in to your account to keep going.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" />
            <Field label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary px-6 py-3 font-display text-[0.72rem] tracking-[0.18em] text-primary-foreground uppercase transition-transform hover:-translate-y-0.5 disabled:opacity-60"
            >
              {submitting ? "Signing in…" : "Sign In"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            New to Homeschooled?{" "}
            <Link to="/sign-up" className="text-terracotta underline-offset-4 hover:underline">
              Create a profile
            </Link>
          </p>
        </div>
      </section>
    </PageShell>
  );
}

function Field({
  label,
  value,
  onChange,
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label className="mb-2 block font-display text-[0.62rem] tracking-[0.16em] text-muted-foreground uppercase">
        {label}
      </label>
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-border bg-background px-4 py-3 font-body text-base focus:border-terracotta focus:outline-none"
      />
    </div>
  );
}
