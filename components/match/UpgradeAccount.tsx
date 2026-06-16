"use client";

// "Secure your connections" — shown to ANONYMOUS users. Links a login to the
// existing anonymous Supabase user so matches survive across devices (the user
// id is unchanged → nothing is lost). Two non-OTP options:
//   - Google OAuth (one tap, free)
//   - Email + password ("create" links to the anon user; "log in" = existing acct)

import { useEffect, useState } from "react";
import { matchApi } from "@/lib/matchApi";

// Official Google "G" mark (4-color).
function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden className="flex-shrink-0">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z" />
      <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z" />
    </svg>
  );
}

export function UpgradeAccount({
  title = "save your connections 🔒",
  subtitle = "you're a guest. add a login so your people are here on every device.",
  onDone,
  forceShow = false,
}: {
  title?: string;
  subtitle?: string;
  onDone?: () => void;
  forceShow?: boolean;
} = {}) {
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

  if (anon !== true && !forceShow) return null;

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
    else {
      setDone(true);
      onDone?.();
    }
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
      <p className="font-sans text-[14px] font-bold text-ink">{title}</p>
      <p className="mt-1 font-display text-[13px] text-ink-soft">{subtitle}</p>

      <button
        onClick={google}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-ink bg-paper-cool px-4 py-2.5 font-sans text-[13px] font-bold tracking-tight text-ink shadow-hard-xs"
      >
        <GoogleIcon />
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
