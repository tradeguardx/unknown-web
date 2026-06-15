"use client";

// Right-side slide-in drawer with the navigation links. Triggered by the
// hamburger icon in the landing/chat header. Backdrop click + Escape close it.
//
// Two-tier content:
//   - "navigate" section: about / terms / privacy (the explicit-disclosure
//     pages — same as the existing SiteFooter links)
//   - "settings" section: notification permission toggle (only if the browser
//     supports it AND the user hasn't blocked it)
//
// Notify toggle keeps the same per-browser localStorage flag that
// ChatWindow.tsx uses ("unknownchat:notify:v1") so the two surfaces stay in
// sync without lifting state. Reading once on open is fine — drawer is short-
// lived and the OS permission rarely changes mid-session.

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AccountMenu } from "@/components/match/AccountMenu";

interface Props {
  open: boolean;
  onClose: () => void;
}

const NOTIFY_KEY = "unknownchat:notify:v1";

export function MenuDrawer({ open, onClose }: Props) {
  const [notifyPerm, setNotifyPerm] = useState<NotificationPermission | "unsupported">("default");
  const [notifyPref, setNotifyPref] = useState(false);

  // Probe Notification API state every time the drawer opens — cheap, and
  // catches the case where the user changes browser permissions while we're
  // running but the drawer was closed at the time.
  useEffect(() => {
    if (!open) return;
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotifyPerm("unsupported");
      return;
    }
    setNotifyPerm(Notification.permission);
    try {
      setNotifyPref(localStorage.getItem(NOTIFY_KEY) === "1");
    } catch { /* localStorage may be disabled — silent */ }
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Lock body scroll while the drawer is open. Always reset to empty on
  // cleanup (not the captured value) — restoring a stale "hidden" was
  // leaving body locked on iOS during fast navigation, which then prevented
  // the chat input from focusing on the next page.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const toggleNotify = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "denied") return;

    if (Notification.permission === "default") {
      const result = await Notification.requestPermission();
      setNotifyPerm(result);
      if (result === "granted") {
        setNotifyPref(true);
        try { localStorage.setItem(NOTIFY_KEY, "1"); } catch { /* ignore */ }
      }
      return;
    }

    setNotifyPref(prev => {
      const next = !prev;
      try { localStorage.setItem(NOTIFY_KEY, next ? "1" : "0"); } catch { /* ignore */ }
      return next;
    });
  }, []);

  if (!open) return null;

  const notifyActive = notifyPerm === "granted" && notifyPref;
  const notifyLabel =
    notifyPerm === "unsupported" ? "notifications not supported"
    : notifyPerm === "denied" ? "notifications blocked"
    : notifyActive ? "notifications: on"
    : notifyPerm === "granted" ? "notifications: off"
    : "enable notifications";

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-ink/45 backdrop-blur-[3px]"
      onClick={onClose}
    >
      <aside
        onClick={e => e.stopPropagation()}
        className="w-[78%] max-w-[320px] h-full bg-paper-cool border-l-[2.5px] border-ink shadow-hard-lg flex flex-col"
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b-[1.5px] border-dashed border-paper-deep">
          <span className="font-sans font-bold text-lg tracking-tight text-ink">menu</span>
          <button
            onClick={onClose}
            className="text-ink-mute hover:text-ink p-1"
            aria-label="close menu"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M5 5l12 12M17 5L5 17" />
            </svg>
          </button>
        </div>

        <div className="flex-1 px-5 py-4 flex flex-col gap-0.5 overflow-y-auto">
          <AccountMenu />
          <Section>navigate</Section>
          <Link
            href="/connections"
            onClick={onClose}
            className="flex items-center justify-between py-3 border-b-[1.5px] border-dashed border-paper-deep"
          >
            <span className="font-sans text-[17px] font-bold tracking-[-0.015em] text-ink">
              your connections 💘
            </span>
          </Link>
          <Link
            href="/plus"
            onClick={onClose}
            className="flex items-center justify-between py-3 border-b-[1.5px] border-dashed border-paper-deep"
          >
            <span className="font-sans text-[17px] font-bold tracking-[-0.015em] text-red">
              unknown+ ✨
            </span>
            <span className="rounded-full border-[1.5px] border-ink bg-yellow px-2 py-0.5 font-display text-[11px] font-bold text-ink -rotate-2">
              soon
            </span>
          </Link>
          <DrawerLink href="/about" onClick={onClose}>about</DrawerLink>
          <DrawerLink href="/faq" onClick={onClose}>faq</DrawerLink>
          <DrawerLink href="/terms" onClick={onClose}>terms</DrawerLink>
          <DrawerLink href="/privacy" onClick={onClose}>privacy</DrawerLink>

          {notifyPerm !== "unsupported" && (
            <>
              <Section>settings</Section>
              <button
                onClick={toggleNotify}
                disabled={notifyPerm === "denied"}
                className="flex items-center justify-between py-3 border-b-[1.5px] border-dashed border-paper-deep disabled:opacity-50 text-left w-full"
              >
                <span className="font-sans text-[17px] font-semibold text-ink tracking-[-0.015em]">
                  {notifyLabel}
                </span>
                <span className="text-lg" aria-hidden>
                  {notifyActive ? "🔔" : "🔕"}
                </span>
              </button>
            </>
          )}
        </div>

        <div className="px-5 py-5 border-t-[1.5px] border-dashed border-paper-deep text-center font-display text-sm text-ink-mute">
          made for the strange &amp; sleepless ♡
        </div>
      </aside>
    </div>
  );
}

function Section({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-display text-[15px] text-ink-mute mt-3.5 mb-1 font-bold">
      {children}
    </div>
  );
}

function DrawerLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center justify-between py-3 border-b-[1.5px] border-dashed border-paper-deep"
    >
      <span className="font-sans text-[17px] font-semibold text-ink tracking-[-0.015em]">
        {children}
      </span>
      <span className="text-ink-mute text-lg" aria-hidden>
        →
      </span>
    </Link>
  );
}
