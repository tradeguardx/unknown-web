# unknown.chat

An Omegle-style "talk to a stranger" web app where the strangers are AI personas designed to feel like real people. Each chat generates a fresh persona with a random country, age, mood, typing style, and quirks. Personas can leave on their own — when a topic clashes with their preferences, when the user is rude, or just on a whim.

## Quick start

```bash
nvm use            # picks Node 22 from .nvmrc
npm install
cp .env.local.example .env.local
# edit .env.local and put your Anthropic API key there
npm run dev
```

Open http://localhost:3000.

## How it feels human

- **Persona generator** ([lib/persona.ts](lib/persona.ts)) — random country (weighted), age, gender, mood, typing style, interests, and a small list of "dislikes" that drive realistic friction.
- **Pacing engine** ([lib/pacing.ts](lib/pacing.ts)) — reply delay = thinking pause + (length × persona's WPM) + small chance of a multi-second "got distracted" ghost pause.
- **Realistic exits** — the system prompt teaches the model to emit a `[LEAVE: <reason>]` sentinel, which the server detects, strips, and uses to end the session. Plus a small per-turn random ghost-leave on the server side.
- **Imperfect typing** — the system prompt locks each persona into one of: formal, casual, genz, broken_english, emoji_heavy, terse.
- **No cross-session memory** — sessions are in-memory only and skipping starts fresh.

## Disclosure

The app discloses AI nature on the landing page (one-time onboarding card) and on `/about`, which is required by Anthropic's usage policy. Inside the chat itself, personas stay in character.

## Architecture

```
app/
  page.tsx                  landing + onboarding card
  chat/page.tsx             chat UI shell
  about/page.tsx            disclosure page
  api/chat/start/route.ts   POST → creates session, returns sessionId + opener
  api/chat/send/route.ts    POST → calls Claude, returns reply + pacing metadata
components/
  ChatWindow.tsx            client logic (timing, typing indicator, skip)
  MessageBubble.tsx         "Stranger:" / "You:" lines
  TypingIndicator.tsx       three-dot bouncing animation
lib/
  persona.ts                random persona generator
  pacing.ts                 reply-delay calculator
  prompts.ts                builds the system prompt from a persona
  leaveDetection.ts         strips and detects [LEAVE: ...] sentinel
  sessions.ts               in-memory session store
  anthropic.ts              Claude client + model id
```

## Tweaking the feel

- More or fewer countries → [lib/persona.ts](lib/persona.ts) `COUNTRIES`.
- Personas leave too often / not enough → adjust `randomLeaveProbability` and the prompt's "When to leave" section in [lib/prompts.ts](lib/prompts.ts).
- Replies feel too fast or slow → tune `wpmBase` and the thinking-pause bounds in [lib/pacing.ts](lib/pacing.ts).
- Personas feel too samey → add more `INTERESTS`, more `POTENTIAL_DISLIKES`, more `Mood` values.

## Before going public

This v1 is intentionally minimal. Before public launch, add:

- **Persistence**: swap `lib/sessions.ts` for Redis or a DB.
- **Rate limiting**: per-IP cap on `/api/chat/send` to control costs.
- **Abuse filtering**: pre-screen user messages for content that should never reach the model.
- **Auth (optional)**: light identity if you want to ban repeat abusers.
- **Observability**: log per-session token usage so you can watch the bill.
- **TOS + privacy policy**: link from `/about`.

## Stack

Next.js 15 · React 19 · TypeScript · Tailwind · Anthropic SDK · Claude Haiku 4.5
