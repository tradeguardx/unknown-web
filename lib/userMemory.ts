// Rolling categorized user-memory system. Periodically extracts a structured
// memory of the user from recent conversation, stored on the session and
// injected into the system prompt. Lets the persona "remember" the user
// across the full chat — factually AND emotionally.
//
// Three categories:
//   - identity:   stable facts (name, age, location, work, education)
//   - interests:  hobbies, fandoms, what they're into
//   - emotional:  mood patterns, vibes, how they behave, what they're feeling
//                 — THE most important category for psychological realism.
//                 ("gets flirty late at night", "sarcastic", "stressed",
//                  "likes being teased", "misses ex sometimes")
//
// Runs on DeepSeek (cheap, reliable structured output) regardless of which model
// serves the actual chat — it's a background, fire-and-forget structured-extraction
// task the user never sees, so it doesn't need the pricier chat model. (Cost.)
//
// If DEEPSEEK_API_KEY isn't set, memory updates are silently skipped — chat keeps
// working, just with no rolling memory beyond the recent window.

import { deepseekChat, isDeepSeekAvailable } from "./deepseek";
import { EMPTY_USER_MEMORY, getSession, saveSession, type UserMemory } from "./sessions";
import { addUsage, normalizeUsage } from "./usage";

// How often to refresh memory (in total message count). Default: every 10.
const REFRESH_EVERY_N_MESSAGES = Math.max(
  4,
  Number(process.env.MEMORY_REFRESH_EVERY) || 10,
);

const CAP_IDENTITY = 5;
const CAP_INTERESTS = 5;
const CAP_EMOTIONAL = 6;

export function shouldRefreshMemory(messageCount: number): boolean {
  if (!isDeepSeekAvailable()) return false;
  if (messageCount < 4) return false; // not enough material yet
  return messageCount % REFRESH_EVERY_N_MESSAGES === 0;
}

// Extraction prompt. Heavily weighted toward the emotional bucket because
// that's where the psychological hook lives — a stranger who "remembers your
// vibe" feels much more real than one who just remembers your age.
const EXTRACTION_SYSTEM_PROMPT = `You are observing a chat between a USER and a STRANGER. Your job is to maintain a SHORT structured memory about the USER (not the stranger), split into three categories.

Categories:
  identity   — name, age, gender, location, work, education (what they ARE)
  interests  — hobbies, fandoms, music, games, things they like
  emotional  — mood patterns, vibes, behaviors, how they tend to act,
               what they're feeling lately, sensitive topics, what they
               joke about, what they avoid, their flirt cadence, etc.

The EMOTIONAL category is the most important. It's how the stranger should
*feel toward this user* over time. Examples of good emotional bullets:
  - gets flirty late at night
  - sarcastic when uncomfortable
  - stressed about career lately
  - likes being teased back
  - opens up slowly, not all at once
  - mentions ex sometimes
  - jokes deflect when asked personal things
  - warmer when complimented genuinely

Examples of weak/bad emotional bullets (skip these):
  - is a person
  - is chatting
  - said hi

Output format (use these EXACT lowercase labels with colons, one bullet per line, prefixed with "- "):

identity:
- ...
- ...

interests:
- ...
- ...

emotional:
- ...
- ...

Rules:
- Keep each bullet under 12 words.
- 3-5 identity bullets max.
- 3-5 interests bullets max.
- 3-6 emotional bullets max — prioritize quality emotional observations.
- Skip a category entirely (don't output the header) if there's nothing for it.
- Update existing bullets — refine or replace, don't duplicate.
- Output ONLY the labeled bullets format. No preamble, no commentary.`;

interface RefreshArgs {
  sessionId: string;
}

export async function refreshUserMemory({ sessionId }: RefreshArgs): Promise<void> {
  if (!isDeepSeekAvailable()) return;

  const session = await getSession(sessionId);
  if (!session) return;
  if (session.messages.length < 4) return;

  const recent = session.messages.slice(-15);
  const recentText = recent
    .map(m => `${m.role === "user" ? "USER" : "STRANGER"}: ${m.content}`)
    .join("\n");

  const existingNotes = formatExistingNotes(session.userMemory);

  const userPrompt = `EXISTING NOTES ABOUT THE USER:
${existingNotes}

RECENT MESSAGES:
${recentText}

Update the notes. Output the FULL labeled bullet list (existing + any new facts/emotional observations). Output ONLY the structured bullets in the exact format specified.`;

  let raw: string;
  try {
    raw = await deepseekChat({
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
      maxTokens: 350,
      onUsage: (u) => addUsage(session.usage, "deepseek", normalizeUsage(u, "deepseek")),
    });
  } catch (err) {
    console.warn(
      "[userMemory] extraction failed:",
      err instanceof Error ? err.message : String(err),
    );
    return;
  }

  const memory = parseCategorizedMemory(raw);

  // Skip if extraction produced nothing useful.
  const hasContent =
    memory.identity.length > 0 || memory.interests.length > 0 || memory.emotional.length > 0;
  if (!hasContent) return;

  const fresh = await getSession(sessionId);
  if (!fresh || fresh.ended) return;
  fresh.userMemory = memory;
  await saveSession(fresh);
}

function formatExistingNotes(memory: UserMemory): string {
  const sections: string[] = [];
  if (memory.identity.length) {
    sections.push(`identity:\n${memory.identity.map(b => `- ${b}`).join("\n")}`);
  }
  if (memory.interests.length) {
    sections.push(`interests:\n${memory.interests.map(b => `- ${b}`).join("\n")}`);
  }
  if (memory.emotional.length) {
    sections.push(`emotional:\n${memory.emotional.map(b => `- ${b}`).join("\n")}`);
  }
  return sections.length ? sections.join("\n\n") : "(no notes yet)";
}

const CATEGORY_LABEL_RE = /^(identity|interests|emotional)\s*:\s*$/i;

function parseCategorizedMemory(text: string): UserMemory {
  const result: UserMemory = { identity: [], interests: [], emotional: [] };
  let current: keyof UserMemory | null = null;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    const m = line.match(CATEGORY_LABEL_RE);
    if (m) {
      current = m[1].toLowerCase() as keyof UserMemory;
      continue;
    }

    if (!current) continue;

    // Strip bullet markers and numbering
    const bullet = line
      .replace(/^[-*•·]\s*/, "")
      .replace(/^\d+\.\s*/, "")
      .trim();
    if (bullet.length === 0 || bullet.length > 200) continue;
    // Skip lines that look like meta-text (the model occasionally narrates)
    if (/^(here|note|update|so far|i'?m|the user|based on)/i.test(bullet)) continue;

    result[current].push(bullet);
  }

  // Cap each category — newer bullets at the top win on overflow because we
  // append in order and slice from the end... actually simpler: take from the
  // start since extraction outputs full list and overflow at end usually means
  // the model rambled. Keep first N.
  result.identity = result.identity.slice(0, CAP_IDENTITY);
  result.interests = result.interests.slice(0, CAP_INTERESTS);
  result.emotional = result.emotional.slice(0, CAP_EMOTIONAL);

  return result;
}

export { EMPTY_USER_MEMORY };
