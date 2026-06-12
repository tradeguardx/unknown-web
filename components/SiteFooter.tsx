// Site-wide footer shown on non-chat pages. Carries the EXPLICIT AI-nature
// disclosure (Anthropic's TOS expects it outside the chat) plus links.
//
// Visual treatment matches the new paper aesthetic — dashed-divider on top,
// small Caveat/Space Grotesk hierarchy. The "are AI personas, not real people"
// line stays verbatim: this is one of the tier-1 explicit disclosure surfaces
// per the feedback_disclosure memory.

import Link from "next/link";

const YEAR = new Date().getFullYear();

export function SiteFooter() {
  return (
    <footer className="max-w-md lg:max-w-3xl mx-auto w-full mt-12 px-5 lg:px-8 py-7 border-t-[1.5px] border-dashed border-paper-deep">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-3 font-sans text-xs">
        <Link href="/" className="text-ink-mute hover:text-ink">home</Link>
        <span aria-hidden className="text-ink-faint">·</span>
        <Link href="/about" className="text-ink-mute hover:text-ink">about</Link>
        <span aria-hidden className="text-ink-faint">·</span>
        <Link href="/faq" className="text-ink-mute hover:text-ink">faq</Link>
        <span aria-hidden className="text-ink-faint">·</span>
        <Link href="/plus" className="text-ink-mute hover:text-ink">unknown+</Link>
        <span aria-hidden className="text-ink-faint">·</span>
        <Link href="/terms" className="text-ink-mute hover:text-ink">terms</Link>
        <span aria-hidden className="text-ink-faint">·</span>
        <Link href="/privacy" className="text-ink-mute hover:text-ink">privacy</Link>
        <span aria-hidden className="text-ink-faint">·</span>
        <Link href="/refund" className="text-ink-mute hover:text-ink">refund</Link>
      </div>
      <div className="font-display text-[15px] text-ink-soft leading-relaxed mb-2">
        The strangers on unknown.chat are AI personas, not real people. By using this site
        you agree to the{" "}
        <Link href="/terms" className="underline text-red font-semibold">terms</Link>{" "}
        and{" "}
        <Link href="/privacy" className="underline text-red font-semibold">privacy policy</Link>.
      </div>
      <div className="font-mono text-[11px] text-ink-faint">© {YEAR} unknown.chat</div>
    </footer>
  );
}
