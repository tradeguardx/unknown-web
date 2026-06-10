// Single choke-point for "a chat just ended". Every place that ends a session
// should call onChatEnded so analytics stay consistent no matter HOW the chat
// closed (persona left, ghosted, idle, policy, too long, user skipped).
//
// It does two things, all fire-and-forget:
//   1. SQS chat_ended event (lib/events.ts) — feeds the owned analytics pipeline.
//   2. Generates an LLM summary of the chat and emits chat_summary — async, so
//      the user's response is never blocked on a summarization call.
//
// Guarded against double-firing: the first call wins, later calls no-op. This
// matters because a few routes both endSession() and report in overlapping paths.

import { emitChatEnded, emitChatSummary, emitTranscript } from "./events";
import { summarizeChat } from "./chatSummary";
import { getSession, type Session } from "./sessions";

// Fraction of chats whose (redacted) transcript we keep for QA. Privacy stance:
// sample a small slice, never everyone. Service TTLs them after ~30 days.
const TRANSCRIPT_SAMPLE_RATE = Number(process.env.ANALYTICS_TRANSCRIPT_SAMPLE) || 0.03;

export function onChatEnded(req: Request, session: Session, reason: string): void {
  // De-dupe: only record a given session's close once.
  if (session.closeRecorded) return;
  session.closeRecorded = true;

  // 1: lightweight chat_ended event, fired immediately.
  void emitChatEnded(req, session, reason);

  // 2b: keep a redacted transcript for a small random sample (real chats only).
  if (session.messages.length >= 2 && Math.random() < TRANSCRIPT_SAMPLE_RATE) {
    void emitTranscript(req, session, reason);
  }

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
