"use client";

// "Your connections" — the matches the user has kept. Each opens the resume
// chat (/connections/[id]). Anonymous users see their own kept matches too
// (stable Supabase anon id); linking an account later carries them over.

import { useEffect, useState } from "react";
import Link from "next/link";
import { matchApi, type MatchedPersona } from "@/lib/matchApi";
import { UpgradeAccount } from "@/components/match/UpgradeAccount";

function lastActive(iso?: string | null): string {
  if (!iso) return "new connection";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "active now";
  if (m < 60) return `active ${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `active ${h}h ago`;
  return `active ${Math.floor(h / 24)}d ago`;
}

function Avatar() {
  return (
    <span className="flex-shrink-0 h-11 w-11 rounded-2xl bg-lilac border-2 border-ink flex items-center justify-center" aria-hidden>
      <svg width="22" height="22" viewBox="0 0 24 24">
        <circle cx="8.5" cy="10" r="1.4" fill="#1a1610" />
        <circle cx="15.5" cy="10" r="1.4" fill="#1a1610" />
        <path d="M8 14.5c1.2 1.5 2.6 2.2 4 2.2s2.8-.7 4-2.2" stroke="#1a1610" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export default function ConnectionsPage() {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [matches, setMatches] = useState<MatchedPersona[]>([]);

  useEffect(() => {
    let alive = true;
    matchApi
      .listMatches()
      .then((d) => alive && (setMatches(d.matches ?? []), setState("ready")))
      .catch(() => alive && setState("error"));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col max-w-md lg:max-w-2xl mx-auto w-full px-4 py-6">
      <header className="flex items-center justify-between">
        <Link href="/" className="text-sm text-ink-mute hover:text-ink">← back</Link>
        <h1 className="font-sans text-lg font-bold tracking-tight text-ink">your connections</h1>
        <span className="w-10" />
      </header>

      {state === "ready" && matches.length > 0 && (
        <div className="mt-5">
          <UpgradeAccount />
        </div>
      )}

      <div className="mt-6 flex-1">
        {state === "loading" && (
          <p className="text-center font-serif italic text-ink-mute mt-16">loading your people…</p>
        )}

        {state === "error" && (
          <p className="text-center font-serif italic text-red mt-16">couldn&apos;t load — try again in a bit.</p>
        )}

        {state === "ready" && matches.length === 0 && (
          <div className="text-center mt-16">
            <div className="text-3xl">💘</div>
            <p className="mt-3 font-display text-2xl text-ink">no connections yet</p>
            <p className="mt-2 font-sans text-[13px] text-ink-mute max-w-[16rem] mx-auto">
              when a chat clicks, tap <span className="font-bold text-ink">keep 💘</span> — they&apos;ll be here to talk to again.
            </p>
            <Link
              href="/chat"
              className="mt-5 inline-block bg-ink text-paper-cool border-2 border-ink rounded-full px-5 py-2.5 font-sans text-sm font-bold tracking-tight shadow-hard-xs"
            >
              meet someone →
            </Link>
          </div>
        )}

        {state === "ready" && matches.length > 0 && (
          <ul className="space-y-3">
            {matches.map((m) => (
              <li key={m.id}>
                <Link
                  href={`/connections/${m.id}`}
                  className="flex items-center gap-3 rounded-2xl border-2 border-ink bg-paper-cool p-3 shadow-hard-sm transition-transform hover:-translate-y-0.5"
                >
                  <Avatar />
                  <div className="min-w-0 flex-1">
                    <div className="font-sans text-[15px] font-bold tracking-tight text-ink truncate">
                      {m.displayName}
                    </div>
                    {m.vibe && (
                      <div className="font-serif italic text-[13px] text-[#8b6fb8] truncate">{m.vibe}</div>
                    )}
                  </div>
                  <span className="flex-shrink-0 font-display text-[11px] text-ink-mute">
                    {lastActive(m.lastChatAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
