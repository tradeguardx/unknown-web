"use client";

// Left pane (WhatsApp-Web style): list of saved connections. Clicking one opens
// the chat in the right pane (/connections/[id]). Highlights the active chat.

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { matchApi, type MatchedPersona } from "@/lib/matchApi";
import { useAccount } from "@/lib/useAccount";
import { UpgradeAccount } from "./UpgradeAccount";
import { MenuDrawer } from "@/components/landing/MenuDrawer";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const acct = useAccount(); // shared cached account (plan/usage), no extra fetch

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
    <div className="flex flex-col h-full">
      <header className="flex items-center justify-between px-4 py-3 border-b-[1.5px] border-dashed border-paper-deep flex-shrink-0">
        <Link href="/" className="text-sm text-ink-mute hover:text-ink">← home</Link>
        <span className="font-sans text-sm font-bold tracking-tight text-ink">connections 💘</span>
        <button
          onClick={() => setMenuOpen(true)}
          aria-label="menu"
          className="p-1 text-ink-soft hover:text-ink"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M3 6h14M3 10h14M3 14h14" />
          </svg>
        </button>
      </header>
      <MenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="flex-1 overflow-y-auto">
        {/* Login pitch — only when no chat is open, so it doesn't duplicate the
            chat-pane "log in to chat" gate on desktop's two-pane view. */}
        {!activeId && (
          <div className="px-3 pt-3">
            <UpgradeAccount onDone={() => window.location.reload()} />
          </div>
        )}

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
                      <div className="flex items-center gap-1.5">
                        <span className="font-sans text-[14px] font-bold tracking-tight text-ink truncate">
                          {m.displayName}
                        </span>
                        {!!m.unreadCount && m.unreadCount > 0 && (
                          <span className="flex-shrink-0 rounded-full bg-red px-1.5 py-0.5 font-sans text-[10px] font-bold leading-none text-paper-cool">
                            {m.unreadCount > 9 ? "9+" : m.unreadCount}
                          </span>
                        )}
                      </div>
                      {m.vibe && (
                        <div className="font-serif italic text-[12px] text-[#8b6fb8] truncate">{m.vibe}</div>
                      )}
                    </div>
                    <span className={`flex-shrink-0 font-display text-[10px] ${m.unreadCount ? "font-bold text-red" : "text-ink-mute"}`}>
                      {m.unreadCount ? "new 💬" : lastActive(m.lastChatAt)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Account status footer — plan + messages used. (Log out lives in the ☰ menu.) */}
      {acct && acct.loggedIn && (
        <div className="flex-shrink-0 border-t-[1.5px] border-dashed border-paper-deep px-4 py-3 min-w-0">
          {acct.subState === "grace" ? (
            <div className="font-sans text-[12px] truncate">
              <span className="font-bold text-red">⚠ payment failed</span>{" "}
              <span className="text-ink-mute">· fix it in the menu</span>
            </div>
          ) : acct.subState === "active" && acct.usage ? (
            <div className="font-sans text-[12px] text-ink truncate">
              <span className="font-bold text-red">unknown plus</span>{" "}
              <span className="text-ink-mute">
                · {acct.usage.includedUsed.toLocaleString()} / {acct.usage.includedQuota.toLocaleString()} messages
                {acct.usage.topUpRemaining > 0 ? ` · +${acct.usage.topUpRemaining.toLocaleString()} top-up` : ""}
              </span>
            </div>
          ) : acct.passActive ? (
            <div className="font-sans text-[12px] text-ink truncate">
              <span className="font-bold text-red">🎟️ explore pass</span>{" "}
              <span className="text-ink-mute">· unlimited today</span>
            </div>
          ) : (
            <Link href="/plus" className="block font-sans text-[12px] text-ink-mute truncate hover:text-ink">
              <span className="font-bold text-ink">free plan</span> · <span className="text-red font-bold">get unknown plus →</span>
            </Link>
          )}
          {acct.email && <div className="font-sans text-[11px] text-ink-mute truncate">{acct.email}</div>}
        </div>
      )}
    </div>
  );
}
