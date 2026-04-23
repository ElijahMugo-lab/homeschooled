// Robust WhatsApp escalation helper that does NOT depend on
// blocked APIs (wa.me / api.whatsapp.com). It tries the native
// app deep link first, then falls back to a manual copy UI
// surfaced by the consuming component.

import { supportWhatsAppNumber, supportWhatsAppMessage } from "./chatbot-faqs";

export type EscalationResult = {
  /** Whether the deep link was attempted. */
  deepLinkAttempted: boolean;
  /** Whether we should show the manual fallback UI. */
  showFallback: boolean;
};

/** Build the whatsapp:// app deep link (not blocked, app-only). */
export function buildWhatsAppDeepLink(
  phone: string = supportWhatsAppNumber,
  message: string = supportWhatsAppMessage,
): string {
  const cleanPhone = phone.replace(/[^\d]/g, "");
  return `whatsapp://send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
}

/** Pretty-print the support number for display. */
export function formatSupportNumber(
  phone: string = supportWhatsAppNumber,
): string {
  const clean = phone.replace(/[^\d]/g, "");
  // 254 765 387 058
  if (clean.length >= 10) {
    return `+${clean.slice(0, 3)} ${clean.slice(3, 6)} ${clean.slice(6, 9)} ${clean.slice(9)}`;
  }
  return `+${clean}`;
}

/**
 * Attempt to open the WhatsApp app via deep link. Returns whether
 * the manual fallback should be shown. Always shows the fallback on
 * desktop and when the deep link doesn't trigger.
 */
export function attemptWhatsAppDeepLink(
  phone: string = supportWhatsAppNumber,
  message: string = supportWhatsAppMessage,
): EscalationResult {
  if (typeof window === "undefined") {
    return { deepLinkAttempted: false, showFallback: true };
  }

  try {
    // Use a hidden iframe so a failed protocol handler doesn't
    // navigate the page away to an error.
    const url = buildWhatsAppDeepLink(phone, message);
    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = url;
    document.body.appendChild(iframe);

    // Clean up shortly after.
    window.setTimeout(() => {
      try {
        document.body.removeChild(iframe);
      } catch {
        /* noop */
      }
    }, 1500);

    return { deepLinkAttempted: true, showFallback: true };
  } catch {
    return { deepLinkAttempted: false, showFallback: true };
  }
}

/** Copy text to the clipboard with a graceful fallback. */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
