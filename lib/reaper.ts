// Abandoned-chat reaper. A background sweep that closes chats the user walked
// away from (tab closed / back button) without a clean exit — the server never
// got a close event, so the session would otherwise sit "open" forever with no
// chat_ended, no duration, and no summary.
//
// Every minute it scans live sessions; any not-ended chat with no activity
// (message / idle poll / heartbeat) for > IDLE_MS gets closed via the normal
// onChatEnded path (reason "abandoned"), which records the end + generates the
// summary. Because the reaper has no HTTP request, we rebuild the analytics
// context (country, visitor id) from what we snapshotted on the session at start.

import { allSessions, endSession, type Session } from "./sessions";
import { onChatEnded } from "./chatClose";

const IDLE_MS = 5 * 60_000; // 5 minutes of silence → abandoned
const SWEEP_MS = 60_000; // check once a minute

const g = globalThis as unknown as { __REAPER__?: boolean };

export function startReaper(): void {
  if (g.__REAPER__) return; // never stack intervals across hot reloads
  g.__REAPER__ = true;
  setInterval(sweep, SWEEP_MS).unref?.();
  console.log("[reaper] started — closing chats idle >", IDLE_MS / 60000, "min");
}

function sweep(): void {
  const now = Date.now();
  for (const s of allSessions()) {
    if (s.ended || s.closeRecorded) continue;
    if (now - s.lastActivityAt <= IDLE_MS) continue;
    try {
      endSession(s.id, "abandoned");
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
