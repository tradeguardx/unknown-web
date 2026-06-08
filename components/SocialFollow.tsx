// "connect & follow us" row — renders a follow link for each entry in SOCIALS
// that has a url. Data-driven: add Twitter/X to SOCIALS in lib/site.ts and it
// appears here automatically. Renders nothing if no socials are configured.

import { SOCIALS } from "@/lib/site";

function Icon({ name, className }: { name: string; className?: string }) {
  if (name === "Instagram") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
        <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
        <circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" />
      </svg>
    );
  }
  if (name === "Twitter" || name === "X") {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
        <path d="M18.244 2H21.5l-7.5 8.57L22.5 22h-6.59l-5.16-6.74L4.8 22H1.54l8.02-9.17L1.5 2h6.75l4.66 6.16L18.244 2Zm-1.16 18h1.83L7.01 3.9H5.05l12.034 16.1Z" />
      </svg>
    );
  }
  return null;
}

export function SocialFollow({ className = "" }: { className?: string }) {
  const links = SOCIALS.filter((s) => s.url);
  if (links.length === 0) return null;

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <span className="font-display text-sm text-ink-soft">connect &amp; follow us</span>
      <div className="flex items-center justify-center gap-3">
        {links.map((s) => (
          <a
            key={s.name}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Follow unknown.chat on ${s.name} (${s.handle})`}
            title={`${s.name} · ${s.handle}`}
            className="group inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-paper-cool px-3 py-1.5 shadow-hard-xs transition-transform hover:-translate-y-0.5"
          >
            <Icon name={s.name} className="h-4 w-4 text-ink" />
            <span className="font-sans text-xs font-bold text-ink">follow</span>
          </a>
        ))}
      </div>
    </div>
  );
}
