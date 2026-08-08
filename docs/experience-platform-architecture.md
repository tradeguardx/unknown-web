# Unknown.Chat → AI Experience Platform — Architecture Proposal

Turning Unknown.Chat from "AI persona chat" into **a place where people enter AI
experiences and leave with something they didn't expect.** This is the proposal
(reuse map + new abstractions + migrations + incremental plan). No feature code is
written from this doc until the framework decisions below are confirmed.

Guiding rule: **reuse the working systems, add a thin framework on top, ship one
polished experience (AI Date).** Don't microservice prematurely; don't rewrite chat.

---

## 1. What already exists (and maps almost 1:1 to the vision)

Your nine "engines" mostly exist already — they just need a framework wrapped around them:

| Vision engine | Already have | Where |
|---|---|---|
| Conversation Engine | ✅ turn loop, pacing, bursts, anti-echo | chatApp `app/api/chat/*`, `llmProvider.ts`, `replyParser.ts`, `pacing.ts`; match-service `handlers/chat.ts` |
| Persona Engine | ✅ rich `Persona` + generation | `lib/persona.ts` (+ `designPersona`), shared brain persona module |
| Memory Engine | ✅ rolling categorized memory + follow-ups + compaction | `lib/userMemory.ts`, match `followUps.ts`, `compaction.ts` |
| Scoring / Result | 🟡 seed exists | `lib/chatSummary.ts` (ChatInsight), `lib/dateReport.ts` (**already built** — the Date result) |
| Voice Engine | 🟡 TTS+STT exist, not abstracted | `lib/sarvamVoice.ts`, `lib/openaiVoice.ts`, `lib/voiceSynth.ts` |
| Safety Engine | ✅ content filter + romance policy | `lib/contentFilter.ts` (both repos), brain core |
| Subscription Engine | ✅ entitlements + Dodo + pricing | match-service `entitlement/`, `services/dodo.ts`, `pricing.ts` |
| **Experience Engine** | ❌ new | — |
| **Environment Engine** | ❌ new | — |
| Shared "brain" | ✅ modular core + state + scorer | `lib/brain/` (synced to match-service) |

Persistence today: **strangers** = Redis (ephemeral, 6h); **matches** = Supabase
(persistent: `conversations`, `messages`, `conversationState`, `matchedPersonas`).
Analytics = DynamoDB (events/summaries/transcripts).

**Key insight:** the match-service persistent-chat model (persona + conversation +
state + entitlement + proactive) is 80% of an "experience." Experiences should
**extend that model**, not the ephemeral Redis stranger flow.

---

## 2. What's genuinely new (the framework)

Four new, **config-driven** concepts + two formalizations:

### 2.1 Experience (config registry, not hardcoded)
A registry of experience definitions — data, not `if (type === 'date')` logic.
```ts
interface ExperienceDef {
  id: string;                 // "first_date" | "debate" | "mystery" | ...
  name: string; description: string; objective: string;
  durationSec: number;        // e.g. 900–1200 for a date
  rules: string;              // extra system-prompt block for this experience
  modalities: ("text"|"voice")[];
  resultType: string;         // which Result schema to run (see 2.4)
  entitlement: "free" | "unknown_plus";
  minAge?: number;
}
```
Lives as versioned config (TS registry now; DB-backed later). New experience = new
entry + a rules block + a result schema. No app rewrite.

### 2.2 Environment / Scene (config registry)
```ts
interface SceneDef {
  id: string;                 // "coffee_shop_snow" ...
  type: string; location: string; time: string; weather: string;
  ambience: string; backgroundSounds: string[]; visualTheme: string;
  promptFlavor: string;       // injected so the persona references the setting
}
```
Drives the **visual scene** (frontend theme + ambient audio) AND a small prompt
flavor block so the AI is *in* the place ("it's snowing outside, the coffee
machine just hissed…").

### 2.3 Session (generalize `conversations`)
One session ties it all together. **Extend the existing `conversations` table**
rather than a parallel model:
```
conversations  +=  experienceId, sceneId, status, startedAt, endsAt, resultId
messages           (reuse as-is; add `modality` text|voice, optional audioUrl)
conversationState  (reuse: summary + memory)
session_signals    (new: behavioral metrics json)
```

### 2.4 Result Engine (extensible, per-experience)
Generalize `dateReport` into a registry keyed by `resultType`. Each experience
returns its OWN schema (date→compatibility, debate→persuasion, mystery→detective).
```ts
interface ResultEngine<T> { generate(session, transcript, signals): Promise<T | null>; }
// dateReport.ts becomes the "first_date" ResultEngine.
```
Results are **generated from real transcript + signals**, stored, teaser-gated,
and (for Date) shareable.

### 2.5 Structured user memory + evolving profile (extend Memory Engine)
Today memory is per-session buckets. Add **durable, cross-session structured facts**:
```
user_memories:  { userId, fact, category, confidence, sourceSessionId,
                  sensitivity, createdAt, updatedAt }
user_profile:   derived insights ("asks lots of questions, rarely shares") +
                experience history (Date #1 64% → #2 72% → #3 81%)
```
Retrieved when starting a new experience → the "Day 7: we noticed…" moment.
Sensitivity classification gates what we keep (no unnecessary sensitive data).

### 2.6 VoiceProvider abstraction (formalize)
```ts
interface VoiceProvider {
  generateSpeech(text, voiceCfg): Promise<AudioResult>;
  streamSpeech?(text, voiceCfg): AsyncIterable<AudioChunk>;
  transcribe(audio, opts): Promise<string>;
  getVoice(id): VoiceConfig; healthCheck(): Promise<boolean>;
}
```
Implementations: `ElevenLabsVoiceProvider` (new, primary for conversation),
`SarvamVoiceProvider` (wrap existing STT/TTS), `OpenAIVoiceProvider` (wrap existing).
Provider chosen by config/env, not business logic. Streaming-ready interface.

### 2.7 Persona as config (not generated-only)
Curated experience personas (e.g., "Maya, product designer") become **rows**, not
random generation. Reuse the `Persona` shape + the shared brain rendering.
```
personas:  { id, name, age, occupation, personaJson (full Persona), voiceId,
             avatar, defaultSceneId, tags, minAge, active }
```
`generatePersona`/`designPersona` still power user-created + roulette personas.

---

## 3. The context assembly (unchanged philosophy, new inputs)

The brain already assembles: core + persona + memory + director. Experiences add
two inputs to the SAME assembly (no new prompt system):
```
system = brain.core(mode)
       + persona module (from persona config)
       + experience.rules            ← NEW
       + scene.promptFlavor          ← NEW
       + relevant user memories       ← from user_memories
       + conversation-state (summary/memory/goal/style)
       + safety rules (content filter unchanged)
```
So a "date in a snowy coffee shop with Maya" is: persona=Maya, experience=first_date,
scene=coffee_shop_snow — all config, one assembly.

---

## 4. Migrations required (match-service / Supabase, additive)

1. `personas` table (curated experience personas).
2. `experiences` + `environments` — **start as TS config** (fastest, extensible);
   promote to tables only when non-devs need to edit them.
3. `conversations` += `experience_id`, `scene_id`, `persona_id`, `status`,
   `started_at`, `ends_at`, `result_id` (nullable → back-compat with match chats).
4. `messages` += `modality` ('text'|'voice'), `audio_url` (nullable).
5. `experience_results` table: `{ id (public, shareable), sessionId, userId,
   experienceType, resultJson, unlocked (bool), createdAt }`.
6. `user_memories` (structured facts) + `user_profile` (evolving insights + history).
7. `session_signals` (or a jsonb column on conversations) for behavioral metrics.

All additive/nullable → existing match + AI-partner data keeps working.

---

## 5. Monetization repositioning (reuse entitlements)

Reuse Dodo + entitlement, **reframe** as **Unknown+**: unlimited experiences, AI
dates, detailed reports, evolving profile, history, premium/new experiences.
- Free: take experiences + **teaser** results (score + archetype + 1 highlight).
- Unknown+ (subscription) OR one-time unlock: full report + profile + history.
Entitlement stays modular (`experience.entitlement` + report unlock) so pricing
can change later. The AI-date report teaser/lock we scoped fits directly.

---

## 6. Consolidation of in-flight branches
- `feat/ai-partner` (designPersona + wizard) → becomes the **persona-creation**
  path feeding the `personas`/session model.
- `feat/ai-date` (`dateReport` engine) → becomes the **first_date ResultEngine**.
Both merge INTO this framework rather than living separately.

---

## 7. Incremental implementation plan

**Phase A — Framework scaffolding** (no user-visible change)
- Experience + Scene registries (TS config).
- Result Engine interface; refactor `dateReport` to implement `first_date`.
- Migrations 3–7 (session/results/memories/signals) + `personas` table.
- `VoiceProvider` interface + wrap existing Sarvam/OpenAI; stub ElevenLabs.

**Phase B — AI Date, end-to-end on the framework** (the flagship)
- Persona select → **scene screen** (visual + ambient audio) → start date.
- Timed date (config duration), **text + voice** (ElevenLabs), persona in-scene.
- On end → Result Engine → store `experience_results` → **teaser + suspenseful lock**.
- Unlock via Unknown+ / one-time (Dodo). Start another date with a different persona.

**Phase C — Retention layer**
- Behavioral signals capture → richer results + explainable feedback.
- Evolving profile ("Day 7: we noticed…") + experience progression (Date #1→#2→#3).
- Shareable report page + OG image (the viral loop).

**Later — new experiences** (debate/mystery/interview): add a config entry + a
rules block + a result schema. Framework unchanged.

---

## 8. Explicitly NOT rewriting
Stranger roulette + Redis sessions, the shared brain, DeepSeek/Sarvam routing,
content filter/safety, analytics pipeline, Dodo/entitlement core. All reused.

---

## 9. Decisions to lock before Phase A
1. **Session home**: extend `conversations` (recommended — reuse chat/paywall/
   compaction) vs a fresh `experience_sessions` table (cleaner, more migration).
2. **Personas for Date**: a **curated set** (hand-authored rows, higher quality/
   consistency) vs **user-designed** (reuse `designPersona`) vs both.
3. **Voice now or Phase C?**: wire ElevenLabs into the Date in Phase B, or ship
   text-first and add voice right after? (Needs `ELEVENLABS_API_KEY` + cost.)
4. **Experiences as TS config vs DB**: start as TS config (recommended) — ok?
