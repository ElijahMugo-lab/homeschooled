import type { AppStatus } from "@/lib/admin-data";
import { labelForStatus } from "@/lib/admin-data";

const STYLES: Record<AppStatus, string> = {
  draft:           "border-stone bg-parchment text-muted-foreground",
  submitted:       "border-gold/60 bg-gold/10 text-gold",
  under_review:    "border-terracotta/60 bg-terracotta/10 text-terracotta-deep",
  needs_more_info: "border-gold bg-gold/15 text-gold",
  qualified:       "border-laurel/70 bg-laurel/10 text-laurel",
  rejected:        "border-destructive/70 bg-destructive/10 text-destructive",
  suspended:       "border-ink/40 bg-ink/10 text-ink",
};

export function StatusChip({ status, size = "sm" }: { status: AppStatus; size?: "xs" | "sm" }) {
  const sizeCls = size === "xs"
    ? "px-2 py-0.5 text-[0.55rem]"
    : "px-2.5 py-1 text-[0.6rem]";
  return (
    <span className={`inline-flex items-center border ${sizeCls} font-display tracking-[0.14em] uppercase ${STYLES[status]}`}>
      {labelForStatus(status)}
    </span>
  );
}

export function LaurelBadge({ size = "sm" }: { size?: "xs" | "sm" | "md" }) {
  const cls = size === "md"
    ? "px-3 py-1.5 text-[0.62rem]"
    : size === "xs"
      ? "px-1.5 py-0.5 text-[0.5rem]"
      : "px-2.5 py-1 text-[0.55rem]";
  return (
    <span className={`inline-flex items-center gap-1.5 border border-laurel/60 bg-laurel/10 ${cls} font-display tracking-[0.16em] text-laurel uppercase`}>
      <span aria-hidden>❦</span>
      Laurel Wreath
    </span>
  );
}

export function RiskChip({ flag }: { flag: NonNullable<import("@/lib/admin-data").TeacherApplication["risk_flag"]> }) {
  const map = {
    duplicate_email: "Duplicate Email",
    expired_doc: "Expired Doc",
    stale_submission: "Stale Submission",
    low_confidence: "Low Confidence",
  };
  return (
    <span className="inline-flex items-center border border-destructive/60 bg-destructive/10 px-2 py-0.5 font-display text-[0.55rem] tracking-[0.14em] text-destructive uppercase">
      ⚠ {map[flag]}
    </span>
  );
}
