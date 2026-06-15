"use client";

// Left pane (WhatsApp-Web style): list of saved connections. Clicking one opens
// the chat in the right pane (/connections/[id]). Highlights the active chat.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { matchApi, type MatchedPersona } from "@/lib/matchApi";
import { UpgradeAccount } from "./UpgradeAccount";

function lastActive(iso?: string | null): string {
  if (!iso) return "new";
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function Avatar() {
  return (
    <span className="flex-shrink-0 h-10 w-10 rounded-2xl bg-lilac border-2 border-ink flex items-center justify-center" aria-hidden>
      <svg width="20" height="20" viewBox="0 0 24 24">
        <circle cx="8.5" cy="10" r="1.3" fill="#1a1610" />
        <circle cx="15.5" cy="10" r="1.3" fill="#1a1610" />
        <path d="M8 14.5c1.2 1.5 2.6 2.2 4 2.2s2.8-.7 4-2.2" stroke="#1a1610" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function ConnectionsSidebar() {
  const path = usePathname() ?? "";
  const activeId = path.startsWith("/connections/") ? path.split("/")[2] : null;
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [matches, setMatches] = useState<MatchedPersona[]>([]);
  const [acct, setAcct] = useState<Awaited<ReturnType<typeof matchApi.me>> | null>(null);

  useEffect(() => {
    let alive = true;
    matchApi
      .listMatches()
      .then((d) => alive && (setMatches(d.matches ?? []), setState("ready")))
      .catch(() => alive && setState("error"));
    matchApi.me().then((m) => alive && setAcct(m)).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-4 py-3 border-b-[1.5px] border-dashed border-paper-deep flex-shrink-0">
        <Link href="/" className="text-sm text-ink-mute hover:text-ink">← home</Link>
        <span className="font-sans text-sm font-bold tracking-tight text-ink">connections 💘</span>
        <span className="w-12" />
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="px-3 pt-3">
          <UpgradeAccount />
        </div>

        {state === "loading" && (
          <p className="text-center font-serif italic text-ink-mute mt-10">loading…</p>
        )}
        {state === "error" && (
          <p className="text-center font-serif italic text-red mt-10">couldn&apos;t load.</p>
        )}
        {state === "ready" && matches.length === 0 && (
          <div className="text-center mt-10 px-6">
            <div className="text-2xl">💘</div>
            <p className="mt-2 font-display text-lg text-ink">no connections yet</p>
            <p className="mt-1 font-sans text-[12px] text-ink-mute">
              match someone you vibe with, they&apos;ll show up here.
            </p>
            <Link
              href="/chat"
              className="mt-4 inline-block bg-ink text-paper-cool border-2 border-ink rounded-full px-4 py-2 font-sans text-[12px] font-bold shadow-hard-xs"
            >
              meet someone →
            </Link>
          </div>
        )}
        {state === "ready" && matches.length > 0 && (
          <ul className="px-2 py-2 space-y-1">
            {matches.map((m) => {
              const active = m.id === activeId;
              return (
                <li key={m.id}>
                  <Link
                    href={`/connections/${m.id}`}
                    className={`flex items-center gap-3 rounded-2xl px-2.5 py-2 ${
                      active ? "bg-lilac/40 border-2 border-ink" : "border-2 border-transparent hover:bg-paper-warm"
                    }`}
                  >
                    <Avatar />
                    <div className="min-w-0 flex-1">
                      <div className="font-sans text-[14px] font-bold tracking-tight text-ink truncate">
                        {m.displayName}
                      </div>
                      {m.vibe && (
                        <div className="font-serif italic text-[12px] text-[#8b6fb8] truncate">{m.vibe}</div>
                      )}
                    </div>
                    <span className="flex-shrink-0 font-display text-[10px] text-ink-mute">
                      {lastActive(m.lastChatAt)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Account status footer — plan + messages used */}
      {acct && !acct.isAnonymous && (
        <div className="flex-shrink-0 border-t-[1.5px] border-dashed border-paper-deep px-4 py-3">
          {acct.subscription.active ? (
            <div className="font-sans text-[12px] text-ink">
              <span className="font-bold text-red">unknown+</span>{" "}
              <span className="text-ink-mute">
                · {acct.usage.includedUsed.toLocaleString()} / {acct.usage.includedQuota.toLocaleString()} messages
                {acct.usage.topUpRemaining > 0 ? ` · +${acct.usage.topUpRemaining.toLocaleString()} top-up` : ""}
              </span>
            </div>
          ) : (
            <div className="font-sans text-[12px] text-ink-mute">
              <span className="font-bold text-ink">free plan</span> · subscribe for unlimited
            </div>
          )}
        </div>
      )}
    </div>
  );
}
