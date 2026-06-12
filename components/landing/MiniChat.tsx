"use client";

// Animated hero "mini chat" — a looping, self-typing preview of a real
// conversation. Stranger types (with the occasional change-of-mind delete),
// you reply, repeat. Tiny detail, big perceived-quality lift.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Turn = { who: "stranger" | "you"; text: string; typo?: string };

// Scripted convo. `typo` (optional) is typed then deleted before the real text,
// to fake a human "wait, no" moment.
const SCRIPT: Turn[] = [
  { who: "stranger", text: "hey 👋" },
  { who: "stranger", text: "can't sleep?", typo: "u up" },
  { who: "you", text: "same" },
  { who: "stranger", text: "the 3am crew lol" },
  { who: "you", text: "what r u into" },
  { who: "stranger", text: "overthinking mostly 😅", typo: "idk honestly" },
];

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export function MiniChat({ onTap }: { onTap: () => void }) {
  const [done, setDone] = useState<Turn[]>([]);
  const [typingWho, setTypingWho] = useState<Turn["who"] | null>(null);
  const [partial, setPartial] = useState<{ who: Turn["who"]; text: string } | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let alive = true;

    async function typeOut(who: Turn["who"], text: string, withCaretClear = true) {
      let cur = "";
      for (const ch of text) {
        if (!alive) return;
        cur += ch;
        setPartial({ who, text: cur });
        await sleep(38 + Math.random() * 45);
      }
      if (withCaretClear) await sleep(120);
    }
    async function backspace(who: Turn["who"], from: string, toLen = 0) {
      let cur = from;
      while (cur.length > toLen) {
        if (!alive) return;
        cur = cur.slice(0, -1);
        setPartial({ who, text: cur });
        await sleep(45);
      }
    }

    async function run() {
      while (alive) {
        setDone([]);
        setPartial(null);
        await sleep(700);
        for (const turn of SCRIPT) {
          if (!alive) return;
          // typing indicator beat
          setTypingWho(turn.who);
          await sleep(turn.who === "stranger" ? 750 + Math.random() * 500 : 450);
          setTypingWho(null);

          // optional "change of mind": type a wrong draft, delete it
          if (turn.typo) {
            await typeOut(turn.who, turn.typo, false);
            await sleep(450);
            await backspace(turn.who, turn.typo, 0);
            await sleep(150);
          }

          await typeOut(turn.who, turn.text);
          setDone((d) => [...d, turn]);
          setPartial(null);
          await sleep(turn.who === "stranger" ? 700 : 550);
        }
        await sleep(2400); // hold the finished convo, then loop
      }
    }
    run();
    return () => { alive = false; };
  }, []);

  // keep the latest line in view as it types
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [done, partial, typingWho]);

  const Label = ({ who }: { who: Turn["who"] }) =>
    who === "stranger" ? (
      <span className="text-stranger font-semibold">stranger:</span>
    ) : (
      <span className="text-red font-semibold">you:</span>
    );

  return (
    <div className="relative mt-4 lg:mt-0 lg:max-w-md lg:ml-auto w-full">
      <span
        className="absolute -top-1.5 left-6 w-[60px] h-[14px] bg-lilac border border-ink -rotate-[4deg] opacity-85 tape-stripe z-10"
        aria-hidden
      />
      <div className="bg-paper-cool border-2 border-ink rounded-2xl p-3.5 lg:p-5 shadow-hard -rotate-[0.5deg]">
        <div className="flex items-center gap-1.5 font-display text-[15px] font-semibold text-ink mb-2.5 pb-2 border-b-[1.5px] border-dashed border-paper-deep">
          <span className="stranger-blob">
            <span className="w-[4px] h-[4px] rounded-full bg-paper-cool inline-block mr-1" />
            stranger
          </span>
          is here ✦
        </div>

        {/* animated transcript — fixed height so the card doesn't jump */}
        <div
          ref={scrollRef}
          className="font-mono text-[12.5px] leading-relaxed mb-2.5 h-[112px] overflow-hidden"
        >
          {done.map((t, i) => (
            <div key={i}>
              <Label who={t.who} /> <span className="text-ink">{t.text}</span>
            </div>
          ))}

          {partial && (
            <div>
              <Label who={partial.who} />{" "}
              <span className="text-ink">{partial.text}</span>
              <span className="mini-caret">▍</span>
            </div>
          )}

          {typingWho && (
            <div className="flex items-center gap-1 mt-0.5 text-[11.5px] text-ink-mute">
              <span className={typingWho === "stranger" ? "text-stranger font-semibold" : "text-red font-semibold"}>
                {typingWho}
              </span>
              <span className="inline-flex gap-0.5 ml-1">
                <span className="w-[3px] h-[3px] bg-ink-mute rounded-full pulse-dot" />
                <span className="w-[3px] h-[3px] bg-ink-mute rounded-full pulse-dot" style={{ animationDelay: "0.15s" }} />
                <span className="w-[3px] h-[3px] bg-ink-mute rounded-full pulse-dot" style={{ animationDelay: "0.3s" }} />
              </span>
            </div>
          )}
        </div>

        <button
          onClick={onTap}
          className="w-full flex items-center justify-between gap-2 bg-ink text-paper-cool border-[1.5px] border-ink rounded-xl px-4 py-2.5 cursor-pointer hover:opacity-90 transition-opacity"
        >
          <span className="font-sans text-[13px] font-bold tracking-tight">join the chat →</span>
          <span className="font-display text-[13px] text-paper-cool/70">tap to start</span>
        </button>

        <p className="text-center mt-2 font-display text-[13px] text-ink-mute">
          ⚠ AI persona ·{" "}
          <Link href="/about" className="text-red underline font-semibold">read more</Link>
        </p>
      </div>

      <style jsx>{`
        .mini-caret {
          animation: miniBlink 1s step-end infinite;
          color: #e64a3a;
          margin-left: 1px;
        }
        @keyframes miniBlink {
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
