import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/vetting")({
  head: () => ({
    meta: [
      { title: "Submit Your Documents · Homeschooled" },
      { name: "robots", content: "noindex,follow" },
    ],
  }),
  component: VettingPage,
});

interface VettingDoc {
  id: string;
  doc_type: "national_id" | "certificate" | "other";
  file_path: string;
  status: "pending" | "approved" | "rejected";
  reviewer_notes: string | null;
  created_at: string;
}

function VettingPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();
  const [docs, setDocs] = useState<VettingDoc[]>([]);
  const [docType, setDocType] = useState<VettingDoc["doc_type"]>("national_id");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.navigate({ to: "/sign-in" });
    if (!loading && user && role && role !== "educator") router.navigate({ to: "/dashboard" });
  }, [user, role, loading, router]);

  const refresh = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("vetting_documents")
      .select("*")
      .eq("educator_id", user.id)
      .order("created_at", { ascending: false });
    setDocs(data ?? []);
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10 MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${user.id}/${docType}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("vetting-docs").upload(path, file);
    if (upErr) {
      setUploading(false);
      toast.error(upErr.message);
      return;
    }
    const { error: insErr } = await supabase.from("vetting_documents").insert({
      educator_id: user.id,
      doc_type: docType,
      file_path: path,
    });
    setUploading(false);
    if (insErr) {
      toast.error(insErr.message);
      return;
    }
    toast.success("Document submitted for review");
    setFile(null);
    void refresh();
  };

  if (loading || !user) {
    return (
      <PageShell>
        <section className="flex min-h-[60vh] items-center justify-center">
          <p className="italic text-muted-foreground">Loading…</p>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="border-b border-border px-6 py-12 md:px-10">
        <div className="mx-auto max-w-3xl">
          <p className="ornament-row mb-4 w-48">Your documents</p>
          <h1 className="font-display text-4xl font-bold tracking-tight">Upload your documents</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Send us your National ID and teaching certificates. Our team reviews each one within 48 hours.
            Your files are private — only you and our admin team can see them.
          </p>
        </div>
      </section>

      <section className="px-6 py-12 md:px-10">
        <div className="mx-auto max-w-3xl space-y-8">
          <form onSubmit={handleUpload} className="space-y-4 border border-border bg-card p-8">
            <h2 className="font-display text-xl font-semibold">Upload a document</h2>
            <div>
              <label className="mb-2 block font-display text-[0.62rem] tracking-[0.16em] text-muted-foreground uppercase">
                Document type
              </label>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as VettingDoc["doc_type"])}
                className="w-full border border-border bg-background px-4 py-3 font-body text-base focus:border-terracotta focus:outline-none"
              >
                <option value="national_id">National ID</option>
                <option value="certificate">Teaching Certificate</option>
                <option value="other">Other (CV, reference, etc.)</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block font-display text-[0.62rem] tracking-[0.16em] text-muted-foreground uppercase">
                File (PDF or image, max 10 MB)
              </label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="w-full border border-border bg-background px-4 py-2.5 font-body text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={!file || uploading}
              className="bg-primary px-7 py-3 font-display text-[0.66rem] tracking-[0.16em] text-primary-foreground uppercase disabled:opacity-50"
            >
              {uploading ? "Uploading…" : "Submit for Review"}
            </button>
          </form>

          <div className="border border-border bg-card p-8">
            <h2 className="mb-4 font-display text-xl font-semibold">Your uploads</h2>
            {docs.length === 0 ? (
              <p className="text-muted-foreground">You haven’t uploaded any documents yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {docs.map((d) => (
                  <li key={d.id} className="flex items-start justify-between gap-4 py-4">
                    <div>
                      <p className="font-display text-sm font-semibold">{labelFor(d.doc_type)}</p>
                      <p className="text-xs italic text-muted-foreground">
                        Submitted {new Date(d.created_at).toLocaleDateString()}
                      </p>
                      {d.reviewer_notes && (
                        <p className="mt-1 text-xs italic text-muted-foreground">
                          Notes: {d.reviewer_notes}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={d.status} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </PageShell>
  );
}

function labelFor(t: VettingDoc["doc_type"]) {
  if (t === "national_id") return "National ID";
  if (t === "certificate") return "Teaching Certificate";
  return "Other";
}

function StatusBadge({ status }: { status: VettingDoc["status"] }) {
  const map = {
    pending: "border-gold text-gold",
    approved: "border-laurel text-laurel",
    rejected: "border-destructive text-destructive",
  } as const;
  return (
    <span
      className={`shrink-0 border px-2.5 py-0.5 font-display text-[0.58rem] tracking-[0.14em] uppercase ${map[status]}`}
    >
      {status}
    </span>
  );
}
