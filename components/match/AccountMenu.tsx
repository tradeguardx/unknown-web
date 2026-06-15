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
    <div>
      <div className="font-sans text-[11px] font-bold uppercase tracking-wider text-ink-mute mb-1">account</div>
      {acct.email && (
        <div className="font-sans text-[15px] text-ink truncate">{acct.email}</div>
      )}
      <div className="font-sans text-[12px] text-ink-mute mt-0.5">
        {acct.subscription.active
          ? `unknown+ · ${acct.usage.includedUsed.toLocaleString()} / ${acct.usage.includedQuota.toLocaleString()} messages`
          : "free plan"}
      </div>
    </div>
  );
}
