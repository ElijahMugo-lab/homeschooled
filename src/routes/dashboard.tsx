import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard · EduBridge" }] }),
  component: DashboardPage,
});

function DashboardPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.navigate({ to: "/sign-in" });
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <PageShell>
        <section className="flex min-h-[60vh] items-center justify-center">
          <p className="italic text-muted-foreground">Preparing your space…</p>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="border-b border-border px-6 py-12 md:px-10">
        <div className="mx-auto max-w-5xl">
          <p className="ornament-row mb-4 w-48">Your Atrium</p>
          <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
            {role === "educator" ? "Educator's Study" : role === "parent" ? "Parent's Hearth" : "Welcome"}
          </h1>
          <p className="mt-3 text-sm italic text-muted-foreground">
            Signed in as {user.email}
          </p>
        </div>
      </section>

      <section className="px-6 py-12 md:px-10">
        <div className="mx-auto max-w-5xl">
          {role === "educator" ? (
            <EducatorDashboard userId={user.id} fullName={user.user_metadata.full_name ?? user.email ?? ""} />
          ) : role === "parent" ? (
            <ParentDashboard />
          ) : (
            <NoRoleSetup />
          )}
        </div>
      </section>
    </PageShell>
  );
}

function NoRoleSetup() {
  return (
    <div className="border border-border bg-card p-10 text-center">
      <h2 className="font-display text-2xl">Choose your role</h2>
      <p className="mt-2 italic text-muted-foreground">
        Your account has no role assigned yet. Contact support to fix this, or sign up again.
      </p>
    </div>
  );
}

function ParentDashboard() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card title="Find an Educator" body="Browse the Agora, filter by subject and philosophy, and message vetted tutors directly.">
        <Link to="/agora" className="mt-6 inline-block bg-primary px-6 py-3 font-display text-[0.66rem] tracking-[0.16em] text-primary-foreground uppercase">
          Enter the Agora
        </Link>
      </Card>
      <Card title="Your Conversations" body="Open the Messaging Bridge to continue threads with educators you've contacted.">
        <Link to="/messages" className="mt-6 inline-block bg-primary px-6 py-3 font-display text-[0.66rem] tracking-[0.16em] text-primary-foreground uppercase">
          Open Messages
        </Link>
      </Card>
    </div>
  );
}

interface EducatorProfile {
  id: string;
  display_name: string;
  philosophy: string | null;
  subjects: string[];
  grade_levels: string[];
  bio: string | null;
  hourly_rate_kes: number | null;
  is_verified: boolean;
}

function EducatorDashboard({ userId, fullName }: { userId: string; fullName: string }) {
  const [profile, setProfile] = useState<EducatorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    display_name: fullName,
    philosophy: "Classical",
    subjects: "",
    grade_levels: "",
    bio: "",
    hourly_rate_kes: 1500,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("educator_profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();
      if (data) {
        setProfile(data);
        setForm({
          display_name: data.display_name,
          philosophy: data.philosophy ?? "Classical",
          subjects: data.subjects.join(", "),
          grade_levels: data.grade_levels.join(", "),
          bio: data.bio ?? "",
          hourly_rate_kes: data.hourly_rate_kes ?? 1500,
        });
      } else {
        setEditing(true);
      }
      setLoading(false);
    })();
  }, [userId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const payload = {
      id: userId,
      display_name: form.display_name.trim(),
      philosophy: form.philosophy,
      subjects: form.subjects.split(",").map((s) => s.trim()).filter(Boolean),
      grade_levels: form.grade_levels.split(",").map((s) => s.trim()).filter(Boolean),
      bio: form.bio.trim() || null,
      hourly_rate_kes: Number(form.hourly_rate_kes) || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("educator_profiles")
      .upsert(payload)
      .select()
      .single();

    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setProfile(data);
    setEditing(false);
    toast.success("Profile saved");
  };

  if (loading) return <p className="italic text-muted-foreground">Loading your study…</p>;

  return (
    <div className="space-y-6">
      <div className={`border-l-4 p-5 ${profile?.is_verified ? "border-laurel bg-laurel/10" : "border-gold bg-gold/10"}`}>
        <p className="font-display text-sm tracking-wide">
          {profile?.is_verified ? "🌿 Laurel Wreath Earned" : "Pending Vetting"}
        </p>
        <p className="mt-1 text-sm italic text-muted-foreground">
          {profile?.is_verified
            ? "Your profile is live on the Agora."
            : profile
            ? "Submit your ID and certificates to earn the Laurel Wreath."
            : "Complete your profile below, then submit credentials."}
        </p>
        {!profile?.is_verified && (
          <Link
            to="/vetting"
            className="mt-3 inline-block bg-gold px-5 py-2 font-display text-[0.6rem] tracking-[0.14em] text-ink uppercase"
          >
            Submit Credentials
          </Link>
        )}
        <Link
          to="/messages"
          className="mt-3 ml-2 inline-block border border-border px-5 py-2 font-display text-[0.6rem] tracking-[0.14em] text-muted-foreground uppercase hover:border-terracotta hover:text-terracotta"
        >
          Open Messages
        </Link>
      </div>

      {editing || !profile ? (
        <form onSubmit={handleSave} className="space-y-4 border border-border bg-card p-8">
          <h2 className="mb-2 font-display text-xl font-semibold">
            {profile ? "Edit your profile" : "Create your profile"}
          </h2>
          <Field label="Display name" value={form.display_name} onChange={(v) => setForm({ ...form, display_name: v })} />
          <SelectField
            label="Teaching Philosophy"
            value={form.philosophy}
            onChange={(v) => setForm({ ...form, philosophy: v })}
            options={["Classical", "Montessori", "Charlotte Mason", "Eclectic"]}
          />
          <Field label="Subjects (comma-separated)" value={form.subjects} onChange={(v) => setForm({ ...form, subjects: v })} placeholder="Mathematics, Latin, Logic" />
          <Field label="Grade levels (comma-separated)" value={form.grade_levels} onChange={(v) => setForm({ ...form, grade_levels: v })} placeholder="Primary, Lower Secondary" />
          <div>
            <label className="mb-2 block font-display text-[0.62rem] tracking-[0.16em] text-muted-foreground uppercase">Short bio</label>
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={4}
              maxLength={500}
              className="w-full border border-border bg-background px-4 py-3 font-body text-base focus:border-terracotta focus:outline-none"
            />
          </div>
          <Field
            label="Hourly rate (KES)"
            type="number"
            value={String(form.hourly_rate_kes)}
            onChange={(v) => setForm({ ...form, hourly_rate_kes: Number(v) })}
          />
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="bg-primary px-7 py-3 font-display text-[0.66rem] tracking-[0.16em] text-primary-foreground uppercase disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save Profile"}
            </button>
            {profile && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="border border-border px-7 py-3 font-display text-[0.66rem] tracking-[0.16em] text-muted-foreground uppercase"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="border border-border bg-card p-8">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-display text-2xl font-semibold">{profile.display_name}</h2>
              {profile.philosophy && (
                <span className="mt-2 inline-block border border-gold px-2.5 py-0.5 font-display text-[0.58rem] tracking-[0.14em] text-gold uppercase">
                  {profile.philosophy}
                </span>
              )}
            </div>
            <button
              onClick={() => setEditing(true)}
              className="border border-border px-5 py-2 font-display text-[0.6rem] tracking-[0.14em] text-muted-foreground uppercase hover:border-terracotta hover:text-terracotta"
            >
              Edit
            </button>
          </div>
          <dl className="mt-6 grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
            <Detail label="Subjects" value={profile.subjects.join(" · ") || "—"} />
            <Detail label="Grade levels" value={profile.grade_levels.join(" · ") || "—"} />
            <Detail label="Hourly rate" value={profile.hourly_rate_kes ? `KSh ${profile.hourly_rate_kes.toLocaleString()}` : "—"} />
            <Detail label="Status" value={profile.is_verified ? "Verified · Live" : "Hidden · Pending"} />
          </dl>
          {profile.bio && <p className="mt-6 border-t border-border pt-4 text-sm italic text-muted-foreground">{profile.bio}</p>}
        </div>
      )}
    </div>
  );
}

function Card({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div className="border border-border bg-card p-8">
      <h3 className="font-display text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-sm italic text-muted-foreground">{body}</p>
      {children}
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-display text-[0.6rem] tracking-[0.14em] text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
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
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block font-display text-[0.62rem] tracking-[0.16em] text-muted-foreground uppercase">{label}</label>
      <input
        {...rest}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-border bg-background px-4 py-3 font-body text-base focus:border-terracotta focus:outline-none"
      />
    </div>
  );
}

function SelectField({
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
      <label className="mb-2 block font-display text-[0.62rem] tracking-[0.16em] text-muted-foreground uppercase">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none border border-border bg-background px-4 py-3 font-body text-base focus:border-terracotta focus:outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}
