// Single choke-point for "a chat just ended". Every place that ends a session
// should call onChatEnded so analytics stay consistent no matter HOW the chat
// closed (persona left, ghosted, idle, policy, too long, user skipped).
//
// It does three things, all fire-and-forget:
//   1. Plausible event (lib/analytics.ts) — keeps the existing web funnel intact.
//   2. SQS chat_ended event (lib/events.ts) — feeds the owned DynamoDB pipeline.
//   3. Generates an LLM summary of the chat and emits chat_summary — async, so
//      the user's response is never blocked on a summarization call.
//
// Guarded against double-firing: the first call wins, later calls no-op. This
// matters because a few routes both endSession() and report in overlapping paths.

import { trackChatEnded } from "./analytics";
import { emitChatEnded, emitChatSummary } from "./events";
import { summarizeChat } from "./chatSummary";
import { getSession, type Session } from "./sessions";

export function onChatEnded(req: Request, session: Session, reason: string): void {
  // De-dupe: only record a given session's close once.
  if (session.closeRecorded) return;
  session.closeRecorded = true;

  // 1 + 2: lightweight events, fired immediately.
  void trackChatEnded(req, session, reason);
  void emitChatEnded(req, session, reason);

  // 3: summary is an LLM round-trip — never block the request path on it.
  setImmediate(() => {
    summarizeChat(session)
      .then((insight) => {
        if (!insight) return;
        // Re-read in case the session object changed; either is fine since we
        // only read immutable-ish fields, but this keeps us honest.
        const fresh = getSession(session.id) ?? session;
        return emitChatSummary(req, fresh, insight, reason);
      })
      .catch((err) =>
        console.warn(
          "[chatClose] summary emit failed:",
          err instanceof Error ? err.message : String(err),
        ),
      );
  });
}
