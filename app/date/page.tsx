"use client";

// The AI Date experience. You walk INTO a situation: pick someone, pick a place,
// and you're on a first date — a real 15-minute conversation in a scene. When it
// ends, we score how the date went and hand you a shareable Dating Report.
//
// The date itself is FREE (no message meter); the full report is the paid unlock.
// Login is required before the date (decision: "login before the date").

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { TypingIndicator } from "@/components/TypingIndicator";
import { DateAvatar } from "@/components/date/DateAvatar";
import { SceneBackdrop } from "@/components/date/SceneBackdrop";
import { UpgradeAccount } from "@/components/match/UpgradeAccount";
import {
  matchApi,
  type DateConfig,
  type DatePersonaCard,
  type DateSceneCard,
  type DateStart,
} from "@/lib/matchApi";

type Phase = "loading" | "gate" | "pick" | "starting" | "dating" | "finishing";
type Msg = { role: "user" | "assistant"; content: string };

const tidy = (s: string) => s.replace(/\n{2,}/g, "\n").trim();
const MIN_USER_TURNS = 3;

export default function DatePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [cfg, setCfg] = useState<DateConfig | null>(null);
  const [anon, setAnon] = useState<boolean | null>(null);
  const [ageOk, setAgeOk] = useState(false);

  const [personaId, setPersonaId] = useState<string>("");
  const [sceneId, setSceneId] = useState<string>("");

  const [date, setDate] = useState<DateStart | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [timeUp, setTimeUp] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  // Load picker config + login state.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [config, me] = await Promise.all([matchApi.dateConfig(), matchApi.me().catch(() => null)]);
        if (!alive) return;
        setCfg(config);
        const isAnon = me?.isAnonymous ?? true;
        setAnon(isAnon);
        setPhase(isAnon ? "gate" : "pick");
      } catch {
        if (alive) setErr("couldn't load. refresh?");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Countdown while dating.
  useEffect(() => {
    if (phase !== "dating" || !date?.endsAt) return;
    const end = new Date(date.endsAt).getTime();
    const tick = () => {
      const left = Math.max(0, Math.round((end - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) setTimeUp(true);
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [phase, date?.endsAt]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, typing]);

  const persona = cfg?.personas.find((p) => p.id === personaId) ?? null;
  const scenesFor = (p: DatePersonaCard | null): DateSceneCard[] => cfg?.scenes ?? [];
  const userTurns = msgs.filter((m) => m.role === "user").length;

  async function startDate() {
    if (!personaId) return;
    setPhase("starting");
    setErr(null);
    try {
      const d = await matchApi.startDate({ personaId, sceneId: sceneId || undefined });
      setDate(d);
      setMsgs([{ role: "assistant", content: tidy(d.opener) }]);
      setPhase("dating");
    } catch (e) {
      const m = (e as { code?: string; message?: string });
      if (m.code === "LOGIN_REQUIRED") {
        setAnon(true);
        setPhase("gate");
      } else {
        setErr("couldn't start the date. try again?");
        setPhase("pick");
      }
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || sending || !date) return;
    setInput("");
    setMsgs((m) => [...m, { role: "user", content: text }]);
    setSending(true);
    setTyping(true);
    try {
      const res = await matchApi.send(date.conversationId, text);
      if (res.reply) setMsgs((m) => [...m, { role: "assistant", content: tidy(res.reply!) }]);
      else if (res.warning?.text) setMsgs((m) => [...m, { role: "assistant", content: res.warning!.text }]);
    } catch {
      setErr("message didn't send — try again");
    } finally {
      setTyping(false);
      setSending(false);
    }
  }

  async function endDate() {
    if (!date || phase === "finishing") return;
    if (userTurns < MIN_USER_TURNS) {
      setErr(`talk a little more first — at least ${MIN_USER_TURNS} messages so we can score it 🙂`);
      return;
    }
    setPhase("finishing");
    setErr(null);
    try {
      const { resultId } = await matchApi.finishDate({
        conversationId: date.conversationId,
        personaId: date.persona.id,
        sceneId: date.scene.id,
        language: date.language,
        messages: msgs,
      });
      router.push(`/date/report/${resultId}`);
    } catch (e) {
      const m = e as { message?: string };
      setErr(m.message || "couldn't build the report — try again");
      setPhase("dating");
    }
  }

  // ── Render ──
  if (phase === "loading") {
    return <Centered><p className="font-serif italic text-ink-mute">setting the scene…</p></Centered>;
  }

  if (phase === "gate") {
    return (
      <Centered>
        <div className="w-full max-w-sm text-center">
          <div className="text-4xl mb-2">💘</div>
          <h1 className="font-display text-2xl text-ink mb-1">before your date…</h1>
          <p className="font-serif italic text-ink-mute mb-5">log in so we can save your date &amp; your report.</p>
          <UpgradeAccount forceShow title="log in to start your date" subtitle="takes a sec — then you're in 💫" onDone={() => window.location.reload()} />
        </div>
      </Centered>
    );
  }

  if (phase === "pick" || phase === "starting") {
    return (
      <div className="min-h-full w-full overflow-y-auto px-4 py-8">
        <div className="mx-auto w-full max-w-2xl">
          <div className="text-center mb-6">
            <div className="text-3xl mb-1">💘</div>
            <h1 className="font-display text-3xl text-ink">an AI date</h1>
            <p className="font-serif italic text-ink-mute mt-1">
              a real first date with someone new. ~15 minutes. at the end, your Dating Report.
            </p>
          </div>

          {err && <p className="text-center text-red text-sm font-sans mb-3">{err}</p>}

          {/* Step 1 — who */}
          <h2 className="font-sans text-xs font-bold uppercase tracking-wide text-ink-mute mb-2">1 · who are you meeting?</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {cfg?.personas.map((p) => {
              const active = p.id === personaId;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setPersonaId(p.id);
                    setSceneId(p.defaultSceneId);
                  }}
                  className={`text-left rounded-2xl border-2 p-3 transition ${
                    active ? "border-ink bg-paper-cool shadow-hard" : "border-ink/30 bg-paper-warm hover:border-ink shadow-hard-xs"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <DateAvatar avatarId={p.avatarId} size={44} />
                    <div className="min-w-0">
                      <div className="font-sans text-sm font-bold text-ink truncate">{p.name}, {p.age}</div>
                      <div className="font-serif italic text-[11px] text-[#8b6fb8] truncate">{p.occupation}</div>
                    </div>
                  </div>
                  <p className="font-mono text-[11px] leading-snug text-ink-soft line-clamp-3">{p.blurb}</p>
                </button>
              );
            })}
          </div>

          {/* Step 2 — where */}
          <h2 className="font-sans text-xs font-bold uppercase tracking-wide text-ink-mute mb-2">2 · where?</h2>
          <div className="flex flex-wrap gap-2 mb-6">
            {scenesFor(persona).map((s) => {
              const active = s.id === sceneId;
              return (
                <button
                  key={s.id}
                  onClick={() => setSceneId(s.id)}
                  className={`rounded-full border-2 px-3 py-1.5 font-sans text-[12px] font-bold transition ${
                    active ? "border-ink bg-lilac text-ink shadow-hard-xs" : "border-ink/30 bg-paper-warm text-ink-soft hover:border-ink"
                  }`}
                >
                  <span className="mr-1">{s.emoji}</span>
                  {s.location} · {s.time}
                </button>
              );
            })}
          </div>

          {/* 18+ + start */}
          <label className="flex items-center gap-2 justify-center mb-4 cursor-pointer select-none">
            <input type="checkbox" checked={ageOk} onChange={(e) => setAgeOk(e.target.checked)} className="h-4 w-4 accent-red" />
            <span className="font-serif italic text-sm text-ink-mute">i&apos;m 18 or older &amp; here for a sweet, respectful date</span>
          </label>

          <button
            onClick={startDate}
            disabled={!personaId || !ageOk || phase === "starting"}
            className="mx-auto block rounded-full border-2 border-ink bg-red px-8 py-3 font-sans text-sm font-bold text-paper-cool shadow-hard hover:shadow-hard-lg disabled:opacity-40 disabled:shadow-hard-xs transition"
          >
            {phase === "starting" ? "walking in…" : persona ? `start the date with ${persona.name} →` : "pick someone first"}
          </button>
        </div>
      </div>
    );
  }

  // dating / finishing
  const name = date?.persona.name ?? "them";
  const mm = remaining != null ? Math.floor(remaining / 60) : null;
  const ss = remaining != null ? String(remaining % 60).padStart(2, "0") : null;

  return (
    <div className="relative flex flex-col h-full w-full">
      {date && <SceneBackdrop theme={date.scene.visualTheme} />}

      <header className="relative z-10 flex items-center gap-2.5 px-4 py-3 border-b-[1.5px] border-dashed border-ink/40 flex-shrink-0 bg-paper-cool/70 backdrop-blur-sm">
        {date && <DateAvatar avatarId={date.persona.avatarId} size={38} />}
        <div className="min-w-0 flex-1">
          <div className="font-sans text-sm font-bold text-ink truncate">{name}</div>
          <div className="font-serif italic text-[12px] text-[#8b6fb8] truncate">
            {date?.scene.emoji} {date?.scene.location} · {date?.scene.time}
          </div>
        </div>
        {mm != null && (
          <span className={`font-mono text-[12px] font-bold rounded-full border-[1.5px] border-ink px-2.5 py-1 ${timeUp ? "bg-red text-paper-cool" : "bg-paper-cool text-ink"}`}>
            {timeUp ? "time's up" : `${mm}:${ss}`}
          </span>
        )}
        <button
          onClick={endDate}
          disabled={phase === "finishing"}
          className="flex-shrink-0 rounded-full border-[1.5px] border-ink bg-yellow px-3 py-1.5 font-sans text-[12px] font-bold text-ink shadow-hard-xs hover:bg-yellow-soft disabled:opacity-50"
        >
          {phase === "finishing" ? "scoring…" : "end date"}
        </button>
      </header>

      <div ref={scrollRef} className="relative z-10 flex-1 min-h-0 overflow-y-auto px-5 py-4 flex flex-col">
        <div className="mt-auto">
          {msgs.map((m, i) => (
            <div key={i} className="mb-2 font-mono text-[13.5px] leading-[1.7] break-words">
              <span className={`font-semibold mr-1.5 ${m.role === "user" ? "text-you" : "text-stranger"}`}>
                {m.role === "user" ? "you" : name.toLowerCase()}:
              </span>
              <span className="text-ink whitespace-pre-wrap">{m.content}</span>
            </div>
          ))}
          {typing && <TypingIndicator />}
          {timeUp && phase === "dating" && (
            <p className="text-center font-serif italic text-ink-mute mt-4">
              your time&apos;s up 💫 wrap it up &amp; tap <b>end date</b> for your report.
            </p>
          )}
        </div>
      </div>

      {err && <p className="relative z-10 text-center text-red text-[12px] font-sans pb-1">{err}</p>}

      <div className="relative z-10 px-4 pt-3 pb-5 flex-shrink-0">
        <div
          onClick={() => document.getElementById("date-input")?.focus()}
          className="flex gap-1.5 items-center bg-paper-cool border-2 border-ink rounded-2xl p-[3px] shadow-hard-sm"
        >
          <input
            id="date-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={`say something to ${name}…`}
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
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex items-center justify-center min-h-full w-full px-4 py-10">{children}</div>;
}
