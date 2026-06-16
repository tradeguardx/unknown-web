"use client";

// Shared, cached account state — fixes the menu "flicker" where every open fired
// a fresh /me call (and 3 components each fetched it). Now:
//   1. basic info (logged-in + email) comes INSTANTLY from the persisted Supabase
//      session (localStorage, no network) → no wrong-state flash,
//   2. subscription/usage comes from /me ONCE, cached + deduped module-wide and
//      reused across the menu / sidebar / account block.
// Call clearAccountCache() after login/logout to force a refresh.

import { useEffect, useState } from "react";
import { getSupabase } from "./supabaseClient";
import { matchApi } from "./matchApi";

export interface Account {
  loggedIn: boolean;
  email: string | null;
  subscriptionActive: boolean;
  subState: "active" | "grace" | "none";
  renewsAt: string | null;
  usage: {
    includedUsed: number;
    includedQuota: number;
    includedRemaining: number;
    topUpRemaining: number;
  } | null;
}

let cache: Account | null = null;
let inflight: Promise<Account | null> | null = null;

export function clearAccountCache() {
  cache = null;
  inflight = null;
}

async function load(): Promise<Account | null> {
  try {
    // If the user just logged in (incl. via OAuth redirect), migrate any matches
    // they made as a guest into this account before reading /me.
    await matchApi.claimPending();
    const m = await matchApi.me();
    cache = {
      loggedIn: !m.isAnonymous,
      email: m.email,
      subscriptionActive: m.subscription.active,
      subState: m.subscription.state,
      renewsAt: m.subscription.currentPeriodEnd,
      usage: m.usage,
    };
    return cache;
  } catch {
    return null;
  }
}

export function useAccount(): Account | null {
  const [acct, setAcct] = useState<Account | null>(cache);

  useEffect(() => {
    let alive = true;
    if (cache) {
      setAcct(cache);
      return;
    }

    // Instant basic state from the persisted session (no network) so the menu
    // renders the right shape immediately instead of flashing guest → logged-in.
    getSupabase()
      .auth.getSession()
      .then(({ data }) => {
        const u = data.session?.user;
        if (alive && u && !cache) {
          setAcct((a) =>
            a ?? {
              loggedIn: !u.is_anonymous,
              email: u.email ?? null,
              subscriptionActive: false,
              subState: "none",
              renewsAt: null,
              usage: null,
            },
          );
        }
      });

    // Full info (subscription/usage) — fetched once, deduped, cached.
    inflight = inflight ?? load();
    inflight.then((a) => {
      if (alive && a) setAcct(a);
    });

    return () => {
      alive = false;
    };
  }, []);

  return acct;
}
