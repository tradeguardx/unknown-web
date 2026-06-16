"use client";

// Account block (menu footer). Shows the subscription lifecycle:
//   active → unknown+ · usage · renews date + "manage subscription"
//   grace  → ⚠ payment failed + "update payment" (Dodo portal)
//   none   → free plan
// Uses the shared cached account state (no per-open refetch).

import Link from "next/link";
import { matchApi } from "@/lib/matchApi";
import { useAccount } from "@/lib/useAccount";

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

export function AccountMenu() {
  const acct = useAccount();
  if (!acct || !acct.loggedIn) return null;

  async function openPortal() {
    try {
      const { url } = await matchApi.portal(typeof window !== "undefined" ? window.location.href : undefined);
      if (url) window.location.href = url;
    } catch {
      /* ignore */
    }
  }

  return (
    <div>
      <div className="font-sans text-[11px] font-bold uppercase tracking-wider text-ink-mute mb-1">account</div>
      {acct.email && <div className="font-sans text-[15px] text-ink truncate">{acct.email}</div>}

      {acct.subState === "grace" ? (
        <div className="mt-1.5">
          <div className="font-sans text-[12px] font-bold text-red">⚠ payment failed</div>
          <div className="font-sans text-[12px] text-ink-mute">update your card to keep unknown plus</div>
          <button
            onClick={openPortal}
            className="mt-1.5 rounded-full border-[1.5px] border-ink bg-red text-paper-cool px-3 py-1 font-sans text-[12px] font-bold shadow-hard-xs"
          >
            update payment →
          </button>
        </div>
      ) : acct.subState === "active" ? (
        <>
          <div className="font-sans text-[12px] text-ink-mute mt-0.5">
            <span className="font-bold text-red">unknown plus</span>
            {acct.usage ? ` · ${acct.usage.includedUsed.toLocaleString()}/${acct.usage.includedQuota.toLocaleString()} msgs` : ""}
            {acct.renewsAt ? ` · renews ${fmtDate(acct.renewsAt)}` : ""}
          </div>
          <button onClick={openPortal} className="mt-1 font-sans text-[12px] underline text-ink-mute hover:text-ink">
            manage subscription
          </button>
        </>
      ) : acct.passActive ? (
        <div className="mt-0.5">
          <div className="font-sans text-[12px] text-ink">
            <span className="font-bold text-red">🎟️ explore pass</span> · unlimited today
          </div>
          <Link href="/plus" className="mt-1 inline-block font-sans text-[12px] font-bold text-red underline">
            make it permanent →
          </Link>
        </div>
      ) : (
        <div className="mt-0.5">
          <div className="font-sans text-[12px] text-ink-mute">free plan</div>
          <Link href="/plus" className="mt-1 inline-block font-sans text-[12px] font-bold text-red underline">
            get unknown plus →
          </Link>
        </div>
      )}
    </div>
  );
}
