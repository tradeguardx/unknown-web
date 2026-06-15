"use client";

// "Secure your connections" — shown to ANONYMOUS users. Links a login to the
// existing anonymous Supabase user so matches survive across devices (the user
// id is unchanged → nothing is lost). Two non-OTP options:
//   - Google OAuth (one tap, free)
//   - Email + password ("create" links to the anon user; "log in" = existing acct)

import { useEffect, useState } from "react";
import { matchApi } from "@/lib/matchApi";

export function UpgradeAccount() {
  const [anon, setAnon] = useState<boolean | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let alive = true;
    matchApi.currentUser().then((u) => alive && setAnon(!!u && !u.email));
    return () => {
      alive = false;
    };
  }, []);

  if (anon !== true) return null;

  async function google() {
    const redirectTo = typeof window !== "undefined" ? window.location.href : undefined;
    await matchApi.signInWithGoogle(redirectTo);
  }

  async function run(kind: "create" | "login") {
    if (!email.trim() || password.length < 6) {
      setError("enter an email and a password (6+ chars)");
      return;
    }
    setBusy(true);
    setError(null);
    const { error } =
      kind === "create"
        ? await matchApi.createPassword(email.trim(), password)
        : await matchApi.loginPassword(email.trim(), password);
    setBusy(false);
    if (error) setError(error.message);
    else setDone(true);
  }

  if (done) {
    return (
      <div className="rounded-2xl border-2 border-ink bg-yellow-soft p-4 shadow-hard-sm">
        <p className="font-sans text-[14px] font-bold text-ink">you&apos;re saved 🔒</p>
        <p className="mt-1 font-display text-[13px] text-ink-soft">
          your connections are now tied to your account.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border-2 border-ink bg-yellow-soft p-4 shadow-hard-sm">
      <p className="font-sans text-[14px] font-bold text-ink">save your connections 🔒</p>
      <p className="mt-1 font-display text-[13px] text-ink-soft">
        you&apos;re a guest. add a login so your people are here on every device.
      </p>

      <button
        onClick={google}
        className="mt-3 w-full rounded-xl border-2 border-ink bg-paper-cool px-4 py-2.5 font-sans text-[13px] font-bold tracking-tight text-ink shadow-hard-xs"
      >
        continue with Google
      </button>

      <div className="my-3 flex items-center gap-2 text-ink-mute">
        <span className="h-px flex-1 bg-ink/15" />
        <span className="font-display text-[11px]">or email + password</span>
        <span className="h-px flex-1 bg-ink/15" />
      </div>

      <div className="space-y-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email"
          className="w-full rounded-xl border-2 border-ink bg-paper px-3 py-2 font-sans text-[13px] text-ink outline-none"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password (6+ chars)"
          className="w-full rounded-xl border-2 border-ink bg-paper px-3 py-2 font-sans text-[13px] text-ink outline-none"
        />
        {error && <p className="font-display text-[12px] text-red">{error}</p>}
        <div className="flex gap-2">
          <button
            onClick={() => run("create")}
            disabled={busy}
            className="flex-1 rounded-xl border-2 border-ink bg-ink px-3 py-2 font-sans text-[13px] font-bold text-paper-cool disabled:opacity-60"
          >
            {busy ? "…" : "create account"}
          </button>
          <button
            onClick={() => run("login")}
            disabled={busy}
            className="flex-1 rounded-xl border-2 border-ink bg-paper-cool px-3 py-2 font-sans text-[13px] font-bold text-ink disabled:opacity-60"
          >
            log in
          </button>
        </div>
      </div>
    </div>
  );
}
