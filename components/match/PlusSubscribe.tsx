"use client";

// The live unknown+ subscribe card on /plus. One component, four states:
//   loading → skeleton
//   active  → "you're on unknown+ ✓" · usage · renews date · manage (Dodo portal)
//   grace   → "⚠ payment failed" · update payment (Dodo portal)
//   none    → "subscribe {geo price}/mo" → Dodo checkout
//            (guest → opens login first, then continues straight to checkout)
//
// Geo price comes from the public /pricing endpoint ($2.99 IN/PK/ID/PH, $4.99
// rest). On success Dodo returns to ?return=<url> (the chat the user came from)
// so the conversation resumes after paying; otherwise back here.

import { useEffect, useRef, useState } from "react";
import { matchApi } from "@/lib/matchApi";
import { useAccount, clearAccountCache } from "@/lib/useAccount";
import { UpgradeAccount } from "./UpgradeAccount";

function fmtExpiry(iso: string): string {
  try {
    const h = Math.round((new Date(iso).getTime() - Date.now()) / 3_600_000);
    return h <= 1 ? "expires within an hour" : `${h}h left`;
  } catch {
    return "";
  }
}

function fmtDate(iso: string | null): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return "";
  }
}

export function PlusSubscribe() {
  const acct = useAccount();
  const [priceLabel, setPriceLabel] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const pendingKind = useRef<"subscription" | "daypass">("subscription");

  // Geo price for display.
  useEffect(() => {
    let alive = true;
    matchApi
      .pricing()
      .then((p) => alive && setPriceLabel(p.subscription?.label ?? null))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Where Dodo returns after checkout — the chat the user came from, else here.
  function successUrl(): string {
    if (typeof window === "undefined") return "";
    const ret = new URLSearchParams(window.location.search).get("return");
    return ret || `${window.location.origin}/connections`;
  }
  function here(): string {
    return typeof window !== "undefined" ? window.location.href : "";
  }

  async function startCheckout(kind: "subscription" | "daypass") {
    setBusy(true);
    setError(false);
    try {
      const { checkoutUrl } = await matchApi.checkout(kind, {
        successUrl: successUrl(),
        cancelUrl: here(),
      });
      if (checkoutUrl) window.location.href = checkoutUrl;
      else throw new Error("no checkout url");
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  // Guest taps a buy button → log in first, then continue to that checkout.
  function buy(kind: "subscription" | "daypass") {
    if (acct?.loggedIn) startCheckout(kind);
    else {
      pendingKind.current = kind;
      setLoginOpen(true);
    }
  }

  async function openPortal() {
    setBusy(true);
    try {
      const { url } = await matchApi.portal(here());
      if (url) window.location.href = url;
      else setBusy(false);
    } catch {
      setBusy(false);
    }
  }

  // ── Subscribed: active ──
  if (acct?.subState === "active") {
    return (
      <Card>
        <div className="text-3xl">✓</div>
        <h3 className="mt-2 font-sans text-xl font-bold tracking-tight text-ink">
          you&apos;re on unknown <span className="text-red">plus</span>
        </h3>
        <p className="mt-1.5 font-display text-[14px] leading-relaxed text-ink-soft">
          unlimited chats, no skips, every connection saved.
          {acct.renewsAt ? ` renews ${fmtDate(acct.renewsAt)}.` : ""}
        </p>
        {acct.usage && (
          <p className="mt-1 font-display text-[12px] text-ink-mute">
            {acct.usage.includedUsed.toLocaleString()} / {acct.usage.includedQuota.toLocaleString()} messages this cycle
            {acct.usage.topUpRemaining > 0 ? ` · +${acct.usage.topUpRemaining.toLocaleString()} top-up` : ""}
          </p>
        )}
        <button
          onClick={openPortal}
          disabled={busy}
          className="mt-4 w-full rounded-xl border-2 border-ink bg-paper-cool px-5 py-2.5 font-sans font-bold tracking-tight text-ink shadow-hard-xs disabled:opacity-60"
        >
          {busy ? "opening…" : "manage subscription →"}
        </button>
      </Card>
    );
  }

  // ── Subscribed: grace (failed renewal, still has access) ──
  if (acct?.subState === "grace") {
    return (
      <Card>
        <div className="text-3xl">⚠</div>
        <h3 className="mt-2 font-sans text-xl font-bold tracking-tight text-red">payment failed</h3>
        <p className="mt-1.5 font-display text-[14px] leading-relaxed text-ink-soft">
          we couldn&apos;t charge your card. update your payment method to keep unknown plus — you still have access for now.
        </p>
        <button
          onClick={openPortal}
          disabled={busy}
          className="mt-4 w-full rounded-xl border-2 border-ink bg-red px-5 py-3 font-sans font-bold tracking-tight text-paper-cool shadow-hard disabled:opacity-60"
        >
          {busy ? "opening…" : "update payment →"}
        </button>
      </Card>
    );
  }

  // ── Active 1-day explore pass (one-time) ──
  if (acct?.passActive) {
    return (
      <Card>
        <div className="text-3xl">🎟️</div>
        <h3 className="mt-2 font-sans text-xl font-bold tracking-tight text-ink">explore pass active</h3>
        <p className="mt-1.5 font-display text-[14px] leading-relaxed text-ink-soft">
          unlimited chats{acct.passExpiresAt ? ` · ${fmtExpiry(acct.passExpiresAt)}` : ""}.
        </p>
        <button
          onClick={() => buy("subscription")}
          disabled={busy}
          className="mt-4 w-full rounded-xl border-2 border-ink bg-ink px-5 py-3 font-sans font-bold tracking-tight text-paper-cool shadow-hard disabled:opacity-60"
        >
          {busy ? "opening…" : "make it permanent — subscribe →"}
        </button>
      </Card>
    );
  }

  // ── Not subscribed (or still loading) — the subscribe CTA ──
  const priceSuffix = priceLabel ? `${priceLabel}/mo` : "";
  const cta = priceLabel ? `subscribe · ${priceSuffix} →` : "subscribe →";

  return (
    <>
      <Card>
        <div className="inline-flex items-baseline gap-1.5">
          <span className="font-sans text-4xl font-bold text-ink">{priceLabel ?? "…"}</span>
          <span className="font-display text-ink-mute">/ month</span>
        </div>
        <p className="mt-2 font-display text-[13px] text-ink-mute">
          shown in your local currency at checkout · cancel anytime · 7-day money-back
        </p>

        <button
          onClick={() => buy("subscription")}
          disabled={busy || acct === null}
          className="mt-4 w-full rounded-xl border-2 border-ink bg-ink px-5 py-3 font-sans font-bold tracking-tight text-paper-cool shadow-hard transition-transform hover:-translate-y-0.5 disabled:opacity-60"
        >
          {busy ? "opening checkout…" : acct === null ? "…" : acct.loggedIn ? cta : "log in to subscribe →"}
        </button>

        {/* Low-commitment alternative — a $1 one-time day pass. */}
        <div className="my-3 flex items-center gap-2 text-ink-mute">
          <span className="h-px flex-1 bg-ink/15" />
          <span className="font-display text-[11px]">not ready to commit?</span>
          <span className="h-px flex-1 bg-ink/15" />
        </div>
        <button
          onClick={() => buy("daypass")}
          disabled={busy || acct === null}
          className="w-full rounded-xl border-2 border-ink bg-paper-cool px-5 py-2.5 font-sans text-[14px] font-bold tracking-tight text-ink shadow-hard-xs disabled:opacity-60"
        >
          🎟️ 1-day explore pass · $1
        </button>
        <p className="mt-1.5 font-display text-[12px] text-ink-mute">
          unlimited chats for 24 hours · one-time, no subscription
        </p>

        {error && (
          <p className="mt-2 font-display text-[13px] text-red">couldn&apos;t start checkout — try again?</p>
        )}
        {acct?.loggedIn === false && (
          <p className="mt-2 font-display text-[12px] text-ink-mute">
            you&apos;ll log in first so your purchase sticks to your account.
          </p>
        )}
      </Card>

      {/* Guest → log in, then continue straight to checkout. */}
      {loginOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/60 px-6"
          onClick={() => setLoginOpen(false)}
        >
          <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <UpgradeAccount
              forceShow
              title="log in to subscribe"
              subtitle="your subscription (and your connections) stay tied to your account."
              onDone={() => {
                setLoginOpen(false);
                clearAccountCache();
                startCheckout(pendingKind.current);
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-3xl border-[2.5px] border-ink bg-paper-cool p-6 text-center shadow-hard -rotate-[0.3deg]">
      {children}
    </div>
  );
}
