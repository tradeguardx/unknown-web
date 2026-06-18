// Abandoned-chat reaper. A background sweep that closes chats the user walked
// away from (tab closed / back button) without a clean exit — the server never
// got a close event, so the session would otherwise sit "open" forever with no
// chat_ended, no duration, and no summary.
//
// Every minute it asks Redis for non-ended sessions idle > IDLE_MS (via the
// sorted-set index) and closes each via the normal onChatEnded path (reason
// "abandoned"), which records the end + generates the summary. Because the reaper
// has no HTTP request, we rebuild the analytics context (country, visitor id)
// from what we snapshotted on the session at start.
//
// Fly runs multiple machines, each with its own reaper interval. A per-sweep
// distributed lock (tryReaperLock) ensures only ONE machine reaps per tick, so
// chat_ended/summary never double-fire.

import {
  getSession,
  saveSession,
  endSession,
  getStaleSessionIds,
  dropFromIndex,
  tryReaperLock,
  type Session,
} from "./sessions";
import { onChatEnded } from "./chatClose";

const IDLE_MS = 5 * 60_000; // 5 minutes of silence → abandoned
const SWEEP_MS = 60_000; // check once a minute

const g = globalThis as unknown as { __REAPER__?: boolean };

export function startReaper(): void {
  if (g.__REAPER__) return; // never stack intervals across hot reloads
  g.__REAPER__ = true;
  setInterval(() => {
    void sweep();
  }, SWEEP_MS).unref?.();
  console.log("[reaper] started — closing chats idle >", IDLE_MS / 60000, "min");
}

async function sweep(): Promise<void> {
  // Only one machine sweeps per tick. Lock TTL < SWEEP_MS so the next tick is free.
  if (!(await tryReaperLock(Math.floor(SWEEP_MS / 1000) - 5))) return;

  let ids: string[];
  try {
    ids = await getStaleSessionIds(IDLE_MS);
  } catch (err) {
    console.warn("[reaper] index scan failed:", err instanceof Error ? err.message : String(err));
    return;
  }

  for (const id of ids) {
    try {
      const s = await getSession(id);
      if (!s) {
        // Already expired out of Redis — just clean the index entry.
        await dropFromIndex(id);
        continue;
      }
      if (s.ended || s.closeRecorded) {
        await dropFromIndex(id);
        continue;
      }
      endSession(s, "abandoned");
      await saveSession(s); // ended → also removes it from the index
      onChatEnded(reaperRequest(s), s, "abandoned");
    } catch (err) {
      console.warn("[reaper]", err instanceof Error ? err.message : String(err));
    }
  }
}

// A synthetic Request carrying the session's snapshotted analytics context, so
// the existing emit helpers (which read country/vid from headers) work unchanged.
function reaperRequest(s: Session): Request {
  const headers = new Headers();
  if (s.vid) headers.set("x-uc-vid", s.vid);
  if (s.country) headers.set("cf-ipcountry", s.country);
  return new Request("http://reaper.internal/", { headers });
}
