import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmitted: () => void;
  sessionId: string;
  raterId: string;
  rateeId: string;
  rateeName: string;
  rateeRole: "parent" | "educator";
}

export function RatingDialog({ open, onClose, onSubmitted, sessionId, raterId, rateeId, rateeName, rateeRole }: Props) {
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const submit = async () => {
    if (stars < 1) {
      toast.error("Please choose a star rating.");
      return;
    }
    if (note.length > 500) {
      toast.error("Notes must be 500 characters or fewer.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("ratings").insert({
      session_id: sessionId,
      rater_id: raterId,
      ratee_id: rateeId,
      ratee_role: rateeRole,
      stars,
      note: note.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Rating submitted — thank you.");
    onSubmitted();
    onClose();
  };

  const display = hover || stars;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 px-4">
      <div className="w-full max-w-md border border-border bg-card p-7 shadow-[0_8px_48px_rgba(101,85,60,0.24)]">
        <p className="ornament-row mb-4 w-40">A Private Reckoning</p>
        <h2 className="font-display text-2xl font-semibold tracking-tight">Rate {rateeName}</h2>
        <p className="mt-2 text-sm italic text-muted-foreground">
          Your individual rating is never revealed. It contributes only to {rateeRole === "educator" ? "their public average" : "a private aggregate visible to educators they message"}.
        </p>

        <div className="my-6 flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setStars(n)}
              onMouseEnter={() => setHover(n)}
              onMouseLeave={() => setHover(0)}
              className={`text-4xl transition-colors ${n <= display ? "text-terracotta" : "text-border"}`}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
            >
              ★
            </button>
          ))}
        </div>

        <label className="block">
          <span className="font-display text-[0.6rem] tracking-[0.14em] text-muted-foreground uppercase">
            Private note (optional, max 500)
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 500))}
            rows={3}
            placeholder="A reflection only seen by admins…"
            className="mt-2 w-full border border-border bg-background px-3 py-2 text-sm focus:border-terracotta focus:outline-none"
          />
          <span className="mt-1 block text-right text-[0.65rem] text-muted-foreground">{note.length}/500</span>
        </label>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="border border-border px-4 py-2 font-display text-[0.6rem] tracking-[0.14em] text-muted-foreground uppercase hover:border-terracotta hover:text-terracotta disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting || stars < 1}
            className="bg-primary px-5 py-2 font-display text-[0.6rem] tracking-[0.14em] text-primary-foreground uppercase hover:bg-terracotta-deep disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit Rating"}
          </button>
        </div>
      </div>
    </div>
  );
}
