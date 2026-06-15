"use client";

// Account block (email + plan) for the menu footer. Uses the shared cached
// account state so it renders instantly and doesn't refetch on every menu open.

import { useAccount } from "@/lib/useAccount";

export function AccountMenu() {
  const acct = useAccount();
  if (!acct || !acct.loggedIn) return null;

  return (
    <div>
      <div className="font-sans text-[11px] font-bold uppercase tracking-wider text-ink-mute mb-1">account</div>
      {acct.email && <div className="font-sans text-[15px] text-ink truncate">{acct.email}</div>}
      <div className="font-sans text-[12px] text-ink-mute mt-0.5">
        {acct.subscriptionActive && acct.usage
          ? `unknown+ · ${acct.usage.includedUsed.toLocaleString()} / ${acct.usage.includedQuota.toLocaleString()} messages`
          : "free plan"}
      </div>
    </div>
  );
}
