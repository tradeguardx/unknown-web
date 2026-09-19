"use client";

// The voice date — a REAL call. ElevenLabs Conversational AI runs the whole
// duplex loop (mic capture, turn-taking, barge-in, the LLM reply, and her
// speaking) over one live connection, so it feels like a phone call rather than
// walkie-talkie. One shared agent is personalized per call via server-minted
// overrides (spoken prompt + opener + her voice).
//
// Flow: ring → connect (signed URL + overrides) → she picks up and speaks the
// opener → you just talk, interrupting freely → each final turn is reported up
// (onTurn) so the report is built from the real transcript. The 7-min free
// window + the 20-min date clock are enforced by the parent; when the window is
// up we end the live session and show the paywall.

import { useConversation } from "@elevenlabs/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { DarkStage } from "../DarkStage";
import { StripePhoto } from "../StripePhoto";
import { AmbientAudio } from "../AmbientAudio";
import { LeaveButton } from "../LeaveButton";
import { matchApi } from "@/lib/matchApi";
import type { DatePersonaCard, DateStart } from "@/lib/matchApi";
import type { SceneControls } from "./ScenePicker";

interface Props {
  card: DatePersonaCard;
  date: DateStart;
  controls: SceneControls;
  remaining: number | null;
  timeUp: boolean;
  age?: number;
  onTurn: (role: "user" | "assistant", content: string) => void; // report each final turn up
  onBackToText: () => void;
  onEnd: () => void;
  onLeave: () => void;
  capped?: boolean; // 7 free voice minutes used → paywall
  onGetPass?: (kind: "daypass" | "subscription") => void;
  onCapped?: () => void; // server said the free window is up
  prices?: { pass: string; monthly: string };
  ending?: boolean;
}

const WEATHER_WORD: Record<string, string> = { snow: "snowing", rain: "raining", storm: "storming", fog: "foggy", clear: "clear" };
const BAR_COLORS = ["#e64a3a", "#f5d967", "#b89dd4", "#5fa39a", "#e64a3a", "#f5d967", "#b89dd4", "#5fa39a", "#e64a3a", "#f5d967", "#b89dd4"];

// A soft two-beat phone ringback via Web Audio (no asset needed).
function playRingback(): () => void {
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return () => {};
    const ctx = new Ctx();
    const ring = (start: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 470;
      o.connect(g); g.connect(ctx.destination);
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.05, start + 0.06);
      g.gain.setValueAtTime(0.05, start + 0.8);
      g.gain.linearRampToValueAtTime(0, start + 0.95);
      o.start(start); o.stop(start + 1);
    };
    const t0 = ctx.currentTime + 0.05;
    ring(t0); ring(t0 + 1.4);
    return () => { try { ctx.close(); } catch {} };
  } catch {
    return () => {};
  }
}

function MicPulse() {
  return (
    <span className="relative inline-flex h-4 w-4 items-center justify-center align-middle">
      <span className="absolute inline-flex h-full w-full rounded-full bg-teal/50 animate-ping" />
      <span className="absolute inline-flex h-2/3 w-2/3 rounded-full bg-teal/70 animate-ping" style={{ animationDelay: "0.3s" }} />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal" />
    </span>
  );
}

export function VoiceDate({ card, date, controls, remaining, timeUp, age, onTurn, onBackToText, onEnd, onLeave, capped, onGetPass, onCapped, prices, ending }: Props) {
  const scene = date.scene;
  const [muted, setMuted] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [ringing, setRinging] = useState(true);
  const [caption, setCaption] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [micDenied, setMicDenied] = useState(false);

  const startedRef = useRef(false);
  const endedRef = useRef(false);
  const lastTurnRef = useRef<string>(""); // dedupe consecutive identical messages
  const mm = remaining != null ? Math.floor(remaining / 60) : null;
  const ss = remaining != null ? String(remaining % 60).padStart(2, "0") : null;
  const weatherWord = WEATHER_WORD[controls.weather] ?? controls.weather;

  const onMessage = useCallback((props: { message: string; source: string }) => {
    const text = (props?.message ?? "").trim();
    if (!text) return;
    const role: "user" | "assistant" = props.source === "user" ? "user" : "assistant";
    const key = `${role}:${text}`;
    if (key === lastTurnRef.current) return; // drop exact repeats
    lastTurnRef.current = key;
    if (role === "assistant") setCaption(text);
    onTurn(role, text);
  }, [onTurn]);

  const conversation = useConversation({
    onConnect: () => { setRinging(false); },
    onDisconnect: () => {},
    onMessage,
    onError: (e: unknown) => {
      setVoiceError(typeof e === "string" ? e : "voice unavailable right now");
    },
  });

  const status = conversation.status; // "disconnected" | "connecting" | "connected"
  const isSpeaking = conversation.isSpeaking;
  const connected = status === "connected";

  const endSession = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    try { conversation.endSession(); } catch {/* already closed */}
  }, [conversation]);

  // Ring first, then connect — a call-like intro. Start the live session once.
  useEffect(() => {
    const stopRing = playRingback();
    const ringTimer = setTimeout(() => setRinging(false), 2400);

    (async () => {
      if (startedRef.current) return;
      startedRef.current = true;
      try {
        const token = await matchApi.accessToken().catch(() => null);
        const res = await fetch("/api/date/voice-session", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          body: JSON.stringify({
            conversationId: date.conversationId,
            personaId: date.persona.id,
            sceneId: date.scene.id,
            language: date.language,
            age: age ?? date.persona.age,
            weather: controls.weather,
            time: controls.time,
            opener: date.opener,
          }),
        });
        if (res.status === 402) { onCapped?.(); return; }        // free window already used
        if (res.status === 501) { onBackToText(); return; }      // calling not configured → stay in text
        if (!res.ok) { setVoiceError("couldn't connect the call"); return; }
        const data = await res.json();
        await conversation.startSession({
          signedUrl: data.signedUrl,
          connectionType: "websocket",
          overrides: data.overrides,
        });
      } catch (e: any) {
        if (e?.name === "NotAllowedError" || /permission|denied/i.test(String(e?.message))) setMicDenied(true);
        else setVoiceError("couldn't start the call");
      }
    })();

    return () => { clearTimeout(ringTimer); stopRing(); endSession(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mute her voice (output) without dropping the call.
  useEffect(() => {
    try { conversation.setVolume?.({ volume: muted ? 0 : 1 }); } catch {/* not ready */}
  }, [muted, conversation, connected]);

  // Out of free voice minutes → end the live call and reveal the paywall.
  useEffect(() => {
    if (capped) endSession();
  }, [capped, endSession]);

  const uiStatus = ringing ? "ringing" : !connected ? "connecting" : isSpeaking ? "speaking" : "listening";

  return (
    <DarkStage theme={scene.darkTheme} ambience={{ sceneId: scene.id, weather: controls.weather }}>
      <AmbientAudio src={scene.ambientAudio} enabled={controls.sound && !muted && !capped} volume={isSpeaking ? 0.16 : 0.5} />

      {/* 7-minute voice paywall */}
      {capped && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border-2 border-ink bg-paper-cool p-5 text-center shadow-hard-lg">
            <div className="text-3xl mb-1">💛</div>
            <h3 className="font-display text-2xl text-ink">7 free voice minutes, done</h3>
            <p className="mt-1 mb-4 font-serif italic text-[14px] text-ink-mute">
              keep talking to {card.name} by voice — or drop back to text, always free.
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={() => onGetPass?.("daypass")} className="om-cta flex flex-col items-center rounded-xl border-2 border-ink bg-red px-3 py-3 text-paper-cool shadow-hard-xs">
                <span className="font-sans text-sm font-bold">2-day pass</span>
                <span className="font-sans text-lg font-bold">{prices?.pass ?? "$2"}</span>
                <span className="font-display text-[12px] opacity-90">unlimited voice · 2 days</span>
              </button>
              <button onClick={() => onGetPass?.("subscription")} className="om-cta flex flex-col items-center rounded-xl border-2 border-ink bg-ink px-3 py-3 text-paper-cool">
                <span className="font-sans text-sm font-bold">monthly</span>
                <span className="font-sans text-lg font-bold">{prices?.monthly ?? "$4.99"}</span>
                <span className="font-display text-[12px] opacity-90">unlimited · full reports</span>
              </button>
            </div>
            <button onClick={onBackToText} className="mt-3 font-sans text-[13px] font-bold text-ink-mute underline">
              keep it in text (free) →
            </button>
          </div>
        </div>
      )}

      {/* header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="rounded-full border border-white/25 bg-white/10 px-2.5 py-1 font-sans text-[11px] font-bold text-paper-cool">
            {scene.emoji} {scene.label.replace(/^the /, "")} · {weatherWord}
          </span>
          <span className="hidden sm:inline font-display italic text-[12px] text-white/60">talk over her anytime — she&apos;ll hear you</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-mono text-[12px] font-bold rounded-full border-[1.5px] px-2.5 py-1 ${timeUp ? "border-ink bg-red text-paper-cool" : "border-ink bg-yellow text-ink"}`}>
            {timeUp ? "time's up" : `${mm ?? Math.floor(date.durationSec / 60)}:${ss ?? "00"} left`}
          </span>
          <button onClick={() => { endSession(); onEnd(); }} disabled={ending} className="rounded-full border-[1.5px] border-ink bg-paper-cool px-3 py-1 font-sans text-[12px] font-bold text-ink hover:bg-paper-deep disabled:opacity-60">
            end date
          </button>
          <LeaveButton onLeave={() => { endSession(); onLeave(); }} />
        </div>
      </div>

      {/* stage */}
      <div className="flex flex-1 min-h-0 flex-col items-center justify-center overflow-y-auto px-5 py-6 text-center">
        <div className="relative flex items-center justify-center">
          {uiStatus === "speaking" && <span className="absolute h-52 w-52 rounded-full border border-white/20 animate-ping" style={{ animationDuration: "2.4s" }} aria-hidden />}
          {uiStatus === "speaking" && <span className="absolute h-64 w-64 rounded-full border border-white/10 animate-ping" style={{ animationDuration: "3.2s" }} aria-hidden />}
          {(uiStatus === "connecting" || uiStatus === "ringing") && <span className="absolute h-56 w-56 rounded-full border border-white/15 animate-pulse" aria-hidden />}
          {uiStatus === "ringing" && <span className="absolute h-72 w-72 rounded-full border border-white/10 animate-ping" style={{ animationDuration: "1.4s" }} aria-hidden />}
          {uiStatus === "listening" && <span className="absolute h-52 w-52 rounded-full border-2 border-teal/40 animate-ping" style={{ animationDuration: "2s" }} aria-hidden />}
          <StripePhoto color={card.stripeColor} photoUrl={card.photoUrl ?? undefined} alt={card.name} variant="circle" showPhotoTag={false} className="h-40 w-40 shadow-hard" />
        </div>

        <div className="mt-5 flex items-center gap-2">
          <span className="font-sans text-2xl font-bold text-white">{card.name.toLowerCase()}</span>
          {uiStatus === "ringing" && <span className="rounded-full bg-yellow px-2.5 py-0.5 font-sans text-[11px] font-bold text-ink">calling…</span>}
          {uiStatus === "speaking" && <span className="rounded-full bg-red px-2.5 py-0.5 font-sans text-[11px] font-bold text-paper-cool">speaking</span>}
          {uiStatus === "connecting" && <span className="rounded-full bg-lilac px-2.5 py-0.5 font-sans text-[11px] font-bold text-ink">connecting…</span>}
        </div>
        {uiStatus === "ringing" && <p className="mt-2 font-display italic text-[13px] text-white/70">ringing… she&apos;s about to pick up</p>}

        {/* waveform only while speaking */}
        {uiStatus === "speaking" && (
          <div className="mt-3 flex h-8 items-end gap-1" aria-hidden>
            {BAR_COLORS.map((c, i) => (
              <span key={i} className="w-1.5 rounded-full animate-pulse" style={{ backgroundColor: c, height: `${8 + ((i * 37) % 24)}px`, animationDelay: `${(i % 5) * 0.12}s`, animationDuration: "0.7s" }} />
            ))}
          </div>
        )}

        {captions && caption && uiStatus !== "ringing" && (
          <p className="mt-5 max-w-xl font-serif italic text-xl sm:text-2xl leading-snug text-white">“{caption}”</p>
        )}

        {/* mic status (hidden while ringing) */}
        <div className={`mt-5 flex items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 font-display italic text-[12px] text-paper-cool ${uiStatus === "ringing" ? "hidden" : ""}`}>
          {micDenied ? (
            <>mic is blocked — allow it in your browser, or tap <b>back to text</b></>
          ) : voiceError ? (
            <>{voiceError} — you can still text</>
          ) : uiStatus === "listening" ? (
            <>
              <MicPulse />
              <span className="font-sans not-italic font-bold text-teal">your mic is open — just talk</span>
            </>
          ) : uiStatus === "speaking" ? (
            <>she&apos;s talking — jump in whenever</>
          ) : (
            <>connecting the call…</>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          <button onClick={() => setMuted((m) => !m)} className="rounded-full border-2 border-ink bg-paper-cool px-4 py-2 font-sans text-[13px] font-bold text-ink shadow-hard-xs">
            {muted ? "🔈 unmute" : "🔇 mute"}
          </button>
          <button onClick={() => { endSession(); onBackToText(); }} className="rounded-full border-2 border-ink bg-paper-cool px-4 py-2 font-sans text-[13px] font-bold text-ink shadow-hard-xs">
            💬 back to text
          </button>
          <button onClick={() => setCaptions((c) => !c)} className="rounded-full border-2 border-ink bg-paper-cool px-4 py-2 font-sans text-[13px] font-bold text-ink shadow-hard-xs">
            captions {captions ? "on" : "off"}
          </button>
        </div>

        {(voiceError || micDenied) && (
          <button onClick={() => { endSession(); onBackToText(); }} className="mt-4 rounded-full border-2 border-ink bg-yellow px-5 py-2 font-sans text-[13px] font-bold text-ink shadow-hard-xs">
            continue in text →
          </button>
        )}
      </div>
    </DarkStage>
  );
}
