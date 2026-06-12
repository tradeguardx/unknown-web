"use client";

// Bottom-sheet variant of the original LandingForm. Same prefs, same gating
// logic (aiAcknowledged + ageConfirmed for love/flirt) — different chrome.
// Slides up from the bottom of the landing when the user taps the chat
// input or any CTA. Save & start routes to /chat.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AGE_BANDS,
  COUNTRY_OPTIONS,
  INTENT_LABELS,
  LANGUAGES,
  intentRequiresAgeGate,
  type AgeBand,
  type ChatIntent,
  type Language,
  type Orientation,
  type UserGender,
  type UserPrefs,
} from "@/lib/prefs";
import { loadPrefs, savePrefs } from "@/lib/clientPrefs";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function PrefsSheet({ open, onClose }: Props) {
  const router = useRouter();
  const [prefs, setPrefs] = useState<UserPrefs>({});
  const sheetRef = useRef<HTMLDivElement | null>(null);

  // Hydrate prefs from localStorage on mount.
  useEffect(() => {
    setPrefs(loadPrefs());
  }, []);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll while the sheet is open so the underlying page doesn't
  // scroll under the user's finger when they drag the modal. Always reset to
  // empty string on cleanup (not the previously captured value) — restoring
  // a stale "hidden" value was leaving the body locked on iOS in some
  // navigation timings, which then prevented the chat input from focusing.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  function update<K extends keyof UserPrefs>(key: K, value: UserPrefs[K]) {
    setPrefs(prev => ({ ...prev, [key]: value }));
  }

  function start() {
    // Implicit AI acknowledgment — by tapping "save & start" the user
    // acknowledges the disclosure shown above the button + on the landing.
    const merged: UserPrefs = { ...prefs, aiAcknowledged: true };
    savePrefs(merged);
    // Close the sheet BEFORE routing so the body-overflow lock unwinds
    // cleanly. Unmount cleanup also runs, but on iOS the timing of router
    // navigation + effect cleanup occasionally left the body still locked,
    // which prevented the chat input from focusing on the next page.
    onClose();
    document.body.style.overflow = "";
    router.push("/chat");
  }

  if (!open) return null;

  const ageBlocked = intentRequiresAgeGate(prefs.intent) && !prefs.ageConfirmed;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 backdrop-blur-[3px] p-4"
      onClick={onClose}
    >
      <div
        ref={sheetRef}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-md bg-paper-cool border-[2.5px] border-ink rounded-[22px] p-5 shadow-hard-lg -rotate-[0.5deg] mb-4 max-h-[88vh] overflow-y-auto"
      >
        {/* Drag-grip indicator (visual only) */}
        <div className="w-9 h-1 bg-ink-faint rounded-full mx-auto mt-[-2px] mb-3.5" />

        <h2 className="font-sans text-[22px] font-bold leading-[1.05] tracking-tight mb-1">
          your <span className="font-serif italic text-red font-normal">vibe?</span>
        </h2>
        <p className="font-display text-base text-ink-soft mb-4">
          tell us what u want · saved on ur device only
        </p>

        <div className="grid grid-cols-2 gap-2">
          <Field label="im from">
            <select
              value={prefs.country ?? ""}
              onChange={e => update("country", e.target.value || undefined)}
              className="paper-select"
            >
              <option value="">rather not say</option>
              {COUNTRY_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="chat in">
            <select
              value={prefs.language ?? "english"}
              onChange={e => update("language", e.target.value as Language)}
              className="paper-select"
            >
              {(Object.keys(LANGUAGES) as Language[]).map(k => (
                <option key={k} value={k}>{LANGUAGES[k].label}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <Field label="i am">
            <PillGroup<UserGender>
              value={prefs.gender}
              onChange={v => update("gender", v)}
              options={[
                { v: "male", label: "M" },
                { v: "female", label: "F" },
                { v: "nonbinary", label: "NB" },
              ]}
            />
          </Field>
          <Field label="into">
            <PillGroup<Orientation>
              value={prefs.interestedIn}
              onChange={v => update("interestedIn", v)}
              options={[
                { v: "men", label: "men" },
                { v: "women", label: "women" },
                { v: "anyone", label: "any" },
              ]}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <Field label="my age">
            <select
              value={prefs.ageBand ?? ""}
              onChange={e => update("ageBand", (e.target.value || undefined) as AgeBand | undefined)}
              className="paper-select"
            >
              <option value="">rather not say</option>
              {AGE_BANDS.map(b => <option key={b} value={b}>{b}</option>)}
            </select>
          </Field>
          <Field label="looking for">
            <select
              value={prefs.intent ?? ""}
              onChange={e => update("intent", (e.target.value || undefined) as ChatIntent | undefined)}
              className="paper-select"
            >
              <option value="">surprise me</option>
              {(Object.keys(INTENT_LABELS) as ChatIntent[]).map(k => (
                <option key={k} value={k}>
                  {INTENT_LABELS[k]} {intentRequiresAgeGate(k) ? "(18+)" : ""}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {intentRequiresAgeGate(prefs.intent) && (
          <div className="mt-3 rounded-lg bg-yellow-soft border border-ink p-3 text-sm">
            <label className="flex gap-2 items-start cursor-pointer">
              <input
                type="checkbox"
                checked={!!prefs.ageConfirmed}
                onChange={e => update("ageConfirmed", e.target.checked)}
                className="mt-0.5 cursor-pointer"
              />
              <span className="text-ink-soft font-display text-[15px]">
                im 18 or older — required for {INTENT_LABELS[prefs.intent!]}
              </span>
            </label>
          </div>
        )}

        <p className="mt-4 text-center font-sans text-[13px] leading-relaxed text-ink-soft">
          {`By tapping "Save & Start", you acknowledge you're chatting with AI personas, not real people. `}
          <Link href="/about" className="font-semibold text-red underline underline-offset-2">Learn more</Link>
        </p>

        <button
          onClick={start}
          disabled={ageBlocked}
          className="mt-2 w-full bg-red text-paper-cool border-2 border-ink rounded-xl py-3 font-sans font-bold tracking-tight shadow-hard disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {ageBlocked ? "confirm 18+ to continue" : "save & start →"}
        </button>

        <button
          onClick={onClose}
          className="mt-2 w-full text-ink-mute text-sm font-display py-2"
        >
          cancel
        </button>
      </div>

      {/* Inline-scoped utility for the paper-select look. Tailwind handles
          most styles; the chevron is an inline SVG so it inherits cleanly. */}
      <style jsx>{`
        :global(.paper-select) {
          width: 100%;
          background-color: #f5eedb;
          border: 1.5px solid #1a1610;
          border-radius: 10px;
          padding: 9px 32px 9px 12px;
          font-family: var(--font-sans), system-ui, sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: #1a1610;
          appearance: none;
          cursor: pointer;
          background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 12'><path d='M3 5l3 3 3-3' stroke='%231a1610' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>");
          background-repeat: no-repeat;
          background-position: right 10px center;
          background-size: 11px;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block font-display text-[15px] text-ink font-bold mb-1">{label}</span>
      {children}
    </label>
  );
}

function PillGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T | undefined;
  onChange: (v: T | undefined) => void;
  options: Array<{ v: T; label: string }>;
}) {
  return (
    <div className="flex gap-0.5 bg-paper rounded-[10px] p-0.5 border-[1.5px] border-ink">
      {options.map(opt => {
        const active = value === opt.v;
        return (
          <button
            key={opt.v}
            type="button"
            onClick={() => onChange(active ? undefined : opt.v)}
            className={
              "flex-1 py-1.5 rounded-lg font-sans text-xs font-bold transition " +
              (active ? "bg-ink text-paper-cool" : "bg-transparent text-ink-mute")
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
