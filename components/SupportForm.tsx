"use client";

// Support request form. Posts to the existing Formspree endpoint (AJAX, no
// redirect). Asks for a contact (email OR Instagram) + a description of the
// issue. We aim to resolve within an hour.

import { useState } from "react";

const FORMSPREE = "https://formspree.io/f/mnjygegr";

type Status = "idle" | "sending" | "done" | "error";

export function SupportForm() {
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [issue, setIssue] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const canSend = (email.trim() || instagram.trim()) && issue.trim().length >= 5;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSend || status === "sending") return;
    setStatus("sending");
    try {
      const res = await fetch(FORMSPREE, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          instagram: instagram.trim(),
          issue: issue.trim(),
          _subject: "support request · unknown.chat",
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
        <div className="text-3xl">✅</div>
        <h3 className="mt-2 font-sans text-xl font-bold tracking-tight text-ink">got it — we&apos;re on it</h3>
        <p className="mt-1.5 font-display text-[15px] leading-relaxed text-ink-soft">
          we&apos;ll get back to you{" "}
          <span className="font-bold text-ink">within an hour</span> at{" "}
          <span className="font-bold text-ink">{email.trim() || instagram.trim()}</span>. hang tight 💛
        </p>
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
          ⏱️ usually fixed within an hour
        </span>
        <h3 className="mt-3 font-sans text-xl lg:text-2xl font-bold tracking-tight text-ink">
          having an issue? tell us
        </h3>
        <p className="mt-1.5 font-display text-[14px] leading-relaxed text-ink-soft">
          leave your email or instagram and what went wrong — we&apos;ll sort it out fast.
        </p>
      </div>

      <div className="mt-5 space-y-2.5">
        <label className="block font-sans text-[13px] font-bold text-ink">how can we reach you?</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your email"
          className="w-full rounded-xl border-2 border-ink bg-paper px-3.5 py-2.5 font-sans text-[14px] text-ink outline-none placeholder:text-ink-mute"
        />
        <div className="flex items-center gap-2 text-ink-mute">
          <span className="h-px flex-1 bg-ink/15" />
          <span className="font-display text-[11px]">or</span>
          <span className="h-px flex-1 bg-ink/15" />
        </div>
        <input
          type="text"
          value={instagram}
          onChange={(e) => setInstagram(e.target.value)}
          placeholder="@your instagram handle"
          className="w-full rounded-xl border-2 border-ink bg-paper px-3.5 py-2.5 font-sans text-[14px] text-ink outline-none placeholder:text-ink-mute"
        />
      </div>

      <div className="mt-4">
        <label className="block font-sans text-[13px] font-bold text-ink">what&apos;s the issue?</label>
        <textarea
          value={issue}
          onChange={(e) => setIssue(e.target.value)}
          rows={4}
          placeholder="tell us what happened — payment, login, a bug, anything…"
          className="mt-1.5 w-full resize-y rounded-xl border-2 border-ink bg-paper px-3.5 py-2.5 font-sans text-[14px] text-ink outline-none placeholder:text-ink-mute"
        />
      </div>

      <button
        type="submit"
        disabled={!canSend || status === "sending"}
        className="mt-4 w-full rounded-xl border-2 border-ink bg-ink px-5 py-3 font-sans font-bold tracking-tight text-paper-cool shadow-hard transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {status === "sending" ? "sending…" : "send — we'll reply within an hour →"}
      </button>

      {status === "error" && (
        <p className="mt-2.5 text-center font-sans text-[13px] font-semibold text-red">
          hmm, that didn&apos;t go through — try again in a sec?
        </p>
      )}
      <p className="mt-2.5 text-center font-display text-[11px] text-ink-mute">
        we read every message — real humans, fast replies.
      </p>
    </form>
  );
}
