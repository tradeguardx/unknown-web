"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { loadPrefs } from "@/lib/clientPrefs";

type DisplayMsg =
  | { role: "user" | "assistant"; text: string }
  | { role: "system"; text: string };

interface PacedMessage {
  text: string;
  preTypingMs: number;
  totalMs: number;
}

interface StartResponse {
  sessionId: string;
  opener:
    | { willSendFirst: true; text: string; delayMs: number; preTypingMs: number }
    | { willSendFirst: false };
}

interface SendResponse {
  messages: PacedMessage[];
  left: boolean;
  reason?: string;
  leaveDelayMs?: number; // for ghost-leave, no messages
}

interface IdleResponse {
  messages: PacedMessage[];
  left: boolean;
  reason?: string;
  stay: boolean;
}

// How long to wait before the persona considers pinging the silent user.
// Random per-check so it doesn't feel scripted. Persona may also choose [STAY] and stay quiet.
function nextIdleDelayMs(): number {
  return 45_000 + Math.floor(Math.random() * 45_000); // 45–90s
}

export function ChatWindow() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMsg[]>([]);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const [ended, setEnded] = useState(false);

  const timeoutsRef = useRef<number[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Idle tracking: when did the user last send something? Used to compute silenceMs
  // for the /idle endpoint, and to gate idle pings (no double-pings while a persona reply is animating).
  const lastUserActivityRef = useRef<number>(Date.now());
  const idleTimerRef = useRef<number | null>(null);
  const replyInFlightRef = useRef<boolean>(false);
  const sessionIdRef = useRef<string | null>(null);
  const endedRef = useRef<boolean>(false);

  // Keep refs synced with state so callbacks scheduled long ago see the current values.
  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
  useEffect(() => { endedRef.current = ended; }, [ended]);

  const clearAllTimeouts = useCallback(() => {
    timeoutsRef.current.forEach(t => window.clearTimeout(t));
    timeoutsRef.current = [];
    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
  }, []);

  const schedule = useCallback((fn: () => void, delay: number) => {
    const id = window.setTimeout(fn, delay);
    timeoutsRef.current.push(id);
    return id;
  }, []);

  const pushMsg = useCallback((m: DisplayMsg) => {
    setMessages(prev => [...prev, m]);
  }, []);

  // Animate a sequence of paced messages. Returns the total duration so the
  // caller can chain idle re-arming after the last message finishes typing.
  const playPacedMessages = useCallback((msgs: PacedMessage[]): number => {
    let cursor = 0;
    for (const m of msgs) {
      const startTyping = cursor + m.preTypingMs;
      const endTyping = cursor + m.preTypingMs + (m.totalMs - m.preTypingMs);
      schedule(() => setTyping(true), startTyping);
      schedule(() => {
        setTyping(false);
        pushMsg({ role: "assistant", text: m.text });
      }, endTyping);
      cursor = endTyping;
    }
    return cursor;
  }, [pushMsg, schedule]);

  // Arm an idle check. If the user stays silent past the delay, ask the server
  // what the persona wants to do (ping / leave / stay). Re-arms after each idle round.
  const armIdleTimer = useCallback(() => {
    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current);
    }
    const delay = nextIdleDelayMs();
    idleTimerRef.current = window.setTimeout(async () => {
      idleTimerRef.current = null;
      const sid = sessionIdRef.current;
      if (!sid || endedRef.current || replyInFlightRef.current) {
        // Can't or shouldn't poke right now — re-arm and wait again.
        armIdleTimer();
        return;
      }
      const silenceMs = Date.now() - lastUserActivityRef.current;
      if (silenceMs < delay - 2_000) {
        // User did something between scheduling and firing — re-arm.
        armIdleTimer();
        return;
      }
      try {
        replyInFlightRef.current = true;
        const res = await fetch("/api/chat/idle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId: sid, silenceMs }),
        });
        if (res.status === 410) {
          const data = await res.json().catch(() => ({}));
          pushMsg({ role: "system", text: `stranger has disconnected${data?.reason ? ` (${data.reason})` : ""}.` });
          setEnded(true);
          return;
        }
        if (!res.ok) {
          // Silent failure — re-arm and try later.
          armIdleTimer();
          return;
        }
        const data = (await res.json()) as IdleResponse;
        if (data.stay) {
          armIdleTimer();
          return;
        }
        const total = playPacedMessages(data.messages);
        if (data.left) {
          schedule(() => {
            pushMsg({ role: "system", text: `stranger has disconnected${data.reason ? ` (${data.reason})` : ""}.` });
            setEnded(true);
          }, total);
        } else {
          // Persona pinged — give the user a chance to reply, then re-arm.
          schedule(() => armIdleTimer(), total + 1_000);
        }
      } catch {
        armIdleTimer();
      } finally {
        // replyInFlight stays true until messages animate; allow other flows by clearing soon.
        schedule(() => { replyInFlightRef.current = false; }, 100);
      }
    }, delay);
  }, [playPacedMessages, pushMsg, schedule]);

  const connect = useCallback(async () => {
    clearAllTimeouts();
    setMessages([{ role: "system", text: "looking for a stranger..." }]);
    setTyping(false);
    setEnded(false);
    setSessionId(null);
    replyInFlightRef.current = false;
    lastUserActivityRef.current = Date.now();

    try {
      await new Promise(r => schedule(r as () => void, 600 + Math.random() * 1400));

      const prefs = loadPrefs();
      const res = await fetch("/api/chat/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prefs }),
      });
      if (res.status === 403) {
        pushMsg({ role: "system", text: "this intent requires 18+ confirmation. update your prefs to continue." });
        setEnded(true);
        return;
      }
      if (!res.ok) throw new Error("failed to start");
      const data = (await res.json()) as StartResponse;
      setSessionId(data.sessionId);
      pushMsg({ role: "system", text: "you're now chatting with a random stranger." });

      let openerEnd = 0;
      if (data.opener.willSendFirst) {
        const { text, delayMs, preTypingMs } = data.opener;
        schedule(() => setTyping(true), preTypingMs);
        schedule(() => {
          setTyping(false);
          pushMsg({ role: "assistant", text });
        }, delayMs);
        openerEnd = delayMs;
      }
      schedule(() => armIdleTimer(), openerEnd + 500);
    } catch {
      pushMsg({ role: "system", text: "couldn't connect. try again." });
      setEnded(true);
    }
  }, [armIdleTimer, clearAllTimeouts, pushMsg, schedule]);

  useEffect(() => {
    connect();
    return () => clearAllTimeouts();
  }, [connect, clearAllTimeouts]);

  // Autoscroll on new content.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  async function send() {
    const text = input.trim();
    if (!text || !sessionId || ended) return;

    // Stamp activity. Cancel any pending idle ping — user is no longer silent.
    lastUserActivityRef.current = Date.now();
    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }

    setInput("");
    pushMsg({ role: "user", text });

    try {
      replyInFlightRef.current = true;
      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: text }),
      });

      if (res.status === 410) {
        const data = await res.json().catch(() => ({}));
        const reason = (data && data.reason) || "left";
        pushMsg({ role: "system", text: `stranger has disconnected (${reason}).` });
        setEnded(true);
        return;
      }
      if (res.status === 404) {
        pushMsg({ role: "system", text: "connection dropped. finding someone new..." });
        connect();
        return;
      }
      if (!res.ok) {
        pushMsg({ role: "system", text: "something glitched. try sending again." });
        return;
      }

      const data = (await res.json()) as SendResponse;

      // Ghost-leave: no messages, just a delay then disconnect notice.
      if (data.left && data.messages.length === 0) {
        const delay = data.leaveDelayMs ?? 5_000;
        schedule(() => {
          pushMsg({ role: "system", text: `stranger has disconnected${data.reason ? ` (${data.reason})` : ""}.` });
          setEnded(true);
        }, delay);
        return;
      }

      const total = playPacedMessages(data.messages);
      if (data.left) {
        schedule(() => {
          pushMsg({ role: "system", text: `stranger has disconnected${data.reason ? ` (${data.reason})` : ""}.` });
          setEnded(true);
        }, total);
      } else {
        // Re-arm idle timer once the persona's burst finishes, so silence detection
        // resumes from "after persona finished talking".
        schedule(() => armIdleTimer(), total + 500);
      }
    } catch {
      pushMsg({ role: "system", text: "network hiccup. try again." });
    } finally {
      schedule(() => { replyInFlightRef.current = false; }, 200);
    }
  }

  function skip() {
    clearAllTimeouts();
    if (sessionId && !ended) {
      pushMsg({ role: "system", text: "you skipped." });
    }
    setEnded(false);
    connect();
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight">unknown.chat</Link>
        <div className="text-xs text-neutral-400 flex items-center gap-3">
          <Link href="/" className="hover:text-neutral-600">prefs</Link>
          <Link href="/about" className="hover:text-neutral-600">about</Link>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 max-w-2xl w-full mx-auto font-mono text-sm">
        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} text={m.text} />
        ))}
        {typing && <TypingIndicator />}
      </div>

      <div className="border-t border-neutral-200 px-4 py-3 max-w-2xl w-full mx-auto">
        <div className="flex gap-2">
          <button
            onClick={skip}
            className="px-3 py-2 text-sm rounded-lg border border-neutral-300 hover:bg-neutral-100"
            title={ended ? "find another stranger" : "skip and find another"}
          >
            {ended ? "new" : "skip"}
          </button>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            disabled={ended || !sessionId}
            placeholder={ended ? "this chat ended. hit 'new' to start another." : "say something..."}
            className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink/20 disabled:bg-neutral-50 disabled:text-neutral-400"
          />
          <button
            onClick={send}
            disabled={ended || !input.trim() || !sessionId}
            className="px-4 py-2 text-sm rounded-lg bg-ink text-paper disabled:opacity-40"
          >
            send
          </button>
        </div>
      </div>
    </div>
  );
}
