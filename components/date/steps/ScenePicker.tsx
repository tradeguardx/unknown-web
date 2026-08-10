"use client";

// Step 2 — "where does this happen?" Scene cards (dark gradient per scene) plus
// weather / time / sound controls that get folded into the frozen scene prompt.
// "the place changes how she talks" — each card shows howItChanges on hover/desc.

import { useEffect, useRef, useState } from "react";
import { DateShell } from "../DateShell";
import { SceneAmbience } from "../SceneAmbience";
import type { DateConfig, DateSceneCard } from "@/lib/matchApi";

export interface SceneControls {
  weather: string;
  time: string;
  sound: boolean;
}

interface Props {
  cfg: DateConfig;
  personaName: string;
  personaEmoji: string;
  sceneId: string | null;
  controls: SceneControls;
  onScene: (id: string) => void;
  onControls: (c: SceneControls) => void;
  onNext: () => void;
  onChangePersona: () => void;
  onLeave: () => void;
}

const WEATHERS = ["snow", "rain", "clear", "storm", "fog"];
const TIMES = ["evening", "night", "sunset", "afternoon", "1am"];

export function ScenePicker({
  cfg, personaName, personaEmoji, sceneId, controls, onScene, onControls, onNext, onChangePersona, onLeave,
}: Props) {
  const selected = cfg.scenes.find((s) => s.id === sceneId) ?? null;

  const chip = (
    <button onClick={onChangePersona} className="ml-1 inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border-[1.5px] border-ink bg-paper-cool px-2.5 py-1 font-sans text-[12px] font-bold text-ink hover:bg-paper-deep">
      <span>{personaEmoji}</span>{personaName.toLowerCase()} · <span className="text-red">change</span>
    </button>
  );

  return (
    <DateShell
      step="step 2 of 3 — pick the scene"
      leftChip={chip}
      onLeave={onLeave}
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <Dropdown icon="🌦" label="weather" value={controls.weather} options={WEATHERS} onChange={(v) => onControls({ ...controls, weather: v })} />
            <Dropdown icon="🕗" label="time" value={controls.time} options={TIMES} onChange={(v) => onControls({ ...controls, time: v })} />
            <button
              onClick={() => onControls({ ...controls, sound: !controls.sound })}
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-paper-cool px-3 py-1.5 font-sans text-[12px] font-bold text-ink"
            >
              🎵 sound: {controls.sound ? "on" : "off"}
            </button>
          </div>
          <button
            onClick={onNext}
            disabled={!sceneId}
            className="rounded-full border-2 border-ink bg-red px-5 sm:px-7 py-2.5 font-sans text-[13px] sm:text-sm font-bold text-paper-cool shadow-hard-xs hover:shadow-hard disabled:opacity-40"
          >
            that&apos;s the one →
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between mb-5">
        <div>
          <p className="font-display italic text-[13px] text-red mb-1">— {personaName.toLowerCase()} said she&apos;s flexible. she&apos;s lying —</p>
          <h2 className="font-sans text-3xl sm:text-4xl font-bold tracking-tight text-ink">
            where does this <span className="text-red italic font-display">happen</span>?
          </h2>
        </div>
        <p className="font-display italic text-[12px] text-ink-mute max-w-[16rem] sm:text-right">
          the place changes how she talks. a train makes her honest. a rooftop makes her bold.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        {cfg.scenes.map((s) => (
          <SceneCard key={s.id} scene={s} active={s.id === sceneId} onClick={() => onScene(s.id)} />
        ))}
        <button
          onClick={() => {
            const pool = cfg.scenes;
            onScene(pool[Math.floor(Math.random() * pool.length)].id);
          }}
          className="flex min-h-[9rem] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-ink/45 bg-paper-cool p-4 text-center transition hover:border-ink"
        >
          <span className="font-sans text-base font-bold text-ink">🏕 campsite</span>
          <span className="font-display italic text-[12px] text-ink-mute mt-0.5">+ more places</span>
          <span className="mt-2 rounded-full border-[1.5px] border-ink bg-lilac px-2.5 py-1 font-sans text-[11px] font-bold text-ink">🎲 let her choose</span>
        </button>
      </div>
      {selected && (
        <p className="mt-4 font-display italic text-[13px] text-ink-mute text-center">
          {selected.emoji} {selected.howItChanges}
        </p>
      )}
    </DateShell>
  );
}

function SceneCard({ scene, active, onClick }: { scene: DateSceneCard; active: boolean; onClick: () => void }) {
  const t = scene.darkTheme;
  return (
    <button
      onClick={onClick}
      className={`relative flex min-h-[9rem] flex-col justify-end overflow-hidden rounded-2xl border-2 p-4 text-left transition ${
        active ? "border-ink shadow-hard -translate-y-0.5" : "border-ink hover:-translate-y-0.5 shadow-hard-xs"
      }`}
      style={{ backgroundImage: `linear-gradient(150deg, ${t.from}, ${t.via} 55%, ${t.to})` }}
    >
      {/* illustrated scene art (if provided) */}
      {scene.cardImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={scene.cardImage}
          alt={scene.label}
          loading="lazy"
          className="uc-anim absolute inset-0 h-full w-full object-cover object-bottom"
          style={{ animation: "uc-kenburns 26s ease-in-out infinite alternate", transformOrigin: "bottom center" }}
        />
      ) : (
        <span className="pointer-events-none absolute -right-3 -top-4 rotate-6 text-7xl opacity-25 select-none">{scene.emoji}</span>
      )}
      {/* animated weather over the art (with art: weather only; without: full doodles) */}
      <SceneAmbience sceneId={scene.id} weather={scene.weather} imageMode={!!scene.cardImage} />
      {active && (
        <span className="absolute left-2 top-2 z-10 rounded-full bg-red px-2.5 py-0.5 font-sans text-[11px] font-bold text-paper-cool">selected</span>
      )}
      {/* label — only when the art doesn't already carry it */}
      {!scene.cardImage && (
        <>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
          <div className="relative z-10 mt-auto">
            <div className="font-sans text-lg font-bold text-white drop-shadow">{scene.emoji} {scene.label}</div>
            <div className="font-display italic text-[12px] text-white/90 drop-shadow">{scene.subtitle}</div>
          </div>
        </>
      )}
    </button>
  );
}

function Dropdown({ icon, label, value, options, onChange }: { icon: string; label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const opts = options.includes(value) ? options : [value, ...options];
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-paper-cool px-3 py-1.5 font-sans text-[12px] font-bold text-ink hover:bg-paper-deep"
      >
        <span>{icon}</span>
        <span className="text-ink-mute">{label}:</span>
        <span>{value}</span>
        <span className={`text-ink-mute transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        // opens upward — the controls sit in the footer bar
        <div className="absolute bottom-full left-0 z-30 mb-2 w-40 rounded-xl border-2 border-ink bg-paper-cool p-1 shadow-hard">
          {opts.map((o) => {
            const sel = o === value;
            return (
              <button
                key={o}
                onClick={() => { onChange(o); setOpen(false); }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left font-sans text-[13px] font-bold transition ${
                  sel ? "bg-ink text-paper-cool" : "text-ink hover:bg-paper-deep"
                }`}
              >
                <span>{o}</span>
                {sel && <span>✓</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
