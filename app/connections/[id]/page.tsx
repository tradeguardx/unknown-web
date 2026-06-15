"use client";

// Resume chat with a saved match. Match mode: persistent, no skip/abandon — you
// just keep talking. Loads history via matchApi.resume(), sends via
// matchApi.send(); a 402 surfaces the Paywall (free taster used / quota out).

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MessageBubble } from "@/components/MessageBubble";
import { TypingIndicator } from "@/components/TypingIndicator";
import { matchApi, isPaywall, type MatchMessage, type MatchedPersona } from "@/lib/matchApi";
import { Paywall } from "@/components/match/Paywall";

type Msg = { role: "user" | "assistant" | "system"; text: string };

export default function ConnectionChatPage() {
  const id = String(useParams()?.id ?? "");
  const [match, setMatch] = useState<MatchedPersona | null>(null);
  const [convoId, setConvoId] = useState<string>("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [paywall, setPaywall] = useState<null | "paywall" | "quota">(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;
    matchApi
      .resume(id)
      .then((d) => {
        if (!alive) return;
        setMatch(d.match);
        setConvoId(d.conversation.id);
        setMsgs((d.messages ?? []).map((m: MatchMessage) => ({ role: m.role, text: m.content })));
        setState("ready");
      })
      .catch(() => alive && setState("error"));
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, typing]);

  async function send() {
    const text = input.trim();
    if (!text || sending || !convoId) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text }]);
    setSending(true);
    setTyping(true);
    try {
      const { reply } = await matchApi.send(convoId, text);
      setMsgs((m) => [...m, { role: "assistant", text: reply }]);
    } catch (e) {
      if (isPaywall(e)) {
        setPaywall((e as { code?: string }).code === "QUOTA_EXHAUSTED" ? "quota" : "paywall");
      } else {
        setMsgs((m) => [...m, { role: "system", text: "couldn't send — try again" }]);
      }
    } finally {
      setTyping(false);
      setSending(false);
    }
  }

  const name = match?.displayName ?? "them";

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header — back arrow returns to the list on mobile (hidden on desktop where the sidebar persists) */}
      <header className="flex items-center gap-2.5 px-4 py-3 border-b-[1.5px] border-dashed border-paper-deep flex-shrink-0">
        <Link href="/connections" className="text-ink-mute hover:text-ink text-lg lg:hidden">←</Link>
        <span className="h-9 w-9 rounded-2xl bg-lilac border-2 border-ink flex items-center justify-center flex-shrink-0" aria-hidden>
          <svg width="20" height="20" viewBox="0 0 24 24">
            <circle cx="8.5" cy="10" r="1.3" fill="#1a1610" />
            <circle cx="15.5" cy="10" r="1.3" fill="#1a1610" />
            <path d="M8 14.5c1.2 1.5 2.6 2.2 4 2.2s2.8-.7 4-2.2" stroke="#1a1610" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          </svg>
        </span>
        <div className="min-w-0">
          <div className="font-sans text-sm font-bold text-ink truncate">{name}</div>
          {match?.vibe && <div className="font-serif italic text-[12px] text-[#8b6fb8] truncate">{match.vibe}</div>}
        </div>
      </header>

      {state === "loading" && <p className="text-center font-serif italic text-ink-mute mt-16">opening…</p>}
      {state === "error" && <p className="text-center font-serif italic text-red mt-16">couldn&apos;t open this chat.</p>}

      {state === "ready" && (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 font-mono text-[13.5px] leading-[1.7]">
            {msgs.length === 0 && (
              <p className="text-center font-serif italic text-ink-mute mt-8">
                you kept {name}. say hey 👋
              </p>
            )}
            {msgs.map((m, i) => (
              <MessageBubble key={i} role={m.role} text={m.text} />
            ))}
            {typing && <TypingIndicator />}
          </div>

          <div className="px-4 pt-3 pb-5 flex-shrink-0">
            <div
              onClick={() => document.getElementById("match-input")?.focus()}
              className="flex gap-1.5 items-center bg-paper-cool border-2 border-ink rounded-2xl p-[3px] shadow-hard-sm"
            >
              <input
                id="match-input"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={`message ${name}…`}
                className="flex-1 bg-transparent border-none px-2 py-2 font-mono text-[13px] text-ink outline-none min-w-0 placeholder:font-serif placeholder:italic placeholder:text-ink-mute"
              />
              <button
                onClick={send}
                disabled={!input.trim() || sending}
                aria-label="send"
                className="bg-red text-paper-cool border-2 border-ink rounded-full h-10 w-10 flex items-center justify-center text-lg font-bold flex-shrink-0 shadow-hard-xs disabled:opacity-40"
              >
                →
              </button>
            </div>
          </div>
        </>
      )}

      {paywall && <Paywall reason={paywall} name={name} onClose={() => setPaywall(null)} />}
    </div>
  );
}
