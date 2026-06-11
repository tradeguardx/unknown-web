# Experiment branch: Sarvam AI (Indic eval)

**Branch:** `experiment/sarvam-ai` — **LOCAL TEST/EVAL ONLY. Do not deploy to prod.**

## Goal
Evaluate [Sarvam AI](https://sarvam.ai) (India-built LLM, tuned for Indian
languages + code-mixing) as a provider, across all languages and personas —
especially Hinglish / Hindi / Punjabi / other Indic. Uses the **same prompt as
Claude** (`buildSystemPrompt` + `memorySection`) so the comparison is apples-to-apples.

## What changed vs main
- `lib/sarvam.ts` — new OpenAI-compatible client for `https://api.sarvam.ai/v1/chat/completions`.
- `lib/llmProvider.ts` — added `"sarvam"` provider: type, `getEnvConfig` (`LLM_PROVIDER=sarvam`),
  and a `callLLM` branch that builds the Claude prompt.
- `.env.local.example` — documented `SARVAM_API_KEY` / `SARVAM_MODEL` / `SARVAM_TEMPERATURE` / `SARVAM_REASONING_EFFORT`.

## How to run locally
```bash
# in .env.local
LLM_PROVIDER=sarvam
SARVAM_API_KEY=sk_...        # from the Sarvam dashboard
SARVAM_MODEL=sarvam-105b     # or sarvam-30b
```
`LLM_PROVIDER=sarvam` forces **every** chat to Sarvam. Keep analytics ingest
disabled locally (`ANALYTICS_INGEST_URL` commented out) so test chats don't emit
to prod.

## Tuning decisions (optimised for casual-texting personas)
- **Model: `sarvam-105b`** (default). In smoke tests it stayed in-character and
  concise; `sarvam-30b` rambled and leaked an AI tell ("can't really do anything,
  just exist"). `sarvam-m` is fully **deprecated** (API rejects it).
- **`reasoning_effort: null`** → thinking mode OFF. We want fast, reflexive,
  human texting — not chain-of-thought. (Set `SARVAM_REASONING_EFFORT` to A/B test.)
- **`temperature: 0.85`** → Sarvam's API default of 0.2 is robotic; casual chat
  needs variety.
- **`wiki_grounding: false`** → personas are people, not encyclopedias.

## Notes
- Endpoint is OpenAI-compatible: `Authorization: Bearer <key>`, assistant text at
  `choices[0].message.content`.
- Pacing/typing realism is unchanged from main (the pacing layer adds the human
  delay regardless of provider).
