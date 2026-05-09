// Site-wide footer shown on all non-chat pages. Carries the legal disclosure
// row (Anthropic's TOS expects clear AI-nature disclosure outside the chat) plus
// the standard about/terms/privacy nav and copyright.

import Link from "next/link";

const YEAR = new Date().getFullYear();

export function SiteFooter() {
  return (
    <footer className="border-t border-neutral-200 bg-white mt-16">
      <div className="max-w-3xl mx-auto px-4 py-8 text-xs text-neutral-500 space-y-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link href="/about" className="hover:text-neutral-900">about</Link>
          <span aria-hidden>·</span>
          <Link href="/terms" className="hover:text-neutral-900">terms</Link>
          <span aria-hidden>·</span>
          <Link href="/privacy" className="hover:text-neutral-900">privacy</Link>
          <span aria-hidden>·</span>
          <Link href="/" className="hover:text-neutral-900">home</Link>
        </div>
        <div className="text-neutral-400 leading-relaxed">
          The strangers on unknown.chat are AI personas, not real people. By using this site
          you agree to the <Link href="/terms" className="underline hover:text-neutral-900">terms</Link> and{" "}
          <Link href="/privacy" className="underline hover:text-neutral-900">privacy policy</Link>.
        </div>
        <div className="text-neutral-400">© {YEAR} unknown.chat</div>
      </div>
    </footer>
  );
}
