// The dark immersive frame for the date itself (anticipation → text → voice →
// ending). A full-height rounded card with the scene's dark gradient and a faint
// diagonal texture. Children lay out on top.

import { SceneAmbience } from "./SceneAmbience";

interface Props {
  theme: { from: string; via: string; to: string };
  ambience?: { sceneId: string; weather: string };
  children: React.ReactNode;
  className?: string;
}

export function DarkStage({ theme, ambience, children, className = "" }: Props) {
  return (
    <div className="h-[100dvh] w-full flex flex-col p-2 sm:p-4 lg:p-6">
      <div
        className={`relative mx-auto flex flex-1 min-h-0 w-full max-w-6xl flex-col overflow-hidden rounded-2xl sm:rounded-3xl border-2 border-ink shadow-hard-lg ${className}`}
        style={{ backgroundImage: `linear-gradient(155deg, ${theme.from}, ${theme.via} 55%, ${theme.to})` }}
      >
        <span
          className="pointer-events-none absolute inset-0 opacity-[0.10]"
          style={{ backgroundImage: "repeating-linear-gradient(-45deg,#fff 0 1px,transparent 1px 22px)" }}
          aria-hidden
        />
        {ambience && <SceneAmbience sceneId={ambience.sceneId} weather={ambience.weather} />}
        <div className="relative flex h-full min-h-0 flex-col">{children}</div>
      </div>
    </div>
  );
}
