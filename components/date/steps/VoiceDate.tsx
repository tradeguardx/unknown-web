"use client";

// The voice date — she actually speaks (ElevenLabs TTS via /api/date/tts) and you
// reply with your mic (Web Speech API). Our own LLM still writes the words; this
// screen just voices them and listens back.
//
// Flow: her line → TTS plays (mic paused to avoid echo) → mic reopens → you speak →
// transcript sent (onUserSpeech) → "thinking" → her reply → TTS … States are made
// obvious: speaking (rings + badge) / thinking (slow ring) / listening (green dot).

import { useEffect, useRef, useState } from "react";
import { DarkStage } from "../DarkStage";
import { StripePhoto } from "../StripePhoto";
import { AmbientAudio } from "../AmbientAudio";
import { LeaveButton } from "../LeaveButton";
import type { DatePersonaCard, DateStart } from "@/lib/matchApi";
import type { SceneControls } from "./ScenePicker";

interface Props {
  card: DatePersonaCard;
  date: DateStart;
  controls: SceneControls;
  remaining: number | null;
  timeUp: boolean;
  lastLine: string;
  thinking: boolean;
  onUserSpeech: (text: string) => void;
  onBackToText: () => void;
  onEnd: () => void;
  onLeave: () => void;
  ending?: boolean;
}

const WEATHER_WORD: Record<string, string> = { snow: "snowing", rain: "raining", storm: "storming", fog: "foggy", clear: "clear" };

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

// Expanding "you're being heard" circles shown while the user talks.
function MicPulse() {
  return (
    <span className="relative inline-flex h-4 w-4 items-center justify-center align-middle">
      <span className="absolute inline-flex h-full w-full rounded-full bg-teal/50 animate-ping" />
      <span className="absolute inline-flex h-2/3 w-2/3 rounded-full bg-teal/70 animate-ping" style={{ animationDelay: "0.3s" }} />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teal" />
    </span>
  );
}
const BAR_COLORS = ["#e64a3a", "#f5d967", "#b89dd4", "#5fa39a", "#e64a3a", "#f5d967", "#b89dd4", "#5fa39a", "#e64a3a", "#f5d967", "#b89dd4"];

export function VoiceDate({ card, date, controls, remaining, timeUp, lastLine, thinking, onUserSpeech, onBackToText, onEnd, onLeave, ending }: Props) {
  const scene = date.scene;
  const [muted, setMuted] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const [listening, setListening] = useState(false);
  const [connecting, setConnecting] = useState(true); // brief "connecting…" until her first word
  const [ringing, setRinging] = useState(true); // the call is ringing before she picks up
  const [userSpeaking, setUserSpeaking] = useState(false); // you are talking (mic picking you up)
  const [caption, setCaption] = useState(lastLine);
  const [sttSupported, setSttSupported] = useState(true);
  const [voiceError, setVoiceError] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recRef = useRef<any>(null);
  const activeRef = useRef(true);
  const busyRef = useRef(false); // true while speaking (pause mic to avoid echo)
  const spokenRef = useRef<string>("");
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  const mm = remaining != null ? Math.floor(remaining / 60) : null;
  const ss = remaining != null ? String(remaining % 60).padStart(2, "0") : null;
  const weatherWord = WEATHER_WORD[controls.weather] ?? controls.weather;

  function stopSpeaking() {
    const a = audioRef.current;
    if (a) {
      a.pause();
      try { a.src = ""; } catch {}
      audioRef.current = null;
    }
    setSpeaking(false);
  }

  function startMic() {
    if (!activeRef.current || busyRef.current) return;
    try { recRef.current?.start(); } catch {/* already started */}
  }
  function pauseMic() {
    try { recRef.current?.stop(); } catch {}
  }

  async function speak(text: string) {
    if (!text || mutedRef.current) return;
    stopSpeaking();
    busyRef.current = true;
    pauseMic();
    setSpeaking(true);
    setCaption(text);
    try {
      const res = await fetch("/api/date/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          gender: card.gender,
          voiceId: card.voiceId ?? undefined,
          stability: card.voiceStability ?? undefined,
          style: card.voiceStyle ?? undefined,
        }),
      });
      if (!res.ok || !res.body) throw new Error(String(res.status));

      const a = new Audio();
      audioRef.current = a;
      a.onplay = () => setConnecting(false);
      const done = () => { setSpeaking(false); busyRef.current = false; startMic(); };
      a.onended = done;
      a.onerror = done;

      // Stream: start playing as chunks arrive (much faster first sound) — fall
      // back to a full-file blob if MediaSource/mpeg isn't supported.
      const canStream = typeof MediaSource !== "undefined" && MediaSource.isTypeSupported("audio/mpeg");
      if (canStream) {
        const ms = new MediaSource();
        a.src = URL.createObjectURL(ms);
        ms.addEventListener("sourceopen", () => {
          const sb = ms.addSourceBuffer("audio/mpeg");
          const reader = res.body!.getReader();
          const append = (chunk: Uint8Array) =>
            new Promise<void>((resolve) => { sb.addEventListener("updateend", () => resolve(), { once: true }); sb.appendBuffer(chunk as unknown as BufferSource); });
          (async () => {
            try {
              for (;;) {
                const { done: d, value } = await reader.read();
                if (d) break;
                if (value) await append(value);
              }
              if (!sb.updating) ms.endOfStream();
              else sb.addEventListener("updateend", () => { try { ms.endOfStream(); } catch {} }, { once: true });
            } catch { try { ms.endOfStream(); } catch {} }
          })();
          a.play().catch(() => {});
        });
      } else {
        const url = URL.createObjectURL(await res.blob());
        a.src = url;
        a.addEventListener("ended", () => URL.revokeObjectURL(url), { once: true });
        await a.play();
      }
    } catch {
      setVoiceError(true);
      setSpeaking(false);
      busyRef.current = false;
      startMic();
    }
  }

  // Ring first, then she "picks up" — a call-like intro.
  useEffect(() => {
    const stop = playRingback();
    const t = setTimeout(() => setRinging(false), 2400);
    return () => { clearTimeout(t); stop(); };
  }, []);

  // Speak each new persona line as it arrives (opener included) — but only once
  // she's "picked up" (ringing done).
  useEffect(() => {
    if (ringing) return;
    if (lastLine && lastLine !== spokenRef.current) {
      spokenRef.current = lastLine;
      setCaption(lastLine);
      void speak(lastLine);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastLine, ringing]);

  // Mic (Web Speech API) — set up once.
  useEffect(() => {
    activeRef.current = true;
    const SR = (typeof window !== "undefined" && ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)) || null;
    if (!SR) { setSttSupported(false); return; }
    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = false;
    rec.onstart = () => setListening(true);
    rec.onspeechstart = () => setUserSpeaking(true);
    rec.onspeechend = () => setUserSpeaking(false);
    rec.onend = () => {
      setListening(false);
      setUserSpeaking(false);
      if (activeRef.current && !busyRef.current) { try { rec.start(); } catch {} }
    };
    rec.onerror = () => { setListening(false); setUserSpeaking(false); };
    rec.onresult = (e: any) => {
      let finalText = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalText += e.results[i][0].transcript;
      }
      finalText = finalText.trim();
      setUserSpeaking(false);
      if (finalText && !busyRef.current) onUserSpeech(finalText);
    };
    recRef.current = rec;
    try { rec.start(); } catch {}
    return () => {
      activeRef.current = false;
      try { rec.stop(); } catch {}
      stopSpeaking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Muting stops her mid-sentence.
  useEffect(() => { if (muted) stopSpeaking(); }, [muted]);

  const status = speaking ? "speaking" : thinking ? "thinking" : listening ? "listening" : "idle";

  return (
    <DarkStage theme={scene.darkTheme} ambience={{ sceneId: scene.id, weather: controls.weather }}>
      {/* scene ambience, ducked while she speaks */}
      <AmbientAudio src={scene.ambientAudio} enabled={controls.sound && !muted} volume={speaking ? 0.16 : 0.5} />

      {/* header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="rounded-full border border-white/25 bg-white/10 px-2.5 py-1 font-sans text-[11px] font-bold text-paper-cool">
            {scene.emoji} {scene.label.replace(/^the /, "")} · {weatherWord}
          </span>
          <span className="hidden sm:inline font-display italic text-[12px] text-white/60">music dips while she talks</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-mono text-[12px] font-bold rounded-full border-[1.5px] px-2.5 py-1 ${timeUp ? "border-ink bg-red text-paper-cool" : "border-ink bg-yellow text-ink"}`}>
            {timeUp ? "time's up" : `${mm ?? Math.floor(date.durationSec / 60)}:${ss ?? "00"} left`}
          </span>
          <button onClick={onEnd} disabled={ending} className="rounded-full border-[1.5px] border-ink bg-paper-cool px-3 py-1 font-sans text-[12px] font-bold text-ink hover:bg-paper-deep disabled:opacity-60">
            end date
          </button>
          <LeaveButton onLeave={onLeave} />
        </div>
      </div>

      {/* stage */}
      <div className="flex flex-1 min-h-0 flex-col items-center justify-center overflow-y-auto px-5 py-6 text-center">
        <div className="relative flex items-center justify-center">
          {speaking && <span className="absolute h-52 w-52 rounded-full border border-white/20 animate-ping" style={{ animationDuration: "2.4s" }} aria-hidden />}
          {speaking && <span className="absolute h-64 w-64 rounded-full border border-white/10 animate-ping" style={{ animationDuration: "3.2s" }} aria-hidden />}
          {(thinking || connecting || ringing) && <span className="absolute h-56 w-56 rounded-full border border-white/15 animate-pulse" aria-hidden />}
          {ringing && <span className="absolute h-72 w-72 rounded-full border border-white/10 animate-ping" style={{ animationDuration: "1.4s" }} aria-hidden />}
          {userSpeaking && <span className="absolute h-52 w-52 rounded-full border-2 border-teal/50 animate-ping" style={{ animationDuration: "1.4s" }} aria-hidden />}
          {userSpeaking && <span className="absolute h-64 w-64 rounded-full border border-teal/30 animate-ping" style={{ animationDuration: "1.9s" }} aria-hidden />}
          <StripePhoto color={card.stripeColor} photoUrl={card.photoUrl ?? undefined} alt={card.name} variant="circle" showPhotoTag={false} className="h-40 w-40 shadow-hard" />
        </div>

        <div className="mt-5 flex items-center gap-2">
          <span className="font-sans text-2xl font-bold text-white">{card.name.toLowerCase()}</span>
          {ringing && <span className="rounded-full bg-yellow px-2.5 py-0.5 font-sans text-[11px] font-bold text-ink">calling…</span>}
          {!ringing && status === "speaking" && <span className="rounded-full bg-red px-2.5 py-0.5 font-sans text-[11px] font-bold text-paper-cool">speaking</span>}
          {!ringing && status === "thinking" && <span className="rounded-full bg-lilac px-2.5 py-0.5 font-sans text-[11px] font-bold text-ink">thinking…</span>}
        </div>
        {ringing && <p className="mt-2 font-display italic text-[13px] text-white/70">ringing… she&apos;s about to pick up</p>}

        {/* waveform only while speaking */}
        {speaking && (
          <div className="mt-3 flex h-8 items-end gap-1" aria-hidden>
            {BAR_COLORS.map((c, i) => (
              <span key={i} className="w-1.5 rounded-full animate-pulse" style={{ backgroundColor: c, height: `${8 + ((i * 37) % 24)}px`, animationDelay: `${(i % 5) * 0.12}s`, animationDuration: "0.7s" }} />
            ))}
          </div>
        )}

        {captions && caption && !ringing && (
          <p className="mt-5 max-w-xl font-serif italic text-xl sm:text-2xl leading-snug text-white">“{caption}”</p>
        )}

        {/* mic status (hidden while ringing) */}
        <div className={`mt-5 flex items-center justify-center gap-2 rounded-full border border-white/25 bg-white/10 px-4 py-1.5 font-display italic text-[12px] text-paper-cool ${ringing ? "hidden" : ""}`}>
          {!sttSupported ? (
            <>voice input isn&apos;t supported here — tap <b>back to text</b></>
          ) : voiceError ? (
            <>voice unavailable right now — you can still text</>
          ) : status === "listening" ? (
            userSpeaking ? (
              <>
                <MicPulse />
                <span className="font-sans not-italic font-bold text-teal">hearing you…</span>
              </>
            ) : (
              <><span className="inline-block h-2 w-2 rounded-full bg-teal align-middle" /> your mic is open — just talk</>
            )
          ) : status === "speaking" ? (
            <>listening paused while she talks…</>
          ) : (
            <>…</>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2.5">
          <button onClick={() => setMuted((m) => !m)} className="rounded-full border-2 border-ink bg-paper-cool px-4 py-2 font-sans text-[13px] font-bold text-ink shadow-hard-xs">
            {muted ? "🔈 unmute" : "🔇 mute"}
          </button>
          <button onClick={onBackToText} className="rounded-full border-2 border-ink bg-paper-cool px-4 py-2 font-sans text-[13px] font-bold text-ink shadow-hard-xs">
            💬 back to text
          </button>
          <button onClick={() => setCaptions((c) => !c)} className="rounded-full border-2 border-ink bg-paper-cool px-4 py-2 font-sans text-[13px] font-bold text-ink shadow-hard-xs">
            captions {captions ? "on" : "off"}
          </button>
        </div>
      </div>
    </DarkStage>
  );
}
