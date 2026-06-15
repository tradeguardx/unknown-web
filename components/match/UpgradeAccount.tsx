"use client";

// "Secure your connections" — shown to ANONYMOUS users. Links a Google identity
// to the existing anonymous Supabase user, so their matches (and subscription)
// survive across devices. The user id is unchanged by linking → nothing is lost.
//
// Google OAuth only: no OTP, no codes, no per-message cost, one tap. (Email/phone
// OTP intentionally omitted — rate-limited and higher-friction.)

import { useEffect, useState } from "react";
import { matchApi } from "@/lib/matchApi";

export function UpgradeAccount() {
  const [anon, setAnon] = useState<boolean | null>(null);

  useEffect(() => {
    let alive = true;
    matchApi.currentUser().then((u) => {
      if (!alive) return;
      setAnon(!!u && !u.email); // anonymous = signed in but no email identity
    });
    return () => {
      alive = false;
    };
  }, []);

  if (anon !== true) return null; // hide for linked users (or while unknown)

  async function google() {
    const redirectTo = typeof window !== "undefined" ? window.location.href : undefined;
    await matchApi.signInWithGoogle(redirectTo);
  }

  return (
    <div className="rounded-2xl border-2 border-ink bg-yellow-soft p-4 shadow-hard-sm">
      <p className="font-sans text-[14px] font-bold text-ink">save your connections 🔒</p>
      <p className="mt-1 font-display text-[13px] text-ink-soft">
        you&apos;re a guest right now. sign in so your people are here on every device.
      </p>
      <button
        onClick={google}
        className="mt-3 w-full rounded-xl border-2 border-ink bg-paper-cool px-4 py-2.5 font-sans text-[13px] font-bold tracking-tight text-ink shadow-hard-xs hover:-translate-y-0.5 transition-transform"
      >
        continue with Google
      </button>
    </div>
  );
}
