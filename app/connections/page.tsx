"use client";

// Right-pane default. On DESKTOP we auto-open the first connection (so the chat
// pane isn't empty). On mobile this pane is hidden by the layout — the list shows
// instead, so we don't auto-redirect there (keeps the list as the entry point).

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { matchApi } from "@/lib/matchApi";

export default function ConnectionsIndex() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth < 1024) return; // desktop only
    let alive = true;
    matchApi
      .listMatches()
      .then((d) => {
        const first = d.matches?.[0];
        if (alive && first) router.replace(`/connections/${first.id}`);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [router]);

  return (
    <div className="flex-1 flex items-center justify-center text-center px-6">
      <div>
        <div className="text-4xl">💘</div>
        <p className="mt-3 font-display text-2xl text-ink">your connections</p>
        <p className="mt-1 font-sans text-[13px] text-ink-mute">pick someone on the left to talk to.</p>
      </div>
    </div>
  );
}
