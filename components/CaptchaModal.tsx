"use client";

// Modal that loads Cloudflare Turnstile script, renders the widget, and calls
// onSuccess(token) when the user passes. Caller passes the token to /api/chat/start.

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement | string,
        opts: {
          sitekey: string;
          callback?: (token: string) => void;
          "error-callback"?: () => void;
          "expired-callback"?: () => void;
          theme?: "light" | "dark" | "auto";
        },
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId?: string) => void;
    };
    onTurnstileReady?: () => void;
  }
}

interface Props {
  siteKey: string;
  onSuccess: (token: string) => void;
  onCancel: () => void;
}

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let scriptLoading: Promise<void> | null = null;

function loadScriptOnce(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptLoading) return scriptLoading;

  scriptLoading = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_URL}"]`);
    if (existing) {
      const wait = () => (window.turnstile ? resolve() : setTimeout(wait, 50));
      wait();
      return;
    }
    const s = document.createElement("script");
    s.src = SCRIPT_URL;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("turnstile load failed"));
    document.head.appendChild(s);
  });
  return scriptLoading;
}

export function CaptchaModal({ siteKey, onSuccess, onCancel }: Props) {
  const widgetRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    loadScriptOnce()
      .then(() => {
        if (cancelled) return;
        if (!window.turnstile || !widgetRef.current) {
          setError("could not load verification");
          setLoading(false);
          return;
        }
        try {
          widgetIdRef.current = window.turnstile.render(widgetRef.current, {
            sitekey: siteKey,
            callback: (token: string) => onSuccess(token),
            "error-callback": () => setError("verification failed, try again"),
            "expired-callback": () => {
              if (widgetIdRef.current && window.turnstile) {
                window.turnstile.reset(widgetIdRef.current);
              }
            },
            theme: "light",
          });
          setLoading(false);
        } catch {
          setError("could not render verification");
          setLoading(false);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setError("could not load verification");
        setLoading(false);
      });

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /* ignore */ }
      }
    };
  }, [siteKey, onSuccess]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
        <h2 className="text-lg font-semibold tracking-tight">quick check</h2>
        <p className="mt-1 text-sm text-neutral-600">
          Just making sure you're a real person before connecting you to another stranger.
        </p>

        <div className="mt-5 flex justify-center min-h-[70px]">
          {loading && <span className="text-xs text-neutral-400">loading…</span>}
          <div ref={widgetRef} />
        </div>

        {error && (
          <p className="mt-2 text-xs text-rose-600 text-center">{error}</p>
        )}

        <button
          type="button"
          onClick={onCancel}
          className="mt-5 w-full text-xs text-neutral-500 hover:text-neutral-800 py-2"
        >
          cancel
        </button>
      </div>
    </div>
  );
}
