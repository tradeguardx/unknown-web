// The text date — chat inside the scene. Dark, scene-lit; a live sidebar (her mood
// + what she's "picked up on") on desktop; a running clock; and the switch-to-voice
// / end-date controls. Persona lines are light cards, yours are dark bubbles.

import { useEffect, useRef } from "react";
import { DarkStage } from "../DarkStage";
import { StripePhoto } from "../StripePhoto";
import { AmbientAudio, SOFT_MUSIC } from "../AmbientAudio";
import { LeaveButton } from "../LeaveButton";
import type { DatePersonaCard, DateStart } from "@/lib/matchApi";
import type { SceneControls } from "./ScenePicker";

export type DateMsg = { role: "user" | "assistant"; content: string };

interface Props {
  card: DatePersonaCard;
  date: DateStart;
  controls: SceneControls;
  messages: DateMsg[];
  typing: boolean;
  remaining: number | null;
  durationSec: number;
  timeUp: boolean;
  input: string;
  sending: boolean;
  onInput: (v: string) => void;
  onSend: () => void;
  onOpener: (text: string) => void;
  onEnd: () => void;
  onSwitchVoice: () => void;
  onLeave: () => void;
  ending?: boolean;
  notice?: string | null;
}

const STOP = new Set(["that","this","with","your","just","really","about","because","would","could","there","their","have","been","什么","the","and","but","for","you","are","was","not","its","she","her","him","his","yes","yeah","okay","haha","lol","hmm","like","dont","cant","its"]);
const WEATHER_WORD: Record<string, string> = { snow: "snowing", rain: "raining", storm: "storming", fog: "foggy", clear: "clear" };

// What she's "picked up on" — light keyword extraction from the user's lines.
function derivePickedUp(messages: DateMsg[]): string[] {
  const seen: string[] = [];
  for (const m of messages) {
    if (m.role !== "user") continue;
    for (const raw of m.content.toLowerCase().split(/[^a-z']+/)) {
      const w = raw.replace(/'s$/, "");
      if (w.length >= 4 && !STOP.has(w) && !seen.includes(w)) seen.push(w);
    }
  }
  return seen.slice(-3);
}

// Her mood, by how the date is going (turn count + your latest energy).
function deriveMood(messages: DateMsg[]): { label: string; note: string } {
  const userTurns = messages.filter((m) => m.role === "user").length;
  const last = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  if (userTurns === 0) return { label: "waiting", note: "she keeps glancing at the door" };
  if (last.length < 12) return { label: "reading you", note: "she's not sure about you yet" };
  if (userTurns < 3) return { label: "warming up ↑", note: "she's settling in" };
  if (userTurns < 6) return { label: "leaning in ↑", note: "she's stopped checking her phone" };
  return { label: "into it ↑", note: "she's forgotten the time" };
}

export function TextDate(props: Props) {
  const { card, date, controls, messages, typing, remaining, durationSec, timeUp, input, sending, onInput, onSend, onOpener, onEnd, onSwitchVoice, onLeave, ending, notice } = props;
  const scene = date.scene;
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, typing]);

  const mood = deriveMood(messages);
  const pickedUp = derivePickedUp(messages);
  const userTurns = messages.filter((m) => m.role === "user").length;
  // Timer initialises to the full duration before the first tick (no null:null).
  const shown = remaining ?? durationSec;
  const mm = Math.floor(shown / 60);
  const ss = String(shown % 60).padStart(2, "0");
  const elapsedMin = Math.max(0, Math.floor((durationSec - shown) / 60));
  const weatherWord = WEATHER_WORD[controls.weather] ?? controls.weather;

  return (
    <DarkStage theme={scene.darkTheme} ambience={{ sceneId: scene.id, weather: controls.weather }}>
      {/* soft music while texting (if sound is on) */}
      <AmbientAudio src={SOFT_MUSIC} enabled={controls.sound} volume={0.22} />
      {/* header */}
      <div className="flex items-center justify-between gap-2 px-3 py-2.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="rounded-full border border-white/25 bg-white/10 px-2.5 py-1 font-sans text-[11px] font-bold text-paper-cool">
            {scene.emoji} {scene.label.replace(/^the /, "")} · {weatherWord}
          </span>
          <span className="hidden sm:inline font-display italic text-[12px] text-white/60 truncate">the window&apos;s fogging up</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`font-mono text-[12px] font-bold rounded-full border-[1.5px] px-2.5 py-1 ${timeUp ? "border-ink bg-red text-paper-cool" : "border-ink bg-yellow text-ink"}`}>
            {timeUp ? "time's up" : `${mm}:${ss} left`}
          </span>
          <button onClick={onEnd} disabled={ending} className="rounded-full border-[1.5px] border-ink bg-paper-cool px-3 py-1 font-sans text-[12px] font-bold text-ink hover:bg-paper-deep disabled:opacity-60">
            end date
          </button>
          <LeaveButton onLeave={onLeave} />
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* sidebar (desktop) */}
        <aside className="hidden lg:flex w-[250px] shrink-0 flex-col gap-3 border-r border-white/10 p-4">
          <div className="rounded-2xl border-2 border-ink bg-paper-cool p-3">
            <StripePhoto color={card.stripeColor} photoUrl={card.photoUrl ?? undefined} alt={card.name} variant="square" className="mb-2 w-28" />
            <div className="flex items-center justify-between gap-1">
              <span className="font-sans text-base font-bold text-ink">{card.name}</span>
              <span className="rounded-full bg-red px-2 py-0.5 font-sans text-[10px] font-bold text-paper-cool whitespace-nowrap">{mood.label}</span>
            </div>
            <p className="font-display italic text-[12px] text-ink-mute mt-0.5">{mood.note}</p>
          </div>
          {/* memory chips — hidden until she's actually picked something up */}
          {pickedUp.length > 0 && (
            <div className="rounded-2xl border-2 border-white/15 bg-white/5 p-3">
              <div className="font-sans text-[10px] font-bold uppercase tracking-widest text-yellow mb-2">she&apos;s picked up on</div>
              <div className="flex flex-wrap gap-1.5">
                {pickedUp.map((w) => (
                  <span key={w} className="rounded-full border border-white/25 bg-white/10 px-2 py-0.5 font-sans text-[11px] font-semibold text-paper-cool">{w}</span>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* thread — bottom-anchored, capped at 700px */}
        <div className="flex flex-1 min-h-0 flex-col">
          <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-6">
            <div className="mx-auto flex min-h-full w-full max-w-[700px] flex-col">
              <p className="text-center font-display italic text-[12px] text-white/50 mb-4">
                — {elapsedMin < 1 ? "your date just started" : `${elapsedMin} minute${elapsedMin > 1 ? "s" : ""} in`} —
              </p>
              <div className="mt-auto flex flex-col gap-3">
                {messages.map((m, i) =>
                  m.role === "user" ? (
                    <div key={i} className="self-end max-w-[80%] rounded-2xl rounded-br-md border-2 border-ink bg-ink px-3.5 py-2 font-sans text-[14px] font-medium leading-snug text-paper-cool">
                      {m.content}
                    </div>
                  ) : (
                    <div key={i} className="self-start max-w-[85%] rounded-2xl rounded-bl-md border-2 border-ink bg-paper-cool px-3.5 py-2 font-sans text-[14px] font-medium leading-snug text-ink shadow-hard-xs whitespace-pre-wrap">
                      {m.content}
                    </div>
                  ),
                )}
                {typing && (
                  <div className="self-start flex items-center gap-2">
                    <div className="rounded-2xl rounded-bl-md border-2 border-ink bg-paper-cool px-3.5 py-2.5 shadow-hard-xs">
                      <span className="inline-flex gap-1"><Dot /><Dot /><Dot /></span>
                    </div>
                    <span className="font-display italic text-[11px] text-white/60">{card.name.toLowerCase()} is typing…</span>
                  </div>
                )}
                {/* opening beat — tappable openers before the first user line */}
                {userTurns === 0 && !typing && (
                  <div className="self-start mt-1 flex flex-wrap gap-2">
                    {["hi there", "nice spot, huh", "tell me something true"].map((o) => (
                      <button
                        key={o}
                        onClick={() => onOpener(o)}
                        className="rounded-full border-2 border-white/40 bg-white/10 px-3 py-1.5 font-sans text-[12.5px] font-bold text-paper-cool hover:bg-white/20"
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                )}
                {timeUp && (
                  <p className="text-center font-display italic text-[12px] text-yellow mt-3">the lights just came on — tap <b>end date</b> when you&apos;re ready.</p>
                )}
              </div>
            </div>
          </div>

          {/* input */}
          <div className="px-3 py-3 sm:px-6 sm:py-4">
            <div className="mx-auto w-full max-w-[700px]">
              {notice && <p className="mb-2 text-center font-display italic text-[12px] text-yellow">{notice}</p>}
              <div className="flex items-center gap-2 rounded-2xl border-2 border-ink bg-paper-cool p-[3px] shadow-hard-sm">
                <input
                  value={input}
                  onChange={(e) => onInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
                  placeholder="say something back…"
                  className="flex-1 bg-transparent px-3 py-2 font-sans text-[14px] text-ink outline-none min-w-0 placeholder:font-display placeholder:italic placeholder:text-ink-mute"
                />
                <button onClick={onSwitchVoice} className="hidden sm:inline-flex items-center gap-1 rounded-full border-2 border-ink bg-paper px-3 py-2 font-sans text-[12px] font-bold text-ink hover:bg-paper-deep whitespace-nowrap">
                  🎙 voice
                </button>
                <button onClick={onSend} disabled={!input.trim() || sending} className="rounded-full border-2 border-ink bg-red px-4 py-2 font-sans text-[13px] font-bold text-paper-cool disabled:opacity-40">
                  send
                </button>
              </div>
              <button onClick={onSwitchVoice} className="sm:hidden mt-2 w-full rounded-full border-2 border-ink bg-paper px-3 py-2 font-sans text-[12px] font-bold text-ink">
                🎙 switch to voice
              </button>
            </div>
          </div>
        </div>
      </div>
    </DarkStage>
  );
}

function Dot() {
  return <span className="h-1.5 w-1.5 rounded-full bg-ink/60 animate-bounce" style={{ animationDuration: "1s" }} />;
}
