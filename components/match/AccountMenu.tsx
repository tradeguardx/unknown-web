"use client";

// Account section for the main menu drawer — shows for LOGGED-IN users only
// (email + plan + log out). Guests see nothing here (they log in via the
// connection login gate). Lets users manage their account from anywhere.

import { useEffect, useState } from "react";
import { matchApi } from "@/lib/matchApi";

export function AccountMenu() {
  const [acct, setAcct] = useState<Awaited<ReturnType<typeof matchApi.me>> | null>(null);

  useEffect(() => {
    let alive = true;
    matchApi.me().then((m) => alive && setAcct(m)).catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  if (!acct || acct.isAnonymous) return null;

  return (
    <div className="mb-2 pb-3 border-b-[1.5px] border-dashed border-paper-deep">
      <div className="font-display text-[15px] text-ink-mute mb-1 font-bold">account</div>
      {acct.email && (
        <div className="font-sans text-[15px] text-ink truncate">{acct.email}</div>
      )}
      <div className="font-display text-[12px] text-ink-mute mt-0.5">
        {acct.subscription.active
          ? `unknown+ · ${acct.usage.includedUsed.toLocaleString()} / ${acct.usage.includedQuota.toLocaleString()} messages`
          : "free plan"}
      </div>
      <button
        onClick={async () => {
          await matchApi.signOut();
          window.location.href = "/";
        }}
        className="mt-2 font-sans text-[15px] font-semibold text-red tracking-[-0.015em]"
      >
        log out
      </button>
    </div>
  );
}
