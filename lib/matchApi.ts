"use client";

// Client for the match/subscription backend (api.unknown.chat/match). Ensures an
// anonymous Supabase session, attaches the Bearer token, and surfaces the 402
// paywall so the UI can react. The service wraps responses as {success, data}.

import { getSupabase } from "./supabaseClient";

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
  signInWithEmail: (email: string) => getSupabase().auth.signInWithOtp({ email }),

  // Matches (free)
  listMatches: () => call<{ matches: MatchedPersona[] }>("/matches"),
  createMatch: (m: { persona: unknown; displayName: string; avatar?: string; vibe?: string }) =>
    call<{ match: MatchedPersona }>("/matches", { method: "POST", body: JSON.stringify(m) }),

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

  // Payments — geo-priced; returns a Dodo checkout URL to redirect to.
  checkout: (kind: "subscription" | "topup", urls: { successUrl: string; cancelUrl: string }) =>
    call<{ checkoutUrl: string; price: { label: string; currency: string } }>("/checkout", {
      method: "POST",
      body: JSON.stringify({ kind, ...urls }),
    }),
};
