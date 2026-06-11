# Experiment: Gemini Flash Lite (eval-only)

**Status:** parked — revisit later. NOT for production. `main` routing is unchanged
(English → DeepSeek, non-English → Claude).

## What this branch does
- Adds a `gemini` LLM provider (`lib/gemini.ts`, OpenAI-compatible endpoint).
- `LLM_PROVIDER=gemini` forces **all** chats to Gemini Flash Lite.
- Uses the **same prompt as Claude** (`buildSystemPrompt` + `memorySection`) for a
  fair language/persona comparison.
- Also raises the typing-pacing cap 11s → 22s so long messages type realistically
  (general fix, provider-agnostic).

## How to test locally
In `chatApp/.env.local`:
```
LLM_PROVIDER=gemini
GEMINI_API_KEY=...        # from https://aistudio.google.com/apikey
GEMINI_MODEL=gemini-2.5-flash-lite
```
Then `nvm use 20 && npm run dev`. Pick each language + persona and chat — all
replies are Gemini. Local analytics/Sentry are off, so nothing hits prod.

## To evaluate
Quality per language (esp. Indic: Hinglish, Punjabi) and per persona; reply
length/brevity; gendered grammar; realism. Record findings here before deciding
whether to wire Gemini into prod routing.
