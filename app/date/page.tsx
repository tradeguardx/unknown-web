"use client";

// The AI Date experience — a multi-step situation, not a chatbot:
//   prefs → pick your date → pick the place → anticipation → the date (text/voice)
//   → the ending (she decides) → sign up → your Dating Report.
//
// No signup to start dating; signup happens at the ending, to read the report.
// The date is free — the full report is the paid unlock.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { matchApi, type DateConfig, type DateStart } from "@/lib/matchApi";
import { Preferences, type YouAre, type MeetPref, type AgeBand } from "@/components/date/steps/Preferences";
import { CharacterPicker } from "@/components/date/steps/CharacterPicker";
import { ScenePicker, type SceneControls } from "@/components/date/steps/ScenePicker";
import { Anticipation } from "@/components/date/steps/Anticipation";
import { TextDate, type DateMsg } from "@/components/date/steps/TextDate";
import { VoiceDate } from "@/components/date/steps/VoiceDate";
import { Ending } from "@/components/date/steps/Ending";
import { UpgradeAccount } from "@/components/match/UpgradeAccount";
import { ageForBand } from "@/lib/experiences/personas";
import { detectCountry } from "@/lib/geo";

// US / Canada / Europe (+ UK, AU, NZ) pay the higher tier; everyone else lower.
const WEST = new Set([
  "US", "CA", "GB", "IE", "AU", "NZ",
  "DE", "FR", "IT", "ES", "NL", "SE", "NO", "DK", "FI", "BE", "AT", "CH", "PT",
  "PL", "CZ", "GR", "HU", "RO", "SK", "BG", "HR", "SI", "LT", "LV", "EE", "LU",
]);

type Phase =
  | "loading" | "prefs" | "characters" | "scene" | "anticipation" | "authgate"
  | "text" | "voice" | "ending" | "error";

const tidy = (s: string) => s.replace(/\n{2,}/g, "\n").trim();

export default function DatePage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading");
  const [cfg, setCfg] = useState<DateConfig | null>(null);

  const [you, setYou] = useState<YouAre | null>(null);
  const [meet, setMeet] = useState<MeetPref | null>(null);
  const [ageBand, setAgeBand] = useState<AgeBand | null>(null);
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [sceneId, setSceneId] = useState<string | null>(null);
  const [controls, setControls] = useState<SceneControls>({ weather: "snow", time: "evening", sound: true });

  const [date, setDate] = useState<DateStart | null>(null);
  const [messages, setMessages] = useState<DateMsg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState(false);
  const [starting, setStarting] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [timeUp, setTimeUp] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [endPhase, setEndPhase] = useState<"deciding" | "gate" | "error">("deciding");
  const [endErr, setEndErr] = useState<string | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);
  const anonRef = useRef<boolean>(true);

  // Voice is free for the first 7 minutes; then pay (2-day pass / monthly) or drop
  // to text. Paid users (active pass or subscription) are never capped.
  const [paid, setPaid] = useState(false);
  const [voiceSec, setVoiceSec] = useState(0);
  const [prices, setPrices] = useState({ pass: "$1.99", monthly: "$4.99" });
  const VOICE_FREE_SEC = 7 * 60;
  const voiceCapped = !paid && voiceSec >= VOICE_FREE_SEC;

  useEffect(() => {
    detectCountry()
      .then((cc) => setPrices(WEST.has((cc || "").toUpperCase()) ? { pass: "$2.99", monthly: "$8.99" } : { pass: "$1.99", monthly: "$4.99" }))
      .catch(() => {});
  }, []);

  // Load config + login state.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [config, me] = await Promise.all([matchApi.dateConfig(), matchApi.me().catch(() => null)]);
        if (!alive) return;
        setCfg(config);
        anonRef.current = me?.isAnonymous ?? true;
        setPaid(!!(me?.subscription?.active || me?.pass?.active));
        // Step 0 (you / interested-in / age) ALWAYS comes first — we can't cast the
        // roster without it. We just PRE-FILL a returning user's last choices so
        // it's a single tap to continue, never a blank form.
        try {
          const saved = JSON.parse(localStorage.getItem("uc:datePrefs") || "null") as
            | { you?: YouAre; meet?: MeetPref; ageBand?: AgeBand }
            | null;
          if (saved?.you) setYou(saved.you);
          if (saved?.meet) setMeet(saved.meet);
          if (saved?.ageBand) setAgeBand(saved.ageBand);
        } catch { /* ignore */ }
        // Returning from an auth redirect (e.g. Google) mid-flow? Restore the
        // exact persona/scene they'd picked and drop them back on the ready screen.
        if (!(me?.isAnonymous ?? true)) {
          try {
            const pend = JSON.parse(localStorage.getItem("uc:datePending") || "null") as
              | { personaId?: string; sceneId?: string; controls?: SceneControls }
              | null;
            if (pend?.personaId) {
              setPersonaId(pend.personaId);
              if (pend.sceneId) setSceneId(pend.sceneId);
              if (pend.controls) setControls(pend.controls);
              localStorage.removeItem("uc:datePending");
              setPhase("anticipation");
              return;
            }
          } catch { /* ignore */ }
        }
        setPhase("prefs");
      } catch {
        if (alive) setPhase("error");
      }
    })();
    return () => { alive = false; };
  }, []);

  // Countdown during the date.
  useEffect(() => {
    if ((phase !== "text" && phase !== "voice") || !date?.endsAt) return;
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

  // The full date is up (20 min) → wrap it automatically into the report.
  useEffect(() => {
    if (timeUp && (phase === "text" || phase === "voice")) endDate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUp]);

  // Count voice minutes (free for the first 7) while on the call.
  useEffect(() => {
    if (phase !== "voice" || paid) return;
    const iv = setInterval(() => setVoiceSec((s) => s + 1), 1000);
    return () => clearInterval(iv);
  }, [phase, paid]);

  async function getPass(kind: "daypass" | "subscription") {
    try {
      const here = window.location.href;
      const { checkoutUrl } = await matchApi.checkout(kind, { successUrl: here, cancelUrl: here });
      window.location.href = checkoutUrl;
    } catch {
      window.location.href = "/plus";
    }
  }

  const card = cfg?.personas.find((p) => p.id === personaId) ?? null;
  const sceneCard = cfg?.scenes.find((s) => s.id === sceneId) ?? null;
  const userTurns = messages.filter((m) => m.role === "user").length;
  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant")?.content ?? "";

  function pickPersona(id: string) {
    setPersonaId(id);
    const p = cfg?.personas.find((x) => x.id === id);
    const sc = cfg?.scenes.find((s) => s.id === p?.defaultSceneId) ?? cfg?.scenes[0];
    if (sc) {
      setSceneId(sc.id);
      setControls({ weather: sc.weather, time: sc.time, sound: sc.sound });
    }
  }

  function pickScene(id: string) {
    setSceneId(id);
    const sc = cfg?.scenes.find((s) => s.id === id);
    if (sc) setControls((c) => ({ ...c, weather: sc.weather, time: sc.time }));
  }

  // Tapped "start the date" — log in / sign up FIRST if needed, then begin. We
  // stash the exact selection so an auth redirect (Google) lands them right back.
  function beginDate() {
    if (!personaId || !sceneId) return;
    if (anonRef.current) {
      try { localStorage.setItem("uc:datePending", JSON.stringify({ personaId, sceneId, controls })); } catch { /* ignore */ }
      setPhase("authgate");
    } else {
      startDate();
    }
  }

  async function onAuthed() {
    try { const me = await matchApi.me(); anonRef.current = me.isAnonymous; } catch { /* ignore */ }
    try { localStorage.removeItem("uc:datePending"); } catch { /* ignore */ }
    if (!anonRef.current) startDate();
    else setPhase("anticipation"); // still anon (shouldn't happen) — send them back
  }

  async function startDate() {
    if (!personaId || !sceneId) return;
    setStarting(true);
    try {
      const d = await matchApi.startDate({ personaId, sceneId, weather: controls.weather, time: controls.time, age: ageForBand(personaId, ageBand) });
      setDate(d);
      setMessages([{ role: "assistant", content: tidy(d.opener) }]);
      setRemaining(d.durationSec); // initialise the clock before the first tick
      setTimeUp(false);
      setPhase("voice"); // the date opens as a call; user can drop to text anytime
    } catch {
      setNotice("couldn't start the date — try again");
      setPhase("anticipation");
    } finally {
      setStarting(false);
    }
  }

  async function sendText(text: string) {
    const t = text.trim();
    if (!t || sending || !date) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: t }]);
    setSending(true);
    setTyping(true);
    try {
      const res = await matchApi.send(date.conversationId, t);
      const reply = res.reply ? tidy(res.reply) : res.warning?.text ?? "";
      if (reply) {
        // Text: a human-like typing beat. Voice/call: reply the instant she's ready.
        if (phase !== "voice") {
          const delay = Math.min(2200, 500 + reply.length * 14);
          await new Promise((r) => setTimeout(r, delay));
        }
        setMessages((m) => [...m, { role: "assistant", content: reply }]);
      }
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "…sorry, say that again?" }]);
    } finally {
      setTyping(false);
      setSending(false);
    }
  }
  const send = () => sendText(input);

  async function endDate() {
    if (!date) return;
    const elapsedSec = date.durationSec - (remaining ?? date.durationSec);
    // A real read needs a real conversation: ~10 min of discussion (or a long
    // text chat). Below that, keep them in the date rather than a thin report.
    const enough = elapsedSec >= 10 * 60 || userTurns >= 12;
    if (!enough && !timeUp) {
      setNotice(`talk a bit longer — a real read needs ~10 minutes together 🙂`);
      setTimeout(() => setNotice(null), 3500);
      return;
    }
    setPhase("ending");
    setEndPhase("deciding");
    try {
      const { resultId: rid } = await matchApi.finishDate({
        conversationId: date.conversationId,
        personaId: date.persona.id,
        sceneId: date.scene.id,
        language: date.language,
        age: date.persona.age,
        elapsedSec,
        messages,
      });
      setResultId(rid);
      // small beat so the "deciding" moment lands
      await new Promise((r) => setTimeout(r, 1200));
      if (anonRef.current) setEndPhase("gate");
      else router.push(`/date/report/${rid}`);
    } catch (e) {
      setEndErr((e as { message?: string })?.message ?? "something went wrong");
      setEndPhase("error");
    }
  }

  const leave = () => router.push("/");

  // ── render ──
  if (phase === "loading") {
    return <div className="flex min-h-[100dvh] items-center justify-center"><p className="font-display italic text-ink-mute">setting the scene…</p></div>;
  }
  if (phase === "error" || !cfg) {
    return <div className="flex min-h-[100dvh] items-center justify-center"><p className="font-display italic text-red">couldn&apos;t load. refresh?</p></div>;
  }

  if (phase === "prefs") {
    return (
      <Preferences
        cfg={cfg} you={you} meet={meet} ageBand={ageBand}
        onYou={setYou} onMeet={setMeet} onAge={setAgeBand}
        onNext={() => {
          try { localStorage.setItem("uc:datePrefs", JSON.stringify({ you, meet, ageBand })); } catch { /* ignore */ }
          setPhase("characters");
        }}
        onLeave={leave}
      />
    );
  }

  if (phase === "characters") {
    return (
      <CharacterPicker
        cfg={cfg} meet={meet} ageBand={ageBand} selectedId={personaId}
        onSelect={pickPersona} onNext={() => personaId && setPhase("scene")} onLeave={leave}
      />
    );
  }

  if (phase === "scene" && card) {
    return (
      <ScenePicker
        cfg={cfg} personaName={card.name} personaEmoji={sceneCard?.emoji ?? "💘"}
        sceneId={sceneId} controls={controls} onScene={pickScene} onControls={setControls}
        onNext={() => sceneId && setPhase("anticipation")}
        onChangePersona={() => setPhase("characters")} onLeave={leave}
      />
    );
  }

  if (phase === "anticipation" && card && sceneCard) {
    return <Anticipation card={card} scene={sceneCard} controls={controls} age={ageForBand(card.id, ageBand)} onStart={beginDate} starting={starting} />;
  }

  if (phase === "authgate" && card) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm text-center">
          <div className="text-4xl mb-2">💘</div>
          <h1 className="font-display text-2xl text-ink mb-1">before you meet {card.name}…</h1>
          <p className="font-serif italic text-ink-mute mb-4">log in or sign up — you&apos;ll drop right back into the date, same spot.</p>
          <div className="rounded-2xl border-2 border-ink bg-paper-cool p-4 shadow-hard">
            <UpgradeAccount forceShow title={`meet ${card.name}`} subtitle="takes a few seconds · then you're in" onDone={onAuthed} />
          </div>
          <button onClick={() => setPhase("anticipation")} className="mt-3 font-sans text-[12px] font-bold text-ink-mute underline">← back</button>
        </div>
      </div>
    );
  }

  if (phase === "text" && card && date) {
    return (
      <TextDate
        card={card} date={date} controls={controls} messages={messages} typing={typing}
        remaining={remaining} durationSec={date.durationSec} timeUp={timeUp}
        input={input} sending={sending} onInput={setInput} onSend={send} onOpener={sendText}
        onEnd={endDate} onSwitchVoice={() => setPhase("voice")} onLeave={leave} notice={notice}
      />
    );
  }

  if (phase === "voice" && card && date) {
    return (
      <VoiceDate
        card={card} date={date} controls={controls} remaining={remaining} timeUp={timeUp}
        lastLine={lastAssistant} thinking={typing} onUserSpeech={sendText}
        onBackToText={() => setPhase("text")} onEnd={endDate} onLeave={leave}
        capped={voiceCapped} onGetPass={getPass} prices={prices}
      />
    );
  }

  if (phase === "ending" && card && date) {
    return (
      <Ending
        card={card} date={date} phase={endPhase} errorMessage={endErr}
        onSignedUp={() => resultId && router.push(`/date/report/${resultId}`)}
        onRetry={endDate}
      />
    );
  }

  return null;
}
