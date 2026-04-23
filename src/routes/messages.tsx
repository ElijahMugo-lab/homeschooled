import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { PageShell } from "@/components/page-shell";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RatingDialog } from "@/components/rating-dialog";

interface SessionRow {
  id: string;
  conversation_id: string;
  parent_id: string;
  educator_id: string;
  completed_at: string;
  rated_by_me: boolean;
}


export const Route = createFileRoute("/messages")({
  head: () => ({ meta: [{ title: "Messages · Homeschooled" }] }),
  validateSearch: (s: Record<string, unknown>) => ({
    educator: typeof s.educator === "string" ? s.educator : undefined,
  }),
  component: MessagesPage,
});

interface Conversation {
  id: string;
  parent_id: string;
  educator_id: string;
  last_message_at: string;
  other_name: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
}

function MessagesPage() {
  const { user, role, loading: authLoading } = useAuth();
  const router = useRouter();
  const search = Route.useSearch();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [ratingSessionId, setRatingSessionId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) router.navigate({ to: "/sign-in" });
  }, [user, authLoading, router]);

  // Initial load + auto-create from ?educator=
  useEffect(() => {
    if (!user) return;
    void (async () => {
      setLoading(true);

      // Auto-create a conversation if ?educator= present and we're a parent
      if (search.educator && role === "parent" && search.educator !== user.id) {
        const { data: existing } = await supabase
          .from("conversations")
          .select("id")
          .eq("parent_id", user.id)
          .eq("educator_id", search.educator)
          .maybeSingle();

        if (!existing) {
          const { error } = await supabase.from("conversations").insert({
            parent_id: user.id,
            educator_id: search.educator,
          });
          if (error) toast.error(error.message);
        }
      }

      await refreshConversations();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, search.educator]);

  const refreshConversations = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("conversations")
      .select("id, parent_id, educator_id, last_message_at")
      .or(`parent_id.eq.${user.id},educator_id.eq.${user.id}`)
      .order("last_message_at", { ascending: false });

    if (error) {
      toast.error(error.message);
      return;
    }

    const otherIds = Array.from(
      new Set((data ?? []).map((c) => (c.parent_id === user.id ? c.educator_id : c.parent_id))),
    );

    const nameMap = new Map<string, string>();
    if (otherIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", otherIds);
      for (const p of profs ?? []) nameMap.set(p.id, p.full_name ?? "Unnamed");

      const { data: edus } = await supabase
        .from("educator_profiles")
        .select("id, display_name")
        .in("id", otherIds);
      for (const e of edus ?? []) nameMap.set(e.id, e.display_name);
    }

    const enriched: Conversation[] = (data ?? []).map((c) => ({
      ...c,
      other_name: nameMap.get(c.parent_id === user.id ? c.educator_id : c.parent_id) ?? "Unknown",
    }));

    setConversations(enriched);
    if (!activeId && enriched.length) setActiveId(enriched[0].id);
    if (search.educator && role === "parent") {
      const match = enriched.find((c) => c.educator_id === search.educator);
      if (match) setActiveId(match.id);
    }
  };

  const loadSessionsForActive = async (convId: string) => {
    if (!user) return;
    const { data, error } = await supabase
      .from("sessions")
      .select("id, conversation_id, parent_id, educator_id, completed_at")
      .eq("conversation_id", convId)
      .order("completed_at", { ascending: false });

    if (error) {
      toast.error(error.message);
      return;
    }

    const sessionIds = (data ?? []).map((s) => s.id);
    let myRated = new Set<string>();
    if (sessionIds.length) {
      const { data: rated } = await supabase
        .from("ratings")
        .select("session_id")
        .in("session_id", sessionIds)
        .eq("rater_id", user.id);
      myRated = new Set((rated ?? []).map((r) => r.session_id));
    }

    setSessions(
      (data ?? []).map((s) => ({ ...s, rated_by_me: myRated.has(s.id) })),
    );
  };

  // Load messages for active conversation + subscribe to realtime
  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      return;
    }
    void (async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", activeId)
        .order("created_at", { ascending: true });
      setMessages(data ?? []);
    })();

    const channel = supabase
      .channel(`messages:${activeId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${activeId}` },
        (payload) => {
          setMessages((prev) =>
            prev.some((m) => m.id === (payload.new as Message).id) ? prev : [...prev, payload.new as Message],
          );
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeId]);

  // Load sessions for the active conversation
  useEffect(() => {
    if (!activeId) {
      setSessions([]);
      return;
    }
    void loadSessionsForActive(activeId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeId, user]);

  // Realtime conversation list refresh on any new message in any of our convos
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`convo-list:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => void refreshConversations(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const active = useMemo(() => conversations.find((c) => c.id === activeId), [conversations, activeId]);

  const markSessionComplete = async () => {
    if (!user || !active || role !== "educator") return;
    const { error } = await supabase.from("sessions").insert({
      conversation_id: active.id,
      parent_id: active.parent_id,
      educator_id: active.educator_id,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Session marked complete. Both of you may now rate.");
    void loadSessionsForActive(active.id);
  };

  const pendingRating = sessions.find((s) => !s.rated_by_me);
  const rateeId = active && user ? (active.parent_id === user.id ? active.educator_id : active.parent_id) : null;
  const rateeRole: "parent" | "educator" = role === "parent" ? "educator" : "parent";

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeId || !draft.trim()) return;
    setSending(true);
    const body = draft.trim();
    setDraft("");
    const { error } = await supabase.from("messages").insert({
      conversation_id: activeId,
      sender_id: user.id,
      body,
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      setDraft(body);
    }
  };

  if (authLoading || loading) {
    return (
      <PageShell>
        <section className="flex min-h-[60vh] items-center justify-center">
          <p className="italic text-muted-foreground">Opening the bridge…</p>
        </section>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <section className="border-b border-border px-6 py-10 md:px-10">
        <div className="mx-auto max-w-6xl">
          <p className="ornament-row mb-4 w-56">Messaging Bridge</p>
          <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Conversations</h1>
          <p className="mt-2 text-sm italic text-muted-foreground">
            Text-only, deliberate exchange. Treat one another as colleagues.
          </p>
        </div>
      </section>

      <section className="px-6 py-8 md:px-10">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-[280px_1fr]">
          {/* Sidebar */}
          <aside className="border border-border bg-card">
            <div className="border-b border-border p-4 font-display text-[0.62rem] tracking-[0.16em] text-muted-foreground uppercase">
              Threads
            </div>
            {conversations.length === 0 ? (
              <p className="p-6 text-sm italic text-muted-foreground">
                No threads yet. Visit the Agora to begin.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {conversations.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => setActiveId(c.id)}
                      className={`w-full px-4 py-3 text-left transition-colors hover:bg-parchment ${
                        c.id === activeId ? "bg-parchment border-l-2 border-terracotta" : ""
                      }`}
                    >
                      <p className="font-display text-sm font-semibold">{c.other_name}</p>
                      <p className="text-xs italic text-muted-foreground">
                        {new Date(c.last_message_at).toLocaleDateString()} ·{" "}
                        {new Date(c.last_message_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>

          {/* Thread */}
          <div className="flex min-h-[500px] flex-col border border-border bg-card">
            {active ? (
              <>
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                  <div>
                    <p className="font-display text-base font-semibold">{active.other_name}</p>
                    {sessions.length > 0 && (
                      <p className="mt-0.5 text-[0.65rem] italic text-muted-foreground">
                        {sessions.length} session{sessions.length === 1 ? "" : "s"} completed
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {role === "educator" && (
                      <button
                        onClick={markSessionComplete}
                        className="border border-laurel px-3 py-1.5 font-display text-[0.55rem] tracking-[0.14em] text-laurel uppercase hover:bg-laurel hover:text-white"
                      >
                        ✓ Mark Session Complete
                      </button>
                    )}
                    {pendingRating && (
                      <button
                        onClick={() => setRatingSessionId(pendingRating.id)}
                        className="bg-gold px-3 py-1.5 font-display text-[0.55rem] tracking-[0.14em] text-ink uppercase hover:opacity-90"
                      >
                        ★ Rate {active.other_name.split(" ")[0]}
                      </button>
                    )}
                  </div>
                </header>
                <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-5">
                  {messages.length === 0 ? (
                    <p className="text-center text-sm italic text-muted-foreground">
                      No messages yet. Begin the discourse.
                    </p>
                  ) : (
                    messages.map((m) => {
                      const mine = m.sender_id === user!.id;
                      return (
                        <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`max-w-[78%] px-4 py-2.5 text-sm ${
                              mine
                                ? "bg-primary text-primary-foreground"
                                : "border border-border bg-parchment text-ink"
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{m.body}</p>
                            <p
                              className={`mt-1 text-[0.65rem] italic ${
                                mine ? "text-primary-foreground/70" : "text-muted-foreground"
                              }`}
                            >
                              {new Date(m.created_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                <form onSubmit={send} className="flex gap-2 border-t border-border p-4">
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Write your message…"
                    maxLength={4000}
                    className="flex-1 border border-border bg-background px-4 py-2.5 font-body text-sm focus:border-terracotta focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={sending || !draft.trim()}
                    className="bg-primary px-5 py-2.5 font-display text-[0.62rem] tracking-[0.16em] text-primary-foreground uppercase disabled:opacity-50"
                  >
                    Send
                  </button>
                </form>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center">
                <p className="italic text-muted-foreground">Select a thread to begin.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {ratingSessionId && active && rateeId && user && (
        <RatingDialog
          open
          onClose={() => setRatingSessionId(null)}
          onSubmitted={() => active && void loadSessionsForActive(active.id)}
          sessionId={ratingSessionId}
          raterId={user.id}
          rateeId={rateeId}
          rateeName={active.other_name}
          rateeRole={rateeRole}
        />
      )}
    </PageShell>
  );
}
