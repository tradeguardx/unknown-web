"use client";

// The Dating Report — the shareable outcome of an AI Date. Built to be screenshot-
// and share-worthy: a big score, a date "archetype", the date's own verdict (the
// hook), and stat bars. Non-owners / not-yet-unlocked viewers see a TEASER: the
// headline is shown, the juicy detail (tips, red flags, best/worst moment, the rest
// of the stats) is sealed behind a soft blur with an unlock CTA — visible enough to
// tempt, hidden enough to convert.

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { StripePhoto } from "@/components/date/StripePhoto";
import { matchApi, type DateResultResponse } from "@/lib/matchApi";

const STAT_LABEL: Record<string, string> = {
  charm: "charm", humor: "humor", confidence: "confidence", empathy: "empathy",
  flow: "conversation flow", curiosity: "curiosity", flirtiness: "flirtiness",
};

export default function ReportPage() {
  const id = String(useParams()?.id ?? "");
  const [data, setData] = useState<DateResultResponse | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [copied, setCopied] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    let alive = true;
    matchApi
      .dateResult(id)
      .then((d) => {
        if (!alive) return;
        setData(d);
        setState("ready");
      })
      .catch(() => alive && setState("error"));
    return () => {
      alive = false;
    };
  }, [id]);

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const title = data?.result?.archetype ? `I'm "${data.result.archetype}" on a date 💘` : "my Dating Report 💘";
    try {
      if (navigator.share) await navigator.share({ title, url });
      else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }
    } catch {
      /* cancelled */
    }
  }

  async function unlock() {
    setUnlocking(true);
    try {
      const here = window.location.href;
      const { checkoutUrl } = await matchApi.checkout("subscription", { successUrl: here, cancelUrl: here });
      window.location.href = checkoutUrl;
    } catch {
      window.location.href = "/plus";
    }
  }

  if (state === "loading") return <Wrap><p className="font-serif italic text-ink-mute text-center mt-20">developing your report…</p></Wrap>;
  if (state === "error" || !data) return <Wrap><p className="font-serif italic text-red text-center mt-20">couldn&apos;t find this report.</p></Wrap>;

  const r = data.result;
  const locked = !data.unlocked;
  const meta = data.meta ?? {};
  const score = r.overallScore ?? 0;

  return (
    <Wrap>
      <div className="mx-auto w-full max-w-lg py-8 px-4">
        {/* Hero */}
        <div className="relative rounded-3xl border-2 border-ink bg-paper-cool shadow-hard-lg p-6 text-center overflow-hidden">
          {(meta.photoUrl || meta.stripeColor) && (
            <StripePhoto
              color={meta.stripeColor ?? "#b89dd4"}
              photoUrl={meta.photoUrl ?? undefined}
              alt={meta.personaName ?? ""}
              variant="circle"
              showPhotoTag={false}
              className="mx-auto mb-3 h-16 w-16"
            />
          )}
          <div className="text-[11px] font-sans font-bold uppercase tracking-widest text-ink-mute mb-3">
            {meta.sceneEmoji ?? "💘"} a date with {meta.personaName ?? "someone"}
          </div>

          <ScoreRing score={score} />

          <div className="mt-3 text-4xl">{r.archetypeEmoji ?? "💘"}</div>
          <h1 className="font-display text-3xl text-ink leading-tight mt-1">{r.archetype ?? "The Mystery Date"}</h1>
          {r.tagline && <p className="font-serif italic text-ink-mute mt-1">{r.tagline}</p>}

          {/* The verdict — the share hook */}
          {r.verdict && (
            <div className="mt-4 rounded-2xl border-2 border-ink bg-lilac-soft px-4 py-3">
              <div className="font-sans text-[11px] font-bold uppercase tracking-wide text-ink-mute mb-0.5">
                their verdict · {r.verdict.secondDatePct}% want a 2nd date
              </div>
              <p className="font-serif italic text-ink text-[15px]">“{r.verdict.line}”</p>
            </div>
          )}

          <div className="mt-5 flex gap-2 justify-center">
            <button onClick={share} className="om-cta rounded-full border-2 border-ink bg-red px-5 py-2 font-sans text-[13px] font-bold text-paper-cool shadow-hard-xs">
              {copied ? "link copied ✓" : "share my report ↗"}
            </button>
            <a href={`/date/report/${id}/opengraph-image`} target="_blank" rel="noopener noreferrer" className="om-cta rounded-full border-2 border-ink bg-yellow px-5 py-2 font-sans text-[13px] font-bold text-ink shadow-hard-xs">
              📸 save card for insta
            </a>
            <Link href="/date" className="rounded-full border-2 border-ink bg-paper-warm px-5 py-2 font-sans text-[13px] font-bold text-ink shadow-hard-xs hover:bg-paper-deep">
              new date
            </Link>
          </div>
        </div>

        {/* Stats */}
        <Section title="how you came across">
          <div className="space-y-2.5">
            {(r.stats ?? []).map((s) => (
              <StatBar key={s.key} label={STAT_LABEL[s.key] ?? s.key} score={s.score} />
            ))}
            {locked && r.locked?.stats ? <LockedRows n={r.locked.stats} label="more traits scored" /> : null}
          </div>
        </Section>

        {/* Green flags */}
        {(r.greenFlags?.length || r.locked?.greenFlags) && (
          <Section title="green flags 💚">
            <ul className="space-y-1.5">
              {(r.greenFlags ?? []).map((g, i) => (
                <li key={i} className="font-mono text-[13px] text-ink-soft leading-snug">• {g}</li>
              ))}
            </ul>
            {locked && r.locked?.greenFlags ? <LockedRows n={r.locked.greenFlags} label="more green flags" /> : null}
          </Section>
        )}

        {/* Locked-for-teaser sections */}
        {locked ? (
          <LockedTeaser r={r} onUnlock={unlock} unlocking={unlocking} />
        ) : (
          <>
            {r.redFlags?.length ? (
              <Section title="things to work on">
                <ul className="space-y-1.5">
                  {r.redFlags.map((g, i) => (
                    <li key={i} className="font-mono text-[13px] text-ink-soft leading-snug">• {g}</li>
                  ))}
                </ul>
              </Section>
            ) : null}
            {r.bestMoment ? (
              <Section title="your best moment ✨">
                <blockquote className="font-serif italic text-ink text-[15px]">“{r.bestMoment.quote}”</blockquote>
                <p className="font-mono text-[12px] text-ink-mute mt-1">{r.bestMoment.why}</p>
              </Section>
            ) : null}
            {r.cringeMoment ? (
              <Section title="the slightly-off moment 😅">
                <blockquote className="font-serif italic text-ink text-[15px]">“{r.cringeMoment.quote}”</blockquote>
                <p className="font-mono text-[12px] text-ink-mute mt-1">{r.cringeMoment.why}</p>
              </Section>
            ) : null}
            {r.tips?.length ? (
              <Section title="tips for next time 💡">
                <ol className="space-y-1.5 list-decimal list-inside">
                  {r.tips.map((t, i) => (
                    <li key={i} className="font-mono text-[13px] text-ink-soft leading-snug">{t}</li>
                  ))}
                </ol>
              </Section>
            ) : null}
          </>
        )}

        <p className="text-center font-serif italic text-ink-faint text-[12px] mt-8">
          {meta.personaName ? `${meta.personaName} · ` : ""}unknown.chat
        </p>
      </div>
    </Wrap>
  );
}

function LockedTeaser({ r, onUnlock, unlocking }: { r: DateResultResponse["result"]; onUnlock: () => void; unlocking: boolean }) {
  const l = r.locked;
  const items = [
    l?.redFlags ? `${l.redFlags} thing${l.redFlags > 1 ? "s" : ""} to work on` : null,
    l?.bestMoment ? "your best moment (a real quote)" : null,
    l?.cringeMoment ? "the moment that landed a little off" : null,
    l?.tips ? `${l.tips} personalized tips to date better` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="relative mt-5">
      {/* Blurred fake rows to imply depth */}
      <div className="rounded-2xl border-2 border-dashed border-ink/40 bg-paper-warm p-5 select-none blur-[3px] opacity-70" aria-hidden>
        <div className="h-3 w-40 bg-ink/20 rounded mb-3" />
        <div className="h-3 w-full bg-ink/15 rounded mb-2" />
        <div className="h-3 w-5/6 bg-ink/15 rounded mb-2" />
        <div className="h-3 w-2/3 bg-ink/15 rounded mb-4" />
        <div className="h-3 w-32 bg-ink/20 rounded mb-3" />
        <div className="h-3 w-full bg-ink/15 rounded mb-2" />
        <div className="h-3 w-4/5 bg-ink/15 rounded" />
      </div>

      {/* Unlock overlay */}
      <div className="absolute inset-0 flex items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-2xl border-2 border-ink bg-paper-cool shadow-hard-lg p-5 text-center">
          <div className="text-3xl mb-1">🔒</div>
          <h3 className="font-display text-2xl text-ink">the full read</h3>
          <p className="font-serif italic text-ink-mute text-sm mt-1 mb-3">
            there&apos;s more we noticed — unlock to see:
          </p>
          <ul className="text-left space-y-1 mb-4 mx-auto inline-block">
            {items.map((it, i) => (
              <li key={i} className="font-mono text-[12.5px] text-ink-soft">• {it}</li>
            ))}
          </ul>
          <button
            onClick={onUnlock}
            disabled={unlocking}
            className="block w-full rounded-full border-2 border-ink bg-red px-6 py-3 font-sans text-sm font-bold text-paper-cool shadow-hard hover:shadow-hard-lg disabled:opacity-50"
          >
            {unlocking ? "opening…" : "unlock the full report →"}
          </button>
          <p className="font-serif italic text-ink-faint text-[11px] mt-2">unlocks all your reports with Unknown+</p>
        </div>
      </div>
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const R = 46;
  const C = 2 * Math.PI * R;
  const off = C * (1 - Math.max(0, Math.min(100, score)) / 100);
  return (
    <div className="relative mx-auto" style={{ width: 120, height: 120 }}>
      <svg width="120" height="120" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={R} fill="none" stroke="#e0d4b0" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={R} fill="none" stroke="#e64a3a" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={off} transform="rotate(-90 60 60)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-4xl text-ink leading-none">{score}</span>
        <span className="font-sans text-[10px] font-bold uppercase tracking-widest text-ink-mute">date score</span>
      </div>
    </div>
  );
}

function StatBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="flex justify-between font-sans text-[11px] font-bold text-ink-soft mb-0.5">
        <span className="capitalize">{label}</span>
        <span>{score}</span>
      </div>
      <div className="h-2.5 rounded-full bg-paper-deep border border-ink/30 overflow-hidden">
        <div className="h-full rounded-full bg-lilac" style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
      </div>
    </div>
  );
}

function LockedRows({ n, label }: { n: number; label: string }) {
  if (!n) return null;
  return (
    <div className="mt-2 rounded-xl border-2 border-dashed border-ink/30 bg-paper-warm/60 px-3 py-2 flex items-center gap-2">
      <span>🔒</span>
      <span className="font-mono text-[12px] text-ink-mute">+{n} {label} · unlock to see</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 rounded-2xl border-2 border-ink bg-paper-cool shadow-hard-xs p-4">
      <h2 className="font-sans text-xs font-bold uppercase tracking-wide text-ink-mute mb-3">{title}</h2>
      {children}
    </section>
  );
}

function Wrap({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[100dvh] w-full">{children}</div>;
}
