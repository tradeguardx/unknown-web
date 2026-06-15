"use client";

// "Secure your connections" — shown to ANONYMOUS users. Links a Google/email
// identity to the existing anonymous Supabase user, so their matches (and
// subscription) survive across devices and cleared cookies. The user id is
// unchanged by linking, so nothing is lost.

import { useEffect, useState } from "react";
import { matchApi } from "@/lib/matchApi";

export function UpgradeAccount() {
  const [anon, setAnon] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [showEmail, setShowEmail] = useState(false);

  useEffect(() => {
    let alive = true;
    matchApi.currentUser().then((u) => {
      if (!alive) return;
      // is_anonymous lives in app_metadata/user_metadata depending on version;
      // treat "has no email identity" as anonymous.
      const isAnon = !!u && !u.email;
      setAnon(isAnon);
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
  async function sendEmail() {
    if (!email.trim()) return;
    await matchApi.signInWithEmail(email.trim());
    setSent(true);
  }

  return (
    <div className="rounded-2xl border-2 border-ink bg-yellow-soft p-4 shadow-hard-sm">
      <p className="font-sans text-[14px] font-bold text-ink">save your connections 🔒</p>
      <p className="mt-1 font-display text-[13px] text-ink-soft">
        you&apos;re browsing as a guest. add a login so your people are here on every device.
      </p>

      {sent ? (
        <p className="mt-3 font-display text-[13px] text-ink">check your email for the magic link ✨</p>
      ) : (
        <div className="mt-3 space-y-2">
          <button
            onClick={google}
            className="w-full rounded-xl border-2 border-ink bg-paper-cool px-4 py-2.5 font-sans text-[13px] font-bold tracking-tight text-ink shadow-hard-xs"
          >
            continue with Google
          </button>
          {showEmail ? (
            <div className="flex gap-1.5">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your email"
                className="flex-1 rounded-xl border-2 border-ink bg-paper px-3 py-2 font-sans text-[13px] text-ink outline-none"
              />
              <button
                onClick={sendEmail}
                className="rounded-xl border-2 border-ink bg-ink px-3 py-2 font-sans text-[13px] font-bold text-paper-cool"
              >
                send
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowEmail(true)}
              className="w-full font-display text-[12px] text-ink-mute underline"
            >
              or use email
            </button>
          )}
        </div>
      )}
    </div>
  );
}
