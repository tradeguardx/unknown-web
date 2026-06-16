"use client";

// Browser-side Supabase client for the match/subscription feature. Lazily
// constructed on first use (client only) so SSR/prerender never builds it.
//
// Auth model: anonymous sign-in on first use → a stable user id with no signup.
// Linking email/Google later keeps the SAME id (no temp→user migration). The
// access token is sent as Bearer to the match-service (lib/matchApi).
//
// Env (public — safe in the browser):
//   NEXT_PUBLIC_SUPABASE_URL       (defaults to the project URL below)
//   NEXT_PUBLIC_SUPABASE_ANON_KEY  (Supabase → Settings → API → anon/publishable)

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://eppdibglxxapupwgssxu.supabase.co";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;
  client = createClient(URL, ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true, // handles OAuth redirect back
    },
  });
  return client;
}
