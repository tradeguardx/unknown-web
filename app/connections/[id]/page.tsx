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
import { refreshAccount } from "@/lib/useAccount";
import { Paywall } from "@/components/match/Paywall";
import { UpgradeAccount } from "@/components/match/UpgradeAccount";
import { ConfirmDialog } from "@/components/ConfirmDialog";

type Msg = { role: "user" | "assistant" | "system"; text: string };

// Keep replies texting-tight: collapse blank lines so a "greeting ⏎⏎ question"
// reply doesn't render as a big gap (matches the strangers chat's compact feel).
const tidy = (s: string) => s.replace(/\n{2,}/g, "\n").trim();

const FREE_TASTER = 10; // free messages per connection before the paywall

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
  const [closed, setClosed] = useState(false); // content-policy close → input locked
  const [anon, setAnon] = useState<boolean | null>(null); // must log in to chat
  const [paid, setPaid] = useState(false); // subscriber or day pass → unlimited
  const [taster, setTaster] = useState<number | null>(null); // free messages left
  const [confirmUnmatch, setConfirmUnmatch] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const autoPaywallRef = useRef(false); // show the paywall once when the taster hits 0

  // Account state — anonymous users can open a connection but must log in to chat.
  useEffect(() => {
    let alive = true;
    matchApi
      .me()
      .then((m) => {
        if (!alive) return;
        setAnon(m.isAnonymous);
        setPaid(m.subscription.active || m.pass.active);
      })
      .catch(() => alive && setAnon(null));
    return () => {
      alive = false;
    };
  }, []);

  async function doUnmatch() {
    setConfirmUnmatch(false);
    try {
      await matchApi.unmatch(id);
      window.location.href = "/connections"; // full nav so the sidebar refreshes
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    let alive = true;
    matchApi
      .resume(id)
      .then((d) => {
        if (!alive) return;
        setMatch(d.match);
        setConvoId(d.conversation.id);
        setTaster(Math.max(0, FREE_TASTER - (d.conversation.freeMessagesUsed ?? 0)));
        setMsgs((d.messages ?? []).map((m: MatchMessage) => ({ role: m.role, text: tidy(m.content) })));
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

  // As soon as the free taster hits 0 (after the 10th message, or on a resume
  // that's already used up), show the paywall — don't wait for the next send.
  useEffect(() => {
    if (state === "ready" && anon === false && !paid && taster === 0 && !autoPaywallRef.current) {
      autoPaywallRef.current = true;
      setPaywall("paywall");
    }
  }, [state, anon, paid, taster]);

  async function send() {
    const text = input.trim();
    if (!text || sending || !convoId) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", text }]);
    setSending(true);
    setTyping(true);
    try {
      const res = await matchApi.send(convoId, text);
      const warnText = res.warning?.text;
      const reply = res.reply;
      if (warnText) {
        // Content-filter warning (no reply) — show it as a system line.
        setMsgs((m) => [...m, { role: "system", text: warnText }]);
      } else if (reply) {
        setMsgs((m) => [...m, { role: "assistant", text: tidy(reply) }]);
        // Track the free taster countdown; once subscribed/topped-up, stop showing it.
        if (res.billed === "free_taster") setTaster((t) => (t == null ? t : Math.max(0, t - 1)));
        else if (res.billed) setTaster(null);
        // Refresh the plan/usage so the message-count footer updates live.
        void refreshAccount();
      }
    } catch (e) {
      const err = e as { code?: string; status?: number; message?: string };
      if (isPaywall(e)) {
        setPaywall(err.code === "QUOTA_EXHAUSTED" ? "quota" : "paywall");
      } else if (err.code === "LOGIN_REQUIRED") {
        setAnon(true); // backend says log in → show the gate
      } else if (err.status === 451) {
        // Content-policy violation → end the chat, lock the input.
        setMsgs((m) => [...m, { role: "system", text: err.message || "this chat has been ended." }]);
        setClosed(true);
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
        <div className="min-w-0 flex-1">
          <div className="font-sans text-sm font-bold text-ink truncate">{name}</div>
          {match?.vibe && <div className="font-serif italic text-[12px] text-[#8b6fb8] truncate">{match.vibe}</div>}
        </div>
        {state === "ready" && (
          <button
            onClick={() => setConfirmUnmatch(true)}
            className="flex-shrink-0 rounded-full border-[1.5px] border-ink bg-paper-cool px-3 py-1.5 font-sans text-[12px] font-bold tracking-tight text-ink shadow-hard-xs hover:bg-red hover:text-paper-cool hover:border-ink"
            title={`unmatch ${name}`}
          >
            unmatch
          </button>
        )}
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

          {anon === true ? (
            // Anonymous → must log in to chat. Centered, constrained card so it
            // doesn't stretch across the wide desktop pane.
            <div className="px-4 pt-3 pb-5 flex-shrink-0">
              <div className="mx-auto w-full max-w-sm">
                <UpgradeAccount
                  forceShow
                  title={`log in to chat with ${name}`}
                  subtitle="you've got 10 free messages to start 💘 — log in to send them."
                  onDone={() => window.location.reload()}
                />
              </div>
            </div>
          ) : closed ? (
            <div className="px-4 pt-3 pb-6 flex-shrink-0 text-center font-serif italic text-ink-mute text-sm">
              this chat has ended.
            </div>
          ) : (
          <div className="px-4 pt-3 pb-5 flex-shrink-0">
            {/* Free taster countdown — only for non-paying users. */}
            {!paid && taster != null && (
              <p className="mb-1.5 px-1 text-center font-sans text-[12px] font-semibold text-ink-mute">
                {taster > 0 ? (
                  <>
                    <span className="text-red">{taster}</span> free message{taster === 1 ? "" : "s"} left with {name}
                  </>
                ) : (
                  <>free messages used — <span className="text-red">subscribe or grab a day pass</span> to keep going</>
                )}
              </p>
            )}
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
          )}
        </>
      )}

      {paywall && <Paywall reason={paywall} name={name} onClose={() => setPaywall(null)} />}

      <ConfirmDialog
        open={confirmUnmatch}
        title={`unmatch ${name}?`}
        body="this deletes your chat with them. you can't undo it."
        confirmLabel="unmatch"
        danger
        onConfirm={doUnmatch}
        onCancel={() => setConfirmUnmatch(false)}
      />
    </div>
  );
}
