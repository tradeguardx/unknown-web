// Detects and strips the [LEAVE: reason] sentinel from a model reply.
// The sentinel is the persona's signal that they're done with this chat.

const LEAVE_RE = /\[LEAVE(?::\s*([^\]]*))?\]/i;

export interface LeaveCheck {
  text: string;     // reply with the sentinel removed
  left: boolean;
  reason?: string;
}

export function checkForLeave(reply: string): LeaveCheck {
  const m = reply.match(LEAVE_RE);
  if (!m) return { text: reply.trim(), left: false };
  const reason = m[1]?.trim() || "left";
  const cleaned = reply.replace(LEAVE_RE, "").trim();
  return { text: cleaned, left: true, reason };
}
