"use client";

// Full-screen "it's a match!" celebration shown when the user matches a persona.
// Centered, animated (pop-in + floating hearts). Tap anywhere or "keep chatting"
// to dismiss and continue the current chat; or jump to connections.

import Link from "next/link";

export function MatchedOverlay({
  name,
  href = "/connections",
  onClose,
}: {
  name: string;
  href?: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/70 px-6 overlay-fade"
      onClick={onClose}
    >
      {/* floating hearts */}
      {["10%", "25%", "50%", "72%", "88%"].map((left, i) => (
        <span
          key={left}
          className="float-heart absolute bottom-0 text-2xl select-none"
          style={{ left, animationDelay: `${i * 0.35}s` }}
          aria-hidden
        >
          {i % 2 ? "💗" : "💘"}
        </span>
      ))}

      <div className="match-pop relative text-center" onClick={(e) => e.stopPropagation()}>
        <div className="heart-beat text-7xl">💘</div>
        <h2 className="mt-1 font-display text-5xl text-paper-cool drop-shadow">it&apos;s a match!</h2>
        <p className="mt-2 font-serif italic text-lg text-paper-cool/90">
          {name} is yours to talk to, anytime
        </p>

        <div className="mt-7 flex flex-col items-center gap-2.5">
          <Link
            href={href}
            className="rounded-full border-2 border-paper-cool bg-paper-cool px-6 py-2.5 font-sans text-sm font-bold tracking-tight text-ink shadow-hard"
          >
            continue with {name} →
          </Link>
          <button onClick={onClose} className="font-sans text-[13px] font-bold text-paper-cool/90 underline">
            maybe later
          </button>
        </div>
      </div>

      <style jsx>{`
        .overlay-fade {
          animation: fade 0.25s ease-out;
        }
        .match-pop {
          animation: pop 0.45s cubic-bezier(0.18, 0.89, 0.32, 1.28);
        }
        .heart-beat {
          animation: beat 0.9s ease-in-out infinite;
        }
        .float-heart {
          animation: floatUp 2.6s ease-in forwards;
          opacity: 0;
        }
        @keyframes fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pop {
          0% { transform: scale(0.6); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes beat {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.18); }
        }
        @keyframes floatUp {
          0% { transform: translateY(0) scale(0.8); opacity: 0; }
          15% { opacity: 0.9; }
          100% { transform: translateY(-80vh) scale(1.2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
