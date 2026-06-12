"use client";

// unknown+ beta registration. Posts to Formspree (AJAX, no redirect). Collects
// email (we notify on launch) + Instagram handle (we also ping there). Early
// registrants get 1 month of unknown+ free when it launches.

import { useState } from "react";
import { SOCIALS } from "@/lib/site";

const FORMSPREE = "https://formspree.io/f/mnjygegr";
const IG = SOCIALS.find((s) => s.name === "Instagram" && s.url);

type Status = "idle" | "sending" | "done" | "error";

export function PlusBetaForm() {
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || status === "sending") return;
    setStatus("sending");
    try {
      const res = await fetch(FORMSPREE, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          instagram: instagram.trim(),
          _subject: "unknown+ beta signup",
        }),
      });
      setStatus(res.ok ? "done" : "error");
    } catch {
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-3xl border-[2.5px] border-ink bg-yellow-soft p-6 text-center shadow-hard rotate-[0.3deg]">
        <div className="text-3xl">🎉</div>
        <h3 className="mt-2 font-sans text-xl font-bold tracking-tight text-ink">you&apos;re on the list!</h3>
        <p className="mt-1.5 font-display text-[15px] leading-relaxed text-ink-soft">
          we&apos;ll email you the moment unknown+ goes live — and your{" "}
          <span className="font-bold text-ink">first month is free</span>. 🎁
        </p>
        {IG && (
          <a
            href={IG.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl border-2 border-ink bg-red px-4 py-2 font-sans text-[13px] font-bold tracking-tight text-paper-cool shadow-hard-xs"
          >
            follow {IG.handle} for updates
          </a>
        )}
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-3xl border-[2.5px] border-ink bg-paper-cool p-6 shadow-hard -rotate-[0.3deg]"
    >
      <div className="text-center">
        <span className="inline-block rounded-full border-[1.5px] border-ink bg-lilac px-3 py-0.5 font-display text-xs font-bold text-ink -rotate-1">
          beta · 1 month free 🎁
        </span>
        <h3 className="mt-3 font-sans text-xl lg:text-2xl font-bold tracking-tight text-ink">
          get unknown<span className="text-red">+</span> free
        </h3>
        <p className="mt-1.5 font-display text-[14px] leading-relaxed text-ink-soft">
          register for the beta — we&apos;ll notify you when it&apos;s live and you get your{" "}
          <span className="font-bold text-ink">first month free</span>.
        </p>
      </div>

      <div className="mt-5 space-y-2.5">
        <label className="block">
          <span className="mb-1 block font-display text-[13px] font-bold text-ink">your email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="w-full rounded-xl border-2 border-ink bg-paper px-3.5 py-2.5 font-sans text-[14px] text-ink outline-none placeholder:text-ink-mute focus:-translate-y-px transition-transform"
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-display text-[13px] font-bold text-ink">
            instagram <span className="font-normal text-ink-mute">(optional — we&apos;ll ping you there too)</span>
          </span>
          <input
            type="text"
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="@yourhandle"
            className="w-full rounded-xl border-2 border-ink bg-paper px-3.5 py-2.5 font-sans text-[14px] text-ink outline-none placeholder:text-ink-mute focus:-translate-y-px transition-transform"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={status === "sending"}
        className="mt-4 w-full rounded-xl border-2 border-ink bg-red px-5 py-3 font-sans font-bold tracking-tight text-paper-cool shadow-hard transition-transform hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {status === "sending" ? "reserving…" : "reserve my free month →"}
      </button>

      {status === "error" && (
        <p className="mt-2.5 text-center font-display text-[13px] text-red">
          hmm, that didn&apos;t go through — try again in a sec?
        </p>
      )}
      <p className="mt-2.5 text-center font-display text-[11px] text-ink-mute">
        no spam, ever. just one heads-up when unknown+ launches.
      </p>
    </form>
  );
}
