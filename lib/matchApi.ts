"use client";

// Client for the match/subscription backend (api.unknown.chat/match). Ensures an
// anonymous Supabase session, attaches the Bearer token, and surfaces the 402
// paywall so the UI can react. The service wraps responses as {success, data}.

import { getSupabase } from "./supabaseClient";
import { detectCountry } from "./geo";

const BASE = process.env.NEXT_PUBLIC_MATCH_API_URL || "https://api.unknown.chat/match";

export class MatchApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// True when the error is the paywall / quota gate (402) — the UI shows the
// upgrade sheet instead of an error. reason: "PAYWALL" | "QUOTA_EXHAUSTED".
export function isPaywall(err: unknown): err is MatchApiError {
  return err instanceof MatchApiError && err.status === 402;
}

// Get a valid access token, creating an anonymous session on first use.
async function getToken(): Promise<string> {
  const sb = getSupabase();
  let { data: { session } } = await sb.auth.getSession();
  if (!session) {
    const { data, error } = await sb.auth.signInAnonymously();
    if (error) throw new MatchApiError(401, error.message, "ANON_SIGNIN_FAILED");
    session = data.session;
  }
  if (!session) throw new MatchApiError(401, "no session");
  return session.access_token;
}

async function call<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = json?.error?.code as string | undefined;
    const message = json?.error?.message || res.statusText;
    throw new MatchApiError(res.status, message, code);
  }
  return json.data as T;
}

// ── Domain types (mirror match-service schema) ──
export interface MatchedPersona {
  id: string;
  displayName: string;
  avatar?: string | null;
  vibe?: string | null;
  lastChatAt?: string | null;
  createdAt: string;
}
export interface MatchMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  ts: string;
}

export const matchApi = {
  // Auth helpers
  async currentUser() {
    const { data } = await getSupabase().auth.getUser();
    return data.user; // null until anon session created
  },
  signInWithGoogle: (redirectTo?: string) =>
    getSupabase().auth.signInWithOAuth({ provider: "google", options: { redirectTo } }),

  // Email + password (no OTP). "create" links the credentials to the CURRENT
  // (anonymous) user — keeps their matches. "login" signs into an existing account.
  createPassword: (email: string, password: string) =>
    getSupabase().auth.updateUser({ email, password }),
  loginPassword: (email: string, password: string) =>
    getSupabase().auth.signInWithPassword({ email, password }),
  // Sign out → next match-service call auto-creates a fresh anonymous session,
  // so the user becomes a guest again (their account's matches drop out of view).
  signOut: () => getSupabase().auth.signOut(),

  // Account status — login state, subscription lifecycle, usage.
  me: () =>
    call<{
      isAnonymous: boolean;
      email: string | null;
      subscription: {
        active: boolean;
        state: "active" | "grace" | "none";
        status: string | null;
        currentPeriodEnd: string | null;
      };
      usage: { includedUsed: number; includedQuota: number; includedRemaining: number; topUpRemaining: number };
    }>("/me"),

  // Dodo customer-portal link (update payment / fix failed renewal / cancel).
  portal: (returnUrl?: string) =>
    call<{ url: string }>("/portal", { method: "POST", body: JSON.stringify({ returnUrl }) }),

  // Public geo-resolved price for display (no auth). We pass the browser-detected
  // country since the API isn't behind Cloudflare (no cf-ipcountry server-side),
  // so the correct tier ($2.99 IN/PK/ID/PH, $4.99 rest) is shown. Price is shown
  // in USD; Dodo localizes to the exact local currency at checkout.
  async pricing() {
    const country = await detectCountry();
    const qs = country ? `?country=${encodeURIComponent(country)}` : "";
    const res = await fetch(`${BASE}/pricing${qs}`);
    const json = await res.json().catch(() => ({}));
    return (json.data ?? {}) as {
      country: string | null;
      subscription: { label: string; amount: number; currency: string; tier: string };
    };
  },

  // Matches (free)
  listMatches: () => call<{ matches: MatchedPersona[] }>("/matches"),
  unmatch: (id: string) => call<{ deleted: boolean }>(`/matches/${id}`, { method: "DELETE" }),
  createMatch: (m: { persona: unknown; displayName: string; avatar?: string; vibe?: string }) =>
    call<{ match: MatchedPersona }>("/matches", { method: "POST", body: JSON.stringify(m) }),

  // "Keep this one" — freeze the CURRENT chat's persona. Goes through the
  // chatApp route (which holds the persona server-side) with our Bearer token.
  async keepChat(sessionId: string): Promise<{ match: MatchedPersona }> {
    const token = await getToken();
    const res = await fetch("/api/match/keep", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ sessionId }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new MatchApiError(res.status, json?.error?.message || res.statusText, json?.error?.code);
    }
    return json.data ?? json;
  },

  // Resume + chat (entitlement-gated; send() throws MatchApiError 402 on paywall)
  resume: (matchId: string) =>
    call<{ match: MatchedPersona; conversation: { id: string }; messages: MatchMessage[] }>(
      `/matches/${matchId}/resume`,
      { method: "POST" },
    ),
  send: (conversationId: string, message: string) =>
    call<{ reply: string; billed: string }>(`/conversations/${conversationId}/messages`, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),

  // Payments — geo-priced; returns a Dodo checkout URL to redirect to. We send the
  // detected country so the backend bills the correct tier (no cf-ipcountry there).
  async checkout(kind: "subscription" | "topup", urls: { successUrl: string; cancelUrl: string }) {
    const country = await detectCountry();
    return call<{ checkoutUrl: string; price: { label: string; currency: string } }>("/checkout", {
      method: "POST",
      body: JSON.stringify({ kind, country, ...urls }),
    });
  },
};
