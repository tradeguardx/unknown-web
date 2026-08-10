// The start screen — anticipation. Dark, scene-lit. "your date is ready", the
// character card, and the button into the date. Sets the tone before turn one.

import { DarkStage } from "../DarkStage";
import { StripePhoto } from "../StripePhoto";
import { AmbientAudio, SOFT_MUSIC } from "../AmbientAudio";
import { DateWordmark } from "../DateShell";
import type { DatePersonaCard, DateSceneCard } from "@/lib/matchApi";
import type { SceneControls } from "./ScenePicker";

interface Props {
  card: DatePersonaCard;
  scene: DateSceneCard;
  controls: SceneControls;
  age?: number;
  onStart: () => void;
  onLeave?: () => void;
  starting?: boolean;
}

export function Anticipation({ card, scene, controls, age, onStart, starting }: Props) {
  const she = card.gender === "male" ? "he" : "she";
  return (
    <DarkStage theme={scene.darkTheme} ambience={{ sceneId: scene.id, weather: controls.weather }}>
      <AmbientAudio src={SOFT_MUSIC} enabled={controls.sound} volume={0.3} />
      {/* header */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-6">
        <span className="text-paper-cool"><DateWordmark /></span>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <Pill>{scene.emoji} {scene.label.replace(/^the /, "")}</Pill>
          <Pill>🌨 {controls.weather} {controls.time}</Pill>
          <Pill>🎵 {controls.sound ? "on" : "off"}</Pill>
        </div>
      </div>

      {/* center */}
      <div className="flex flex-1 min-h-0 flex-col items-center justify-center overflow-y-auto px-5 py-6 text-center">
        <p className="font-display italic text-yellow text-[14px] mb-2">{she} is already there. corner table.</p>
        <h1 className="font-sans text-4xl sm:text-5xl font-bold tracking-tight text-white">
          your date is <span className="text-yellow italic font-display">ready</span>
        </h1>

        <div className="relative mt-7 w-full max-w-md">
          <span className="absolute -top-2 left-1/2 h-4 w-24 -translate-x-1/2 -rotate-2 rounded-sm bg-lilac/80" aria-hidden />
          <div className="flex items-center gap-4 rounded-2xl border-2 border-ink bg-paper-cool p-4 text-left shadow-hard">
            <StripePhoto color={card.stripeColor} photoUrl={card.photoUrl ?? undefined} alt={card.name} variant="square" aiStamp className="w-24 shrink-0" />
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="font-sans text-xl font-bold text-ink">{card.name}</span>
                <span className="font-display italic text-[12px] text-ink-mute">{card.occupation}, {age ?? card.age}</span>
              </div>
              <p className="font-display italic text-[12px] text-ink-mute mt-0.5">{card.traits.join(" · ")}</p>
              <p className="mt-2 border-l-2 border-red pl-2 font-serif italic text-[14px] text-ink leading-snug">“{card.quote}”</p>
            </div>
          </div>
        </div>

        <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-1.5">
          <span>🎧</span>
          <span className="font-sans text-[12px] font-semibold text-paper-cool">pop your headphones on — it&apos;s a call</span>
        </div>

        <button
          onClick={onStart}
          disabled={starting}
          className="mt-4 rounded-2xl border-2 border-ink bg-red px-10 py-4 font-sans text-lg font-bold text-paper-cool shadow-hard hover:shadow-hard-lg disabled:opacity-60"
        >
          {starting ? "calling…" : "start the date →"}
        </button>
        <p className="mt-3 font-display italic text-[12px] text-white/70">20 minutes · starts as a call · switch to text anytime</p>
      </div>

      <div className="px-4 py-2.5 sm:px-6">
        <p className="font-display italic text-[11px] text-white/50">⚠ {she}&apos;s an AI persona. {she} will act like {she} isn&apos;t.</p>
      </div>
    </DarkStage>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/25 bg-white/10 px-2.5 py-1 font-sans text-[11px] font-bold text-paper-cool backdrop-blur-sm">
      {children}
    </span>
  );
}
