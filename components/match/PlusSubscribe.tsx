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

import Link from "next/link";
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
  const [dayPassLabel, setDayPassLabel] = useState<string>("$1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const pendingKind = useRef<"subscription" | "daypass">("subscription");

  // Geo price for display.
  useEffect(() => {
    let alive = true;
    matchApi
      .pricing()
      .then((p) => {
        if (!alive) return;
        setPriceLabel(p.subscription?.label ?? null);
        if (p.dayPass?.label) setDayPassLabel(p.dayPass.label);
      })
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
    <div className="grid gap-4 lg:grid-cols-[.86fr_1fr_.86fr] lg:items-stretch">
      {/* FREE */}
      <Card>
        <div className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-ink-mute">free</div>
        <div className="mt-1.5 inline-flex items-baseline gap-1.5">
          <span className="font-sans text-4xl font-bold text-ink">$0</span>
          <span className="font-display text-[16px] text-ink-mute">forever</span>
        </div>
        <p className="mt-2.5 font-serif italic text-[15px] leading-snug text-ink-soft">
          The 3am version. Good enough that most people never leave.
        </p>
        <ul className="mt-4 space-y-2.5">
          <Feature>stranger chat, unlimited</Feature>
          <Feature>1 AI date a day</Feature>
          <Feature no>20-minute cap on chats</Feature>
          <Feature no>nothing is saved</Feature>
        </ul>
        <Link href="/" className="om-cta mt-auto pt-5">
          <span className="block w-full rounded-xl border-2 border-ink bg-paper-cool px-5 py-3 font-sans font-bold tracking-tight text-ink">
            you&apos;re on this →
          </span>
        </Link>
      </Card>

      {/* PLUS — the pick */}
      <Card highlight>
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 -rotate-2 rounded-full border-[1.5px] border-ink bg-red px-3 py-0.5 font-sans text-[11px] font-bold text-paper-cool whitespace-nowrap">
          most people pick this
        </span>
        <div className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-ink-mute">unknown plus</div>
        <div className="mt-1 inline-flex items-baseline gap-1.5">
          <span className="font-sans text-5xl font-bold text-ink">{priceLabel ?? "…"}</span>
          <span className="font-display text-[16px] text-ink-mute">/ month</span>
        </div>
        <ul className="mt-4 space-y-2.5">
          <Feature icon="♾️">everything in free, <b>no limits</b></Feature>
          <Feature icon="🎙️"><b>unlimited voice dates</b> — talk as long as you like</Feature>
          <Feature icon="💘"><b>full transcript + her private notes</b></Feature>
          <Feature icon="💞">unlimited AI dates, match anyone</Feature>
          <Feature icon="💾">save every chat — any device</Feature>
          <Feature icon="🧠">they remember you &amp; grow with every chat</Feature>
        </ul>
        <button
          onClick={() => buy("subscription")}
          disabled={busy || acct === null}
          className="om-cta relative mt-auto w-full overflow-hidden rounded-xl border-2 border-ink bg-red px-5 py-3 font-sans font-bold tracking-tight text-paper-cool shadow-hard"
        >
          <span className="om-shimmer absolute inset-0" aria-hidden />
          <span className="relative">{busy ? "opening checkout…" : acct === null ? "…" : acct.loggedIn ? cta : "log in to subscribe →"}</span>
        </button>
        <p className="mt-2 font-display text-[14px] text-ink-mute">cancel anytime · 7-day refund, no questions</p>
      </Card>

      {/* 2-DAY PASS */}
      <Card>
        <div className="font-sans text-[11px] font-bold uppercase tracking-[0.18em] text-ink-mute">2-day pass</div>
        <div className="mt-1.5 inline-flex items-baseline gap-1.5">
          <span className="font-sans text-4xl font-bold text-ink">{dayPassLabel}</span>
          <span className="font-display text-[16px] text-ink-mute">one-time</span>
        </div>
        <p className="mt-2.5 font-serif italic text-[15px] leading-snug text-ink-soft">
          For a weekend, or one night you don&apos;t want to end.
        </p>
        <ul className="mt-4 space-y-2.5">
          <Feature icon="♾️">everything in plus, for 48 hours</Feature>
          <Feature icon="🎙️">unlimited voice dates</Feature>
          <Feature icon="💾">save &amp; pick up while it&apos;s active</Feature>
          <Feature no>chats expire when it ends</Feature>
        </ul>
        <button
          onClick={() => buy("daypass")}
          disabled={busy || acct === null}
          className="om-cta mt-auto w-full rounded-xl border-2 border-ink bg-ink px-5 py-3 font-sans font-bold tracking-tight text-paper-cool"
          style={{ boxShadow: "4px 4px 0 #e8503f" }}
        >
          {busy ? "opening…" : acct === null ? "…" : acct.loggedIn ? `get 2-day pass · ${dayPassLabel}` : "log in to get 2-day pass →"}
        </button>
        <p className="mt-2 font-display text-[14px] text-ink-mute">non-refundable</p>
      </Card>
    </div>

      {error && (
        <p className="mt-3 text-center font-display text-[13px] text-red">couldn&apos;t start checkout — try again?</p>
      )}
      {acct?.loggedIn === false && (
        <p className="mt-2 text-center font-display text-[12px] text-ink-mute">
          you&apos;ll log in first so your purchase sticks to your account.
        </p>
      )}

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

function Feature({ icon, children, no }: { icon?: string; children: React.ReactNode; no?: boolean }) {
  return (
    <li className={`flex items-start gap-2.5 text-left ${no ? "text-ink-mute" : "text-ink"}`}>
      <span className={`mt-px text-[15px] leading-none ${no ? "text-ink-faint" : ""}`} aria-hidden>{icon ?? (no ? "✕" : "✓")}</span>
      <span className="font-sans text-[13.5px] leading-snug">{children}</span>
    </li>
  );
}

function Card({ children, highlight }: { children: React.ReactNode; highlight?: boolean }) {
  return (
    <div
      className={`relative flex h-full flex-col rounded-3xl border-[2.5px] border-ink p-6 text-center ${
        highlight
          ? "bg-gradient-to-br from-[#FBDDD6] via-[#EFE0F2] to-[#F8F0CE] shadow-hard-lg lg:-my-2"
          : "bg-paper-cool shadow-hard -rotate-[0.3deg]"
      }`}
    >
      {children}
    </div>
  );
}
