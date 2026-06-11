"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";
import { CaptchaModal } from "./CaptchaModal";
import { LookingView } from "./landing/LookingView";
import { MenuDrawer } from "./landing/MenuDrawer";
import { loadPrefs } from "@/lib/clientPrefs";
import { FeedbackPrompt } from "./FeedbackPrompt";
import { FollowPrompt } from "./FollowPrompt";

// Show the post-chat feedback prompt only for chats ≥ this long.
const FEEDBACK_MIN_MS = 5 * 60_000;
// Don't nudge again within this window after a submit/skip.
const FEEDBACK_COOLDOWN_MS = 7 * 24 * 60 * 60_000;
const FEEDBACK_KEY = "unknownchat:feedback:v1";

function feedbackAllowed(): boolean {
  try {
    const ts = Number(localStorage.getItem(FEEDBACK_KEY) || 0);
    return !ts || Date.now() - ts > FEEDBACK_COOLDOWN_MS;
  } catch {
    return false;
  }
}
function markFeedbackShown() {
  try {
    localStorage.setItem(FEEDBACK_KEY, String(Date.now()));
  } catch {
    /* ignore */
  }
}

// Instagram follow nudge — shown ONLY after SHORT (<5min) chats, i.e. the ones
// that don't get the feedback prompt. Escalating gate:
//   - "done"  → they clicked Follow. We can't read IG follow status (no API), so
//               a click is our best proxy: never ask again, ever.
//   - "bypass"→ count of times we showed it and they moved on WITHOUT following.
//               1st time (bypass 0): optional — they can dismiss / skip to next.
//               2nd time onward (bypass ≥1): GATED — the next chat is locked
//               behind a Follow click. One click anytime → "done" → never again.
const FOLLOW_DONE_KEY = "unknownchat:follow:done:v1";
const FOLLOW_BYPASS_KEY = "unknownchat:follow:bypass:v1";

function followAllowed(): boolean {
  try {
    return localStorage.getItem(FOLLOW_DONE_KEY) !== "1"; // ask until they click Follow once
  } catch {
    return false;
  }
}
function followBypassCount(): number {
  try {
    return Number(localStorage.getItem(FOLLOW_BYPASS_KEY) || 0);
  } catch {
    return 0;
  }
}
// 2nd+ showing → gate the next chat behind a Follow click.
function followGatedNow(): boolean {
  return followBypassCount() >= 1;
}
function markFollowClicked() {
  try {
    localStorage.setItem(FOLLOW_DONE_KEY, "1"); // permanent — don't ask a follower again
  } catch {
    /* ignore */
  }
}
function markFollowBypassed() {
  try {
    localStorage.setItem(FOLLOW_BYPASS_KEY, String(followBypassCount() + 1));
  } catch {
    /* ignore */
  }
}

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

type DisplayMsg =
  | { role: "user" | "assistant"; text: string }
  | { role: "system"; text: string }
  | { role: "warning"; text: string };

interface PacedMessage {
  text: string;
  preTypingMs: number;
  totalMs: number;
  // Optional pacing flavor from the server. "on_read" means we should NOT show
  // the typing indicator for most of preTypingMs — that's the "left you on read"
  // illusion. Older clients without this field fall back to the default behavior.
  mode?: "fast" | "normal" | "slow" | "on_read";
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
  const [showFeedback, setShowFeedback] = useState(false);
  const [showFollow, setShowFollow] = useState(false);
  // When true, the follow prompt is gated: the next chat is locked until they
  // click Follow (2nd+ short-chat nudge). Only applies to short (<5min) chats.
  const [followGated, setFollowGated] = useState(false);
  const chatStartRef = useRef<number>(0);
  const [captchaOpen, setCaptchaOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Last time the stranger was "active" — used by the context strip's last-seen
  // label. Updates when the typing indicator turns on or a new assistant message
  // arrives. Combined with the now-tick state below, the label drifts
  // "online" → "active 30s ago" → "active 2m ago" naturally over time.
  const [lastSeenAt, setLastSeenAt] = useState<number | null>(null);
  const [, setNowTick] = useState(0);
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

  // When a chat ends, ask for feedback if it was a real (≥5min) conversation and
  // we haven't nudged this visitor recently.
  useEffect(() => {
    if (!ended) return;
    if (chatStartRef.current <= 0) return; // no real chat happened
    const lasted = Date.now() - chatStartRef.current >= FEEDBACK_MIN_MS;
    if (lasted) {
      // Long enough chat → ask for a rating.
      if (feedbackAllowed()) setShowFeedback(true);
    } else if (followAllowed()) {
      // Short chat → no rating; nudge an Instagram follow instead. 2nd+ time gates.
      setFollowGated(followGatedNow());
      setShowFollow(true);
    }
  }, [ended]);

  const submitFeedback = useCallback((rating: number, text: string) => {
    markFeedbackShown();
    const sid = sessionIdRef.current;
    fetch("/api/chat/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId: sid, kind: "chat_rating", rating, text }),
      keepalive: true,
    }).catch(() => {
      /* feedback is best-effort */
    });
  }, []);

  const skipFeedback = useCallback(() => {
    markFeedbackShown(); // also suppress for the cooldown so we don't nag
    setShowFeedback(false);
  }, []);

  const followClicked = useCallback(() => {
    markFollowClicked(); // clicked Follow → never nudge again; unlocks the gate
    setShowFollow(false);
    setFollowGated(false);
  }, []);
  const dismissFollow = useCallback(() => {
    // Only reachable when NOT gated (the gated card hides dismiss). Counts as a
    // bypass so the NEXT short-chat nudge is gated.
    markFollowBypassed();
    setShowFollow(false);
  }, []);

  // Defensive iOS Safari fix.
  // The PrefsSheet / MenuDrawer modals lock body.overflow = 'hidden' while
  // open and restore it on close. If the page navigates while a modal is
  // open (e.g. PrefsSheet → /chat) the cleanup *should* run on unmount, but
  // there are corner cases (back/forward cache restore, fast double-tap of
  // "save & start") where the body stays locked. On iOS this prevents the
  // input from triggering the keyboard — tapping the field does nothing.
  // Unconditionally reset on every /chat mount + on every send/skip cycle.
  const inputRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    document.body.style.overflow = "";
  }, []);

  // Re-render every 10s while the chat is live so the last-seen label drifts
  // naturally ("just now" → "30s ago" → "2m ago"). Stops when the session
  // ends — the "stranger left" line is shown by separate branch and doesn't
  // need to keep ticking.
  useEffect(() => {
    if (ended || !sessionId) return;
    const id = window.setInterval(() => setNowTick(t => t + 1), 10_000);
    return () => window.clearInterval(id);
  }, [ended, sessionId]);

  // Bump lastSeenAt whenever the persona is "active" — typing indicator turns
  // on, or a new assistant message lands in the thread. These two signals
  // cover every moment the stranger is doing something, so the label resets
  // to "online" and starts drifting again.
  useEffect(() => {
    if (typing) setLastSeenAt(Date.now());
  }, [typing]);

  const assistantCount = messages.filter(m => m.role === "assistant").length;
  useEffect(() => {
    if (assistantCount > 0) setLastSeenAt(Date.now());
  }, [assistantCount]);

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
    for (let i = 0; i < msgs.length; i++) {
      const m = msgs[i];
      // "Cancelled mid-message" simulation: ~3% chance, BEFORE the real reply,
      // do a short typing burst that ends with no message — they started typing
      // then changed their mind. Only on the first burst of a turn (i === 0)
      // and only if there's enough preTypingMs to absorb a 4–8s phantom + gap.
      if (i === 0 && msgs.length > 0 && m.preTypingMs > 10_000 && Math.random() < 0.03) {
        const phantomStart = cursor + 1_000 + Math.floor(Math.random() * 2_000);
        const phantomEnd = phantomStart + 4_000 + Math.floor(Math.random() * 4_000);
        schedule(() => setTyping(true), phantomStart);
        schedule(() => setTyping(false), phantomEnd);
      }

      // "on_read" mode: skip the typing indicator for most of the silence, then
      // do a short typing burst right before delivery. This sells the "left you
      // on read for a minute, came back with a one-liner" feel.
      const isOnRead = m.mode === "on_read";
      const typingDurationMs = m.totalMs - m.preTypingMs;
      const onReadTypingStartOffset = isOnRead
        ? Math.max(0, m.preTypingMs - (2_500 + Math.floor(Math.random() * 4_000)))
        : 0;

      const startTyping = cursor + (isOnRead ? m.preTypingMs - (m.preTypingMs - onReadTypingStartOffset) : m.preTypingMs);
      const endTyping = cursor + m.totalMs;

      schedule(() => setTyping(true), isOnRead ? cursor + onReadTypingStartOffset : startTyping);

      // Typing flicker: ~25% chance, mid-typing, toggle indicator off for 1–3s
      // then back on. Real-person move (they started typing, paused, resumed).
      // Skip if the typing duration is too short for a noticeable flicker.
      const flickerWindowMs = isOnRead ? typingDurationMs : (endTyping - startTyping);
      if (flickerWindowMs > 5_000 && Math.random() < 0.25) {
        const flickerBase = isOnRead ? cursor + onReadTypingStartOffset : startTyping;
        const flickerOff = flickerBase + 1_000 + Math.floor(Math.random() * (flickerWindowMs * 0.4));
        const flickerOn = flickerOff + 1_000 + Math.floor(Math.random() * 2_000);
        schedule(() => setTyping(false), flickerOff);
        schedule(() => setTyping(true), flickerOn);
      }

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

  // Tell the server a chat ended from the client side (user skipped, or left the
  // page) so duration + summary analytics capture user-initiated exits — the
  // server otherwise only knows about ends it drives itself. Uses sendBeacon on
  // unload (survives teardown), falls back to fetch+keepalive. Safe to call
  // repeatedly; the server de-dupes per session.
  const notifyServerEnd = useCallback((reason: "skip" | "page_leave") => {
    const sid = sessionIdRef.current;
    if (!sid) return;
    const payload = JSON.stringify({ sessionId: sid, reason });
    try {
      if (typeof navigator !== "undefined" && navigator.sendBeacon) {
        navigator.sendBeacon(
          "/api/chat/end",
          new Blob([payload], { type: "application/json" }),
        );
        return;
      }
    } catch {
      /* fall through to fetch */
    }
    fetch("/api/chat/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {
      /* analytics must never break the UI */
    });
  }, []);

  // Live presence: while a chat is open, ping the server every ~20s so the
  // analytics dashboard can show "people chatting now". Fully async / non-blocking.
  useEffect(() => {
    if (!sessionId || ended) return;
    const beat = () => {
      fetch("/api/chat/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
        keepalive: true,
      }).catch(() => {
        /* presence is best-effort */
      });
    };
    beat(); // immediate, so a fresh chat shows up right away
    const id = window.setInterval(beat, 20_000);
    return () => window.clearInterval(id);
  }, [sessionId, ended]);

  // Beacon a chat-end when the user navigates away / closes the tab mid-chat.
  useEffect(() => {
    const onLeave = () => {
      if (sessionIdRef.current && !endedRef.current) notifyServerEnd("page_leave");
    };
    window.addEventListener("pagehide", onLeave);
    return () => window.removeEventListener("pagehide", onLeave);
  }, [notifyServerEnd]);

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
      chatStartRef.current = Date.now();
      setShowFeedback(false);
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
      // Record the abandoned session before we spin up a new one.
      notifyServerEnd("skip");

      // If this was a real (≥5min) chat we can still ask about, end HERE and show
      // the feedback prompt instead of jumping straight to a new stranger. The
      // user taps "find another" afterwards. Short chats skip straight through.
      const lasted =
        chatStartRef.current > 0 && Date.now() - chatStartRef.current >= FEEDBACK_MIN_MS;
      if (lasted && feedbackAllowed()) {
        clearAllTimeouts();
        pushMsg({ role: "system", text: "you skipped." });
        setEnded(true); // triggers the feedback prompt via the ended effect
        return;
      }

      // Short chat → nudge an Instagram follow instead of jumping straight to a
      // new stranger. End HERE so the ended effect shows the follow card; the
      // user taps "find another" afterwards.
      if (!lasted && followAllowed()) {
        clearAllTimeouts();
        pushMsg({ role: "system", text: "you skipped." });
        setEnded(true); // triggers the follow prompt via the ended effect
        return;
      }

      pushMsg({ role: "system", text: "you skipped." });
    }
    clearAllTimeouts();
    setEnded(false);
    connect();
  }

  // "find another" tap after a chat has ended. Enforces the follow gate.
  function findAnother() {
    if (showFollow && followGated) {
      // Gated: the next chat is locked until they click Follow. Ignore the tap.
      return;
    }
    if (showFollow) {
      // Ungated 1st-time nudge they're skipping past → count it so the next
      // short-chat nudge is gated.
      markFollowBypassed();
      setShowFollow(false);
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

  // Show the "finding someone awake" view only while we're between sessions
  // (no sessionId yet, not ended). The existing connect() flow seeds a
  // system "looking for a stranger…" message — we suppress that during the
  // looking state since the dedicated view replaces it.
  const looking = !sessionId && !ended;
  // Skip the seeded system message when rendering the actual chat thread.
  const threadMessages = messages.filter(
    m => !(m.role === "system" && m.text === "looking for a stranger..."),
  );

  return (
    <div className="min-h-screen flex flex-col max-w-md lg:max-w-2xl mx-auto w-full">
      {/* Header — wordmark + a live status pill (connected / disconnected /
          live). Kept compact to match the landing chrome. */}
      <header className="flex items-center justify-between px-5 pt-4 pb-2 flex-shrink-0">
        <Link
          href="/"
          className="wordmark-underline font-sans font-bold text-base tracking-[-0.025em] text-ink inline-flex items-baseline relative no-underline"
        >
          unknown
          <span className="text-red text-[19px] -translate-y-[2px]">.</span>
          chat
        </Link>
        <div className="flex items-center gap-2.5">
          {ended ? (
            <span className="bg-paper-warm text-ink-mute px-2 py-[2px] rounded-full font-sans text-[10px] font-bold border border-ink-faint uppercase tracking-wider">
              disconnected
            </span>
          ) : sessionId ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-[3px] bg-yellow border-[1.5px] border-ink rounded-full font-display text-[13px] text-ink font-bold -rotate-2 shadow-hard-xs">
              <span className="w-[5px] h-[5px] rounded-full bg-red live-blink" />
              connected
            </span>
          ) : null}
          {notifyShow && (
            <button
              type="button"
              onClick={toggleNotify}
              title={notifyTitle}
              disabled={notifyPerm === "denied"}
              className="text-ink-soft hover:text-ink disabled:opacity-40 disabled:cursor-not-allowed text-base"
              aria-pressed={notifyActive}
            >
              {notifyActive ? "🔔" : "🔕"}
            </button>
          )}
          <button
            onClick={() => setMenuOpen(true)}
            className="p-1 text-ink-soft hover:text-ink"
            aria-label="menu"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 6h14M3 10h14M3 14h14" />
            </svg>
          </button>
        </div>
      </header>

      {looking ? (
        <LookingView />
      ) : (
        <>
          {/* Context strip — stranger blob + connection age + (vibes pill
              when connected). Hidden during a chat that already ended;
              replaced with a simple "stranger left" line. */}
          <div className="flex items-center justify-between px-5 py-2.5 border-b-[1.5px] border-dashed border-paper-deep flex-shrink-0">
            <div className="flex items-center gap-2 font-display text-sm font-semibold text-ink">
              {ended ? (
                <span className="text-ink-mute">stranger left.</span>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1 bg-red text-paper-cool px-2 py-[1px] rounded-full font-sans text-[10px] font-bold -rotate-2">
                    <span className="w-[4px] h-[4px] rounded-full bg-paper-cool" />
                    stranger
                  </span>
                  <LastSeenLabel typing={typing} lastSeenAt={lastSeenAt} />
                </>
              )}
            </div>
            {!ended && (
              <Link
                href="/"
                className="bg-transparent border-[1.2px] border-ink px-2.5 py-[3px] rounded-full font-display text-[13px] font-bold text-ink"
                title="change your vibe"
              >
                vibes
              </Link>
            )}
          </div>

          {/* Thread */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-4 font-mono text-[13.5px] leading-[1.7]">
            {threadMessages.map((m, i) => (
              <MessageBubble key={i} role={m.role} text={m.text} />
            ))}
            {typing && <TypingIndicator />}
          </div>

          {/* Post-chat feedback — only after a real (≥5min) conversation. */}
          {ended && showFeedback && (
            <FeedbackPrompt onSubmit={submitFeedback} onSkip={skipFeedback} />
          )}

          {/* Short (<5min) chat → Instagram follow nudge instead of feedback.
              The link opens in a new tab, so the user stays on the chat page. */}
          {ended && showFollow && !showFeedback && (
            <FollowPrompt gated={followGated} onFollow={followClicked} onDismiss={dismissFollow} />
          )}

          {/* Input bar. z-50 ensures no fixed-positioned overlay (e.g. the
              global CookieBanner, which on mobile spans the bottom of the
              viewport) can sit on top and steal the user's taps. */}
          <div className="px-4 pt-3 pb-5 flex-shrink-0 relative z-50">
            <div
              // Tapping anywhere in the row focuses the actual input — fixes
              // an iOS bug where the first tap occasionally lands on the
              // wrapper rather than the input and the keyboard fails to open.
              onClick={() => {
                if (!ended && sessionId) inputRef.current?.focus();
              }}
              className="flex gap-1.5 items-center bg-paper-cool border-2 border-ink rounded-2xl p-[3px] shadow-hard-sm"
              style={{ touchAction: "manipulation" }}
            >
              <button
                onClick={e => { e.stopPropagation(); ended ? findAnother() : skip(); }}
                disabled={ended && showFollow && followGated}
                className={
                  ended
                    ? "bg-red text-paper-cool border-none rounded-[9px] px-3 py-2 font-sans text-xs font-bold tracking-tight shadow-hard-sm flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                    : "bg-transparent border-none px-2.5 py-2 rounded-[9px] font-display text-base font-bold text-ink-mute flex-shrink-0"
                }
                title={
                  ended && showFollow && followGated
                    ? "follow to unlock your next chat"
                    : ended ? "find another stranger" : "skip and find another"
                }
              >
                {ended ? "find another" : "skip"}
              </button>
              <input
                ref={inputRef}
                type="text"
                // iOS-friendly attribute set. enterKeyHint makes the keyboard's
                // return key read "send" on mobile; autoComplete off keeps
                // browser/autofill chrome out of the way; autoCapitalize and
                // autoCorrect match casual chat typing.
                enterKeyHint="send"
                inputMode="text"
                autoComplete="off"
                autoCapitalize="sentences"
                autoCorrect="on"
                spellCheck="true"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                disabled={ended || !sessionId}
                placeholder={ended ? "they left. tap 'find another'" : "type something…"}
                className="flex-1 bg-transparent border-none px-1 py-2 font-mono text-[13px] text-ink outline-none min-w-0 placeholder:font-serif placeholder:italic placeholder:text-ink-mute disabled:opacity-50"
              />
              {!ended && (
                <button
                  onClick={e => { e.stopPropagation(); send(); }}
                  disabled={!input.trim() || !sessionId}
                  className="bg-ink text-paper border-none rounded-[10px] px-3.5 py-2 font-sans text-xs font-bold tracking-tight flex-shrink-0 disabled:opacity-40"
                >
                  send
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {captchaOpen && TURNSTILE_SITE_KEY && (
        <CaptchaModal
          siteKey={TURNSTILE_SITE_KEY}
          onSuccess={onCaptchaSuccess}
          onCancel={onCaptchaCancel}
        />
      )}

      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}

// Tiny live-status label rendered in the chat context strip. Three states:
//   - typing → "typing…" (italic)
//   - within 10s of last activity → "online" (green dot accent)
//   - older → "active 30s ago" / "active 2m ago"
// Parent re-renders this on a 10s tick so the time-ago label stays accurate.
function LastSeenLabel({ typing, lastSeenAt }: { typing: boolean; lastSeenAt: number | null }) {
  if (typing) {
    return <span className="text-ink-soft italic font-serif">typing…</span>;
  }
  if (!lastSeenAt) {
    return <span className="text-ink-mute">online</span>;
  }
  const ageMs = Date.now() - lastSeenAt;
  if (ageMs < 10_000) {
    return (
      <span className="inline-flex items-center gap-1 text-you font-semibold">
        <span className="w-[5px] h-[5px] rounded-full bg-you" />
        online
      </span>
    );
  }
  return <span className="text-ink-mute font-normal">active {formatAge(ageMs)} ago</span>;
}

function formatAge(ms: number): string {
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  return `${Math.floor(ms / 3_600_000)}h`;
}
