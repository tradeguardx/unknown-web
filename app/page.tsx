"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  COUNTRY_OPTIONS,
  INTENT_LABELS,
  LANGUAGES,
  intentRequiresAgeGate,
  type ChatIntent,
  type Language,
  type Orientation,
  type UserGender,
  type UserPrefs,
} from "@/lib/prefs";
import { loadPrefs, savePrefs } from "@/lib/clientPrefs";

export default function Landing() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<UserPrefs>({});

  useEffect(() => {
    setPrefs(loadPrefs());
  }, []);

  function update<K extends keyof UserPrefs>(key: K, value: UserPrefs[K]) {
    setPrefs(prev => ({ ...prev, [key]: value }));
  }

  function start() {
    savePrefs(prefs);
    router.push("/chat");
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 py-10">
      <div className="max-w-md w-full">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight">unknown.chat</h1>
          <p className="mt-3 text-neutral-600">talk to someone you'll never meet again.</p>
        </div>

        <div className="mt-6 text-left bg-white border border-neutral-200 rounded-xl p-4 text-sm text-neutral-700 leading-relaxed">
          <p>
            <span className="font-semibold">heads up — </span>
            the strangers here are AI personas designed to feel like real people. They have moods,
            quirks, and might leave without warning. See <Link href="/about" className="underline">about</Link>.
          </p>
          <label className="flex gap-2 items-start cursor-pointer mt-3 pt-3 border-t border-neutral-100">
            <input
              type="checkbox"
              checked={!!prefs.aiAcknowledged}
              onChange={e => update("aiAcknowledged", e.target.checked)}
              className="mt-0.5 cursor-pointer"
            />
            <span className="text-neutral-800">
              I understand the strangers here are AI personas, not humans.
            </span>
          </label>
        </div>

        <div className="mt-6 bg-white border border-neutral-200 rounded-xl p-5 space-y-4">
          <Field label="i'm from">
            <select
              value={prefs.country ?? ""}
              onChange={e => update("country", e.target.value || undefined)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm bg-white"
            >
              <option value="">— rather not say —</option>
              {COUNTRY_OPTIONS.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>

          <Field label="chat in">
            <select
              value={prefs.language ?? "english"}
              onChange={e => update("language", e.target.value as Language)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm bg-white"
            >
              {(Object.keys(LANGUAGES) as Language[]).map(k => (
                <option key={k} value={k}>{LANGUAGES[k].label}</option>
              ))}
            </select>
          </Field>

          <Field label="i am">
            <SegButtons<UserGender>
              value={prefs.gender}
              onChange={v => update("gender", v)}
              options={[
                { v: "male", label: "M" },
                { v: "female", label: "F" },
                { v: "nonbinary", label: "NB" },
                { v: "private", label: "private" },
              ]}
            />
          </Field>

          <Field label="interested in">
            <SegButtons<Orientation>
              value={prefs.interestedIn}
              onChange={v => update("interestedIn", v)}
              options={[
                { v: "men", label: "men" },
                { v: "women", label: "women" },
                { v: "anyone", label: "anyone" },
              ]}
            />
          </Field>

          <Field label="looking for">
            <select
              value={prefs.intent ?? ""}
              onChange={e => update("intent", (e.target.value || undefined) as ChatIntent | undefined)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm bg-white"
            >
              <option value="">— surprise me —</option>
              {(Object.keys(INTENT_LABELS) as ChatIntent[]).map(k => (
                <option key={k} value={k}>{INTENT_LABELS[k]} {intentRequiresAgeGate(k) ? "(18+)" : ""}</option>
              ))}
            </select>
          </Field>

          {intentRequiresAgeGate(prefs.intent) && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm">
              <label className="flex gap-2 items-start cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!prefs.ageConfirmed}
                  onChange={e => update("ageConfirmed", e.target.checked)}
                  className="mt-0.5 cursor-pointer"
                />
                <span className="text-neutral-800">
                  I confirm I am <strong>18 years or older</strong>.
                  <span className="block text-xs text-neutral-500 mt-0.5">
                    Required for {INTENT_LABELS[prefs.intent!]}. Saved on this device.
                  </span>
                </span>
              </label>
            </div>
          )}
        </div>

        {(() => {
          const ageBlocked = intentRequiresAgeGate(prefs.intent) && !prefs.ageConfirmed;
          const aiBlocked = !prefs.aiAcknowledged;
          const blocked = ageBlocked || aiBlocked;
          const blockedLabel = aiBlocked
            ? "confirm AI acknowledgment to continue"
            : "confirm 18+ to continue";

          return blocked ? (
            <button
              disabled
              className="mt-5 w-full rounded-lg bg-neutral-200 text-neutral-500 py-3 font-medium cursor-not-allowed"
            >
              {blockedLabel}
            </button>
          ) : (
            <button
              onClick={start}
              className="mt-5 w-full rounded-lg bg-ink text-paper py-3 font-medium hover:opacity-90"
            >
              new chat
            </button>
          );
        })()}

        <footer className="mt-10 text-center text-xs text-neutral-400">
          <Link href="/about" className="hover:text-neutral-600">about</Link>
        </footer>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs uppercase tracking-wider text-neutral-500 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function SegButtons<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T | undefined;
  onChange: (v: T | undefined) => void;
  options: Array<{ v: T; label: string }>;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(opt => {
        const active = value === opt.v;
        return (
          <button
            key={opt.v}
            type="button"
            onClick={() => onChange(active ? undefined : opt.v)}
            className={
              "px-3 py-1.5 rounded-md border text-sm transition " +
              (active
                ? "bg-ink text-paper border-ink"
                : "bg-white text-neutral-700 border-neutral-300 hover:border-neutral-400")
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
