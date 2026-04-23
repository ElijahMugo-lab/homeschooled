import { useState } from "react";
import { Copy, Check, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import {
  supportWhatsAppNumber,
  supportWhatsAppMessage,
} from "@/lib/chatbot-faqs";
import {
  attemptWhatsAppDeepLink,
  copyToClipboard,
  formatSupportNumber,
} from "@/lib/whatsapp-escalation";

type Props = {
  /** Optional override for the prefilled message. */
  message?: string;
  /** Compact variant for use inside the chatbot. */
  compact?: boolean;
};

export function WhatsAppEscalationCard({
  message = supportWhatsAppMessage,
  compact = false,
}: Props) {
  const [copiedField, setCopiedField] = useState<"number" | "message" | null>(
    null,
  );

  const handleCopy = async (
    value: string,
    field: "number" | "message",
    label: string,
  ) => {
    const ok = await copyToClipboard(value);
    if (ok) {
      setCopiedField(field);
      toast.success(`${label} copied`);
      window.setTimeout(() => setCopiedField(null), 1500);
    } else {
      toast.error(`Could not copy ${label.toLowerCase()}`);
    }
  };

  const handleOpen = () => {
    attemptWhatsAppDeepLink(supportWhatsAppNumber, message);
    toast("Trying to open WhatsApp…", {
      description: "If nothing happens, copy the number and message below.",
    });
  };

  return (
    <div
      className={
        "border border-border bg-parchment/60 " +
        (compact ? "p-3 space-y-2.5" : "p-4 space-y-3")
      }
    >
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex w-full items-center justify-center gap-2 bg-[#25D366] px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white shadow-sm hover:brightness-95"
      >
        <MessageCircle className="h-4 w-4" />
        Continue on WhatsApp
      </button>

      <p className="text-[11px] italic text-muted-foreground">
        WhatsApp opening not available on this device? Copy the number and
        message below and paste them into WhatsApp.
      </p>

      <div className="space-y-2">
        <div>
          <label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Number
          </label>
          <div className="mt-1 flex items-center gap-2">
            <input
              readOnly
              value={formatSupportNumber(supportWhatsAppNumber)}
              className="flex-1 border border-border bg-alabaster px-2 py-1.5 text-sm text-ink"
              onFocus={(e) => e.currentTarget.select()}
            />
            <button
              type="button"
              onClick={() =>
                handleCopy(
                  `+${supportWhatsAppNumber.replace(/[^\d]/g, "")}`,
                  "number",
                  "Number",
                )
              }
              aria-label="Copy number"
              className="inline-flex items-center gap-1 border border-border bg-alabaster px-2 py-1.5 text-xs hover:border-laurel hover:text-laurel"
            >
              {copiedField === "number" ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              Copy
            </button>
          </div>
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Message
          </label>
          <div className="mt-1 flex items-start gap-2">
            <textarea
              readOnly
              value={message}
              rows={2}
              className="flex-1 resize-none border border-border bg-alabaster px-2 py-1.5 text-sm text-ink"
              onFocus={(e) => e.currentTarget.select()}
            />
            <button
              type="button"
              onClick={() => handleCopy(message, "message", "Message")}
              aria-label="Copy message"
              className="inline-flex items-center gap-1 border border-border bg-alabaster px-2 py-1.5 text-xs hover:border-laurel hover:text-laurel"
            >
              {copiedField === "message" ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              Copy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
