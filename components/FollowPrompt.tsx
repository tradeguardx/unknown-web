"use client";

// Shown in-chat after a SHORT (<5 min) conversation ends — the chats that don't
// qualify for the feedback prompt. Nudges the user to follow our Instagram.
// The link opens in a NEW TAB (target=_blank) so the user never leaves the chat
// page; they can come right back and tap "find another".

import { SOCIALS } from "@/lib/site";

const IG = SOCIALS.find((s) => s.name === "Instagram" && s.url);

export function FollowPrompt({
  gated = false,
  onFollow,
  onDismiss,
}: {
  // When gated, the next chat is locked behind a Follow click: no dismiss / no
  // "maybe later", and the copy makes the unlock explicit.
  gated?: boolean;
  onFollow: () => void;
  onDismiss: () => void;
}) {
  // Nothing to show if Instagram isn't configured.
  if (!IG) return null;

  return (
    <div className="px-4 pb-2">
      <div className="relative rounded-2xl border-2 border-ink bg-paper-cool p-4 shadow-hard-sm -rotate-[0.4deg]">
        {!gated && (
          <button
            onClick={onDismiss}
            aria-label="dismiss"
            className="absolute right-2 top-2 rounded-md px-1.5 py-0.5 font-sans text-xs font-bold text-ink-mute hover:text-ink"
          >
            ✕
          </button>
        )}

        <div className="mb-2 font-sans text-sm font-bold tracking-tight text-ink">
          early users get unlimited new personas ✨
        </div>
        <p className="mb-3 font-display text-[13px] leading-relaxed text-ink-soft">
          follow us on instagram to continue 👀
        </p>

        <div className="flex items-center gap-2">
          <a
            href={IG.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onFollow}
            className="inline-flex items-center gap-1.5 rounded-xl border-2 border-ink bg-red px-3.5 py-2 font-sans text-xs font-bold tracking-tight text-paper-cool shadow-hard-xs transition-transform hover:-translate-y-0.5"
          >
            <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden>
              <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
              <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
              <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
            </svg>
            follow {IG.handle}
          </a>
          {!gated && (
            <button
              onClick={onDismiss}
              className="rounded-xl px-2.5 py-2 font-display text-xs text-ink-mute hover:text-ink"
            >
              maybe later
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
