// The ending — the pause before the verdict. She's "deciding what to say about
// you" while the report generates. If the dater is still anonymous, this is where
// signup happens (no signup was needed to date) — sign up to read the verdict.

import { DarkStage } from "../DarkStage";
import { StripePhoto } from "../StripePhoto";
import { UpgradeAccount } from "@/components/match/UpgradeAccount";
import type { DatePersonaCard, DateStart } from "@/lib/matchApi";

interface Props {
  card: DatePersonaCard;
  date: DateStart;
  phase: "deciding" | "gate" | "error";
  errorMessage?: string | null;
  onSignedUp: () => void;
  onRetry: () => void;
}

export function Ending({ card, date, phase, errorMessage, onSignedUp, onRetry }: Props) {
  const she = card.gender === "male" ? "he" : "she";
  return (
    <DarkStage theme={date.scene.darkTheme} ambience={{ sceneId: date.scene.id, weather: date.scene.weather }}>
      <div className="px-4 py-3 sm:px-6">
        <p className="font-display italic text-[12px] text-white/60">🕯 the lights just came on. they&apos;re closing.</p>
      </div>

      <div className="flex flex-1 min-h-0 flex-col items-center justify-center overflow-y-auto px-5 py-6 text-center">
        {phase === "error" ? (
          <>
            <div className="text-4xl mb-2">😬</div>
            <h1 className="font-sans text-3xl font-bold text-white mb-2">that didn&apos;t save</h1>
            <p className="font-display italic text-white/70 mb-2">couldn&apos;t write the report just now.</p>
            {errorMessage && <p className="font-mono text-[12px] text-yellow/90 mb-5 max-w-sm mx-auto break-words">{errorMessage}</p>}
            <button onClick={onRetry} className="rounded-2xl border-2 border-ink bg-red px-8 py-3 font-sans text-sm font-bold text-paper-cool shadow-hard">
              try again →
            </button>
          </>
        ) : phase === "gate" ? (
          <div className="w-full max-w-sm">
            <p className="font-display italic text-yellow text-[14px] mb-1">15 minutes, gone</p>
            <h1 className="font-sans text-3xl sm:text-4xl font-bold text-white mb-1">{she} wrote her <span className="text-red italic font-display">verdict</span></h1>
            <p className="font-display italic text-white/70 mb-5">sign up to read what {card.name} really thought 💘</p>
            <div className="rounded-2xl border-2 border-ink bg-paper-cool p-4 text-left shadow-hard">
              <UpgradeAccount forceShow title={`read ${card.name}'s verdict`} subtitle="your Dating Report is ready — sign up to open it" onDone={onSignedUp} />
            </div>
          </div>
        ) : (
          <>
            <p className="font-display italic text-yellow text-[14px] mb-2">15 minutes, gone</p>
            <h1 className="font-sans text-4xl sm:text-5xl font-bold text-white">
              your date is <span className="text-red italic font-display">over</span>
            </h1>
            <div className="mt-6 flex items-center gap-3 rounded-full border-2 border-ink bg-paper-cool px-4 py-3 shadow-hard">
              <StripePhoto color={card.stripeColor} photoUrl={card.photoUrl ?? undefined} alt={card.name} variant="circle" showPhotoTag={false} className="h-10 w-10 shrink-0" />
              <span className="font-sans text-[15px] font-bold text-ink">{card.name} is deciding what to say about you</span>
              <span className="flex gap-1">
                <Dot /><Dot /><Dot />
              </span>
            </div>
            <p className="mt-4 font-display italic text-[13px] text-white/60">don&apos;t close the tab. this part is the point.</p>
          </>
        )}
      </div>
    </DarkStage>
  );
}

function Dot() {
  return <span className="h-1.5 w-1.5 rounded-full bg-red animate-bounce" style={{ animationDuration: "1s" }} />;
}
