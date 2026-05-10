"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { CaptchaModal } from "./CaptchaModal";
import { loadPrefs } from "@/lib/clientPrefs";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

type DisplayMsg =
  | { role: "user" | "assistant"; text: string }
  | { role: "system"; text: string }
  | { role: "warning"; text: string };

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
  leaveDelayMs?: number;
  warning?: { text: string; reason: string; count: number };
}

interface IdleResponse {
  messages: PacedMessage[];
  left: boolean;
  reason?: string;
  stay: boolean;
}

function nextIdleDelayMs(): number {
  return 45_000 + Math.floor(Math.random() * 45_000);
}

export function ChatWindow() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DisplayMsg[]>([]);
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");
  const [ended, setEnded] = useState(false);
  const [captchaOpen, setCaptchaOpen] = useState(false);
  // Unread counter — increments when a stranger message arrives while the tab is
  // hidden (user switched apps/tabs). Reflected in document.title so the user can
  // see "(2) unknown.chat" in their tab bar without needing OS notification permission.
  const [unread, setUnread] = useState(0);
  // OS desktop notifications — opt-in via the bell icon. Two pieces of state:
  //   - notifyPerm: browser-level permission (default | granted | denied)
  //   - notifyPref: user-level preference, only meaningful when permission is granted
  const [notifyPerm, setNotifyPerm] = useState<NotificationPermission>("default");
  const [notifyPref, setNotifyPref] = useState(false);
  const notifyPrefRef = useRef(false);
  // `mounted` flips to true after first client render — used to gate browser-only
  // UI (like the bell button) so SSR and initial client paint match. Without this
  // we hit React's "Hydration failed because the server rendered HTML didn't match"
  // since `"Notification" in window` is undefined on the server.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const timeoutsRef = useRef<number[]>([]);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const lastUserActivityRef = useRef<number>(Date.now());
  const idleTimerRef = useRef<number | null>(null);
  const replyInFlightRef = useRef<boolean>(false);
  const sessionIdRef = useRef<string | null>(null);
  const endedRef = useRef<boolean>(false);

  useEffect(() => { sessionIdRef.current = sessionId; }, [sessionId]);
  useEffect(() => { endedRef.current = ended; }, [ended]);

  // Sync the unread count into the tab title.
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.title = unread > 0 ? `(${unread}) unknown.chat` : "chat · unknown.chat";
  }, [unread]);

  // Reset unread when the tab regains focus.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVis = () => { if (!document.hidden) setUnread(0); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
    };
  }, []);

  useEffect(() => { notifyPrefRef.current = notifyPref; }, [notifyPref]);

  // Restore notification preference + permission state on mount.
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    setNotifyPerm(Notification.permission);
    try {
      const saved = localStorage.getItem("unknownchat:notify:v1");
      setNotifyPref(saved === "1");
    } catch { /* ignore */ }
  }, []);

  // Helper called whenever a stranger-side event happens (message or disconnect).
  // Increments the unread counter and (if user opted in) shows an OS notification —
  // both only when the tab is currently hidden.
  const bumpIfHidden = useCallback((body: string = "Stranger sent a message") => {
    if (typeof document === "undefined" || !document.hidden) return;
    setUnread(u => u + 1);

    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    if (!notifyPrefRef.current) return;
    try {
      const n = new Notification("unknown.chat", {
        body,
        icon: "/icon.svg",
        tag: "unknown-chat-msg", // collapses duplicate notifications
      });
      n.onclick = () => {
        window.focus();
        n.close();
      };
    } catch { /* ignore */ }
  }, []);

  async function toggleNotify() {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "denied") return; // can only change in browser settings

    if (Notification.permission === "default") {
      const result = await Notification.requestPermission();
      setNotifyPerm(result);
      if (result === "granted") {
        setNotifyPref(true);
        try { localStorage.setItem("unknownchat:notify:v1", "1"); } catch { /* ignore */ }
      }
      return;
    }

    // permission === "granted" — toggle the user-level preference
    setNotifyPref(prev => {
      const next = !prev;
      try { localStorage.setItem("unknownchat:notify:v1", next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  }

  const notifyActive = notifyPerm === "granted" && notifyPref;
  const notifyShow = mounted && typeof window !== "undefined" && "Notification" in window;
  const notifyTitle =
    notifyPerm === "denied"
      ? "notifications blocked in browser settings"
      : notifyActive
      ? "notifications on — click to mute"
      : notifyPerm === "granted"
      ? "notifications muted — click to enable"
      : "click to enable notifications";

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

  const playPacedMessages = useCallback((msgs: PacedMessage[]): number => {
    let cursor = 0;
    for (const m of msgs) {
      const startTyping = cursor + m.preTypingMs;
      const endTyping = cursor + m.preTypingMs + (m.totalMs - m.preTypingMs);
      schedule(() => setTyping(true), startTyping);
      schedule(() => {
        setTyping(false);
        pushMsg({ role: "assistant", text: m.text });
        bumpIfHidden();
      }, endTyping);
      cursor = endTyping;
    }
    return cursor;
  }, [pushMsg, schedule, bumpIfHidden]);

  const armIdleTimer = useCallback(() => {
    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current);
    }
    const delay = nextIdleDelayMs();
    idleTimerRef.current = window.setTimeout(async () => {
      idleTimerRef.current = null;
      const sid = sessionIdRef.current;
      if (!sid || endedRef.current || replyInFlightRef.current) {
        armIdleTimer();
        return;
      }
      const silenceMs = Date.now() - lastUserActivityRef.current;
      if (silenceMs < delay - 2_000) {
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
          bumpIfHidden("Stranger has disconnected");
          return;
        }
        if (!res.ok) {
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
            bumpIfHidden("Stranger has disconnected");
          }, total);
        } else {
          schedule(() => armIdleTimer(), total + 1_000);
        }
      } catch {
        armIdleTimer();
      } finally {
        schedule(() => { replyInFlightRef.current = false; }, 100);
      }
    }, delay);
  }, [playPacedMessages, pushMsg, schedule]);

  const connect = useCallback(async (captchaToken?: string) => {
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
        body: JSON.stringify({ prefs, captchaToken }),
      });
      if (res.status === 403) {
        const data = await res.json().catch(() => ({} as { code?: string }));
        const code = (data as { code?: string })?.code;
        if (code === "captcha_required" || code === "captcha_failed") {
          setCaptchaOpen(true);
          return;
        }
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
          bumpIfHidden();
        }, delayMs);
        openerEnd = delayMs;
      }
      schedule(() => armIdleTimer(), openerEnd + 500);
    } catch {
      pushMsg({ role: "system", text: "couldn't connect. try again." });
      setEnded(true);
    }
  }, [armIdleTimer, clearAllTimeouts, pushMsg, schedule, bumpIfHidden]);

  useEffect(() => {
    connect();
    return () => clearAllTimeouts();
  }, [connect, clearAllTimeouts]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  async function send() {
    const text = input.trim();
    if (!text || !sessionId || ended) return;

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
        bumpIfHidden();
        return;
      }
      if (res.status === 404) {
        pushMsg({ role: "system", text: "connection dropped. finding someone new..." });
        connect();
        return;
      }
      if (res.status === 451) {
        // Server-side content filter closed the session. Surface the specific
        // reason text the server returned so the user knows *why* (CSAM, drugs,
        // threats, repeat warnings, etc.) — no retries.
        const data = await res.json().catch(() => ({} as { closeText?: string }));
        const closeText =
          (data && (data as { closeText?: string }).closeText) ||
          "this chat has ended due to a content policy violation.";
        pushMsg({ role: "warning", text: closeText });
        setEnded(true);
        return;
      }
      if (res.status === 429) {
        pushMsg({ role: "system", text: "you're sending too fast. slow down a bit and try again." });
        return;
      }
      if (res.status === 503) {
        pushMsg({ role: "system", text: "the chat service is temporarily limited. please try again in a few minutes." });
        return;
      }
      if (!res.ok) {
        pushMsg({ role: "system", text: "something glitched. try sending again." });
        return;
      }

      const data = (await res.json()) as SendResponse;

      // First-offense warning: server kept the session alive but flagged the
      // message. Show the warning and don't expect a stranger reply.
      if (data.warning) {
        pushMsg({ role: "warning", text: data.warning.text });
        armIdleTimer();
        return;
      }

      if (data.left && data.messages.length === 0) {
        const delay = data.leaveDelayMs ?? 5_000;
        schedule(() => {
          pushMsg({ role: "system", text: `stranger has disconnected${data.reason ? ` (${data.reason})` : ""}.` });
          setEnded(true);
          bumpIfHidden("Stranger has disconnected");
        }, delay);
        return;
      }

      const total = playPacedMessages(data.messages);
      if (data.left) {
        schedule(() => {
          pushMsg({ role: "system", text: `stranger has disconnected${data.reason ? ` (${data.reason})` : ""}.` });
          setEnded(true);
          bumpIfHidden("Stranger has disconnected");
        }, total);
      } else {
        schedule(() => armIdleTimer(), total + 500);
      }
    } catch {
      pushMsg({ role: "system", text: "network hiccup. try again." });
    } finally {
      schedule(() => { replyInFlightRef.current = false; }, 200);
    }
  }

  function skip() {
    // If the chat has had real activity (any non-system message from either side),
    // confirm before disconnecting. Skipping right after connecting is fine — no prompt.
    if (sessionId && !ended) {
      const hasRealActivity = messages.some(m => m.role === "user" || m.role === "assistant");
      if (hasRealActivity) {
        const ok = window.confirm("are you sure you want to skip this stranger?");
        if (!ok) return;
      }
      pushMsg({ role: "system", text: "you skipped." });
    }
    clearAllTimeouts();
    setEnded(false);
    connect();
  }

  function onCaptchaSuccess(token: string) {
    setCaptchaOpen(false);
    connect(token);
  }

  function onCaptchaCancel() {
    setCaptchaOpen(false);
    pushMsg({ role: "system", text: "verification cancelled. tap 'new' or 'skip' when ready." });
    setEnded(true);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
        <Link href="/" className="font-semibold tracking-tight">unknown.chat</Link>
        <div className="text-xs text-neutral-400 flex items-center gap-3">
          {notifyShow && (
            <button
              type="button"
              onClick={toggleNotify}
              title={notifyTitle}
              disabled={notifyPerm === "denied"}
              className="hover:text-neutral-600 disabled:opacity-40 disabled:cursor-not-allowed"
              aria-pressed={notifyActive}
            >
              {notifyActive ? "🔔" : "🔕"}
            </button>
          )}
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

      {captchaOpen && TURNSTILE_SITE_KEY && (
        <CaptchaModal
          siteKey={TURNSTILE_SITE_KEY}
          onSuccess={onCaptchaSuccess}
          onCancel={onCaptchaCancel}
        />
      )}
    </div>
  );
}
