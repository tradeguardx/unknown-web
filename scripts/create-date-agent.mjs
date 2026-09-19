// One-shot: create the single ElevenLabs Conversational AI agent that powers the
// AI Date voice call. Per-date persona/scene/voice are injected at connect time
// via client overrides (enabled below) — so ONE agent serves every persona.
//
// Run once:  ELEVENLABS_API_KEY=... node scripts/create-date-agent.mjs
// Then set the printed id as ELEVENLABS_DATE_AGENT_ID (env + Fly secret).

const KEY = process.env.ELEVENLABS_API_KEY;
if (!KEY) {
  console.error("ELEVENLABS_API_KEY is not set");
  process.exit(1);
}

const BASE = "https://api.elevenlabs.io";

// A neutral base prompt — every real date overrides agent.prompt.prompt per
// session with the persona + scene + rules. This is only the fallback.
const BASE_PROMPT = [
  "You are on a first date with someone you just met. Talk like a real person speaking out loud:",
  "warm, easy, short lines, natural reactions. Never say you're an AI, never break character.",
  "Keep replies to a sentence or two. Be genuinely curious about them.",
].join(" ");

const body = {
  name: "unknown.chat — AI Date",
  conversation_config: {
    agent: {
      prompt: {
        prompt: BASE_PROMPT,
        llm: "gpt-4o-mini",
        temperature: 0.85,
        max_tokens: -1,
      },
      first_message: "hi there.",
      language: "en",
    },
    tts: {
      model_id: "eleven_flash_v2_5",
      // default voice — overridden per persona at connect time
      voice_id: "EVy5l1wEi54nXdQwAJJf",
      stability: 0.45,
      speed: 1,
    },
    // Keep a hard backstop; the 7-min free cap + 20-min date length are enforced
    // in our app. 30 min ceiling protects against a stuck open connection.
    conversation: {
      max_duration_seconds: 1800,
    },
  },
  platform_settings: {
    overrides: {
      conversation_config_override: {
        agent: {
          first_message: true,
          language: true,
          prompt: { prompt: true },
        },
        tts: { voice_id: true },
      },
    },
  },
};

const res = await fetch(`${BASE}/v1/convai/agents/create`, {
  method: "POST",
  headers: { "xi-api-key": KEY, "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
const text = await res.text();
if (!res.ok) {
  console.error("CREATE FAILED", res.status, text.slice(0, 800));
  process.exit(1);
}
const json = JSON.parse(text);
const agentId = json.agent_id || json.agentId;
console.log("AGENT_CREATED:", agentId);

// Verify we can mint a signed URL (websocket auth) for this agent.
const su = await fetch(`${BASE}/v1/convai/conversation/get-signed-url?agent_id=${agentId}`, {
  headers: { "xi-api-key": KEY },
});
const suText = await su.text();
console.log("SIGNED_URL_CHECK:", su.status, su.ok ? "ok" : suText.slice(0, 400));
