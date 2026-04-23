import { createFileRoute } from "@tanstack/react-router";
import { useRouter } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, type AppRole } from "@/lib/auth-context";
import { PageShell } from "@/components/page-shell";
import { toast } from "sonner";
import { assignRole } from "@/server/assign-role";

const schema = z.object({
  fullName: z.string().trim().min(2, "Tell us your name").max(100),
  email: z.string().trim().email("A valid email is required").max(255),
  password: z.string().min(8, "Use at least 8 characters").max(128),
  role: z.enum(["parent", "educator"]),
});

export const Route = createFileRoute("/sign-up")({
  head: () => ({
    meta: [
      { title: "Begin · Homeschooled" },
      { name: "description", content: "Create your Homeschooled profile as a parent or educator." },
      { property: "og:title", content: "Begin on Homeschooled" },
      {
        property: "og:description",
        content: "Join as a parent or apply for the Laurel Wreath as an educator.",
      },
    ],
  }),
  component: SignUpPage,
});

function SignUpPage() {
  const router = useRouter();
  const { user, loading: authLoading, refreshRole } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("parent");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!authLoading && user) router.navigate({ to: "/dashboard" });
  }, [user, authLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ fullName, email, password, role });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);

    const redirectUrl = `${window.location.origin}/dashboard`;
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: { full_name: parsed.data.fullName },
      },
    });

    if (error) {
      setSubmitting(false);
      toast.error(error.message);
      return;
    }

    if (data.user) {
      try {
        // Role assignment goes through a server function that uses the
        // service role client. This is required because:
        //   - 'parent' → still works via RLS but we centralise the call
        //   - 'educator' → direct client insert is blocked by the RLS policy;
        //     must call assign_educator_role() via service role
        await assignRole({
          data: { userId: data.user.id, role: parsed.data.role },
        });
        await refreshRole();
        toast.success(
          parsed.data.role === "educator"
            ? "Welcome — apply for your Laurel Wreath"
            : "Welcome to Homeschooled",
        );
      } catch (err) {
        console.error("Role assign failed:", err);
        toast.error("Account created but role could not be assigned. Contact support.");
      }
    }

    setSubmitting(false);
    router.navigate({ to: "/dashboard" });
  };

  return (
    <PageShell>
      <section className="flex min-h-[calc(100vh-256px)] items-center justify-center px-6 py-16">
        <div className="w-full max-w-md border border-border bg-card p-10 shadow-[0_2px_24px_rgba(101,85,60,0.08)]">
          <p className="ornament-row mb-6">Begin</p>
          <h1 className="font-display text-3xl font-bold">Create your profile</h1>
          <p className="mt-2 text-sm italic text-muted-foreground">
            One bridge, two sides. Choose where you stand.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-px bg-border">
            <RoleTab active={role === "parent"} onClick={() => setRole("parent")}>
              I'm a Parent
            </RoleTab>
            <RoleTab active={role === "educator"} onClick={() => setRole("educator")}>
              I'm an Educator
            </RoleTab>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <Field label="Full name" value={fullName} onChange={setFullName} autoComplete="name" />
            <Field
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
            />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
            />
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-primary px-6 py-3 font-display text-[0.72rem] tracking-[0.18em] text-primary-foreground uppercase transition-transform hover:-translate-y-0.5 disabled:opacity-60"
            >
              {submitting
                ? "Creating…"
                : role === "educator"
                  ? "Apply for the Laurel"
                  : "Enter the Agora"}
            </button>
          </form>

          {role === "educator" && (
            <p className="mt-4 border-l-2 border-gold bg-gold/10 px-4 py-3 text-xs italic text-muted-foreground">
              Educators submit credentials after signup. Your profile stays hidden from the Agora
              until verification is complete.
            </p>
          )}

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have a profile?{" "}
            <Link to="/sign-in" className="text-terracotta underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </PageShell>
  );
}

function RoleTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-3 font-display text-[0.66rem] tracking-[0.14em] uppercase transition-colors ${
        active
          ? "bg-primary text-primary-foreground"
          : "bg-card text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
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
