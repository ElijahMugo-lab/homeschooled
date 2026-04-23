import { useEffect, useRef, useState } from "react";
import { MessageCircle, X, Send, RefreshCw } from "lucide-react";
import {
  FAQS,
  FALLBACK_MESSAGE,
  ENDING_MESSAGE,
  WELCOME_MESSAGE,
  matchFaq,
  type Faq,
} from "@/lib/chatbot-faqs";
import { WhatsAppEscalationCard } from "@/components/whatsapp-escalation-card";

type Message = {
  id: string;
  from: "bot" | "user";
  text: string;
  suggestions?: string[]; // FAQ ids to show as quick replies
  showWhatsapp?: boolean;
  isFallback?: boolean;
};

const SUGGESTED_IDS = ["services", "pricing", "booking", "hours", "location", "vetting"];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function welcomeMessages(): Message[] {
  return [
    {
      id: uid(),
      from: "bot",
      text: WELCOME_MESSAGE,
      suggestions: SUGGESTED_IDS,
    },
  ];
}

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(welcomeMessages);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing, open]);

  const pushBotAnswer = (faq: Faq) => {
    setTyping(true);
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          id: uid(),
          from: "bot",
          text: faq.answer,
        },
        {
          id: uid(),
          from: "bot",
          text: ENDING_MESSAGE,
          suggestions: faq.followUps && faq.followUps.length > 0 ? faq.followUps : SUGGESTED_IDS,
          showWhatsapp: true,
        },
      ]);
      setTyping(false);
    }, 550);
  };

  const pushFallback = () => {
    setTyping(true);
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        {
          id: uid(),
          from: "bot",
          text: FALLBACK_MESSAGE,
          showWhatsapp: true,
          isFallback: true,
        },
      ]);
      setTyping(false);
    }, 500);
  };

  const handleAsk = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((m) => [...m, { id: uid(), from: "user", text: trimmed }]);
    setInput("");

    const faq = matchFaq(trimmed);
    if (faq) pushBotAnswer(faq);
    else pushFallback();
  };

  const handleQuickReply = (faqId: string) => {
    const faq = FAQS.find((f) => f.id === faqId);
    if (!faq) return;
    setMessages((m) => [...m, { id: uid(), from: "user", text: faq.question }]);
    pushBotAnswer(faq);
  };

  const reset = () => {
    setMessages(welcomeMessages());
    setInput("");
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open chat"
          className="fixed bottom-5 right-5 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-laurel text-alabaster shadow-lg transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold md:bottom-8 md:right-8"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {/* Panel */}
      {open && (
        <div
          role="dialog"
          aria-label="Homeschooled chat"
          className="fixed inset-x-3 bottom-3 z-[60] flex max-h-[85vh] flex-col border border-border bg-alabaster shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-200 sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[380px]"
        >
          {/* Header */}
          <header className="flex items-center justify-between border-b border-border bg-parchment px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-laurel text-alabaster">
                <span aria-hidden>❦</span>
              </div>
              <div className="leading-tight">
                <p className="font-display text-sm font-semibold tracking-wide">Homeschooled</p>
                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                  Answers are automated
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={reset}
                aria-label="Reset conversation"
                className="rounded p-1.5 text-muted-foreground hover:bg-stone hover:text-ink"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
                className="rounded p-1.5 text-muted-foreground hover:bg-stone hover:text-ink"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
            style={{ minHeight: "320px" }}
          >
            {messages.map((m) => (
              <div key={m.id} className="space-y-2">
                <div
                  className={
                    m.from === "user"
                      ? "ml-auto max-w-[85%] bg-ink px-3 py-2 text-sm text-alabaster"
                      : "mr-auto max-w-[90%] bg-parchment px-3 py-2 text-sm text-ink border border-border"
                  }
                >
                  {m.text}
                </div>

                {m.suggestions && m.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {m.suggestions
                      .map((id) => FAQS.find((f) => f.id === id))
                      .filter((f): f is Faq => Boolean(f))
                      .map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => handleQuickReply(f.id)}
                          className="border border-border bg-alabaster px-2.5 py-1 text-xs text-ink hover:border-laurel hover:text-laurel"
                        >
                          {f.question}
                        </button>
                      ))}
                  </div>
                )}

                {m.showWhatsapp && (
                  <WhatsAppEscalationCard
                    compact
                    message={
                      m.isFallback
                        ? "Hi, I have a question that the Homeschooled chatbot could not answer."
                        : "Hi, I'd like to continue the conversation from the Homeschooled chatbot."
                    }
                  />
                )}
              </div>
            ))}

            {typing && (
              <div className="mr-auto inline-flex items-center gap-1 bg-parchment px-3 py-2 border border-border">
                <Dot delay="0ms" />
                <Dot delay="150ms" />
                <Dot delay="300ms" />
              </div>
            )}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk(input);
            }}
            className="flex items-center gap-2 border-t border-border bg-background px-3 py-3"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your question…"
              className="flex-1 border border-border bg-alabaster px-3 py-2 text-sm focus:border-laurel focus:outline-none"
              aria-label="Type your question"
            />
            <button
              type="submit"
              aria-label="Send"
              className="flex h-9 w-9 items-center justify-center bg-laurel text-alabaster hover:brightness-110 disabled:opacity-50"
              disabled={!input.trim()}
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce"
      style={{ animationDelay: delay }}
    />
  );
}
