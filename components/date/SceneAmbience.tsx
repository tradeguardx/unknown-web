// Foreground for the date scenes — so a place reads as a place, not a gradient,
// and quietly moves. Layered, decorative, CSS/SVG only: vignette, a warm side-glow,
// animated weather, and a per-scene foreground (railing + city lights / window /
// shelves / rolling wave / train lights / fire + stars). Sits above the gradient,
// below the content. Respects prefers-reduced-motion (see .uc-anim in globals).

interface Props {
  sceneId: string;
  weather: string;
  imageMode?: boolean; // over real scene art → only animated weather, no CSS doodles
}

// Where the warm light source sits in each scene photo (so the flicker lands on it).
const IMAGE_GLOW: Record<string, { x: string; y: string; size: number; color: string; speed: number }> = {
  coffee_shop: { x: "60%", y: "58%", size: 150, color: "#f5c24a", speed: 5 },
  mountain_cabin: { x: "52%", y: "52%", size: 150, color: "#f5a63a", speed: 3.2 },
  beach: { x: "72%", y: "72%", size: 130, color: "#e6743a", speed: 2.6 },
  library: { x: "40%", y: "56%", size: 130, color: "#8fd07a", speed: 5.5 },
  campsite: { x: "50%", y: "72%", size: 150, color: "#e6743a", speed: 2.4 },
  bookstore_rain: { x: "55%", y: "52%", size: 130, color: "#f5b23a", speed: 5 },
};

function TwinkleLights() {
  return (
    <div className="absolute inset-x-0 top-[12%] h-1/2">
      {Array.from({ length: 14 }).map((_, i) => (
        <span
          key={i}
          className="uc-anim absolute rounded-full bg-yellow"
          style={{
            width: 3,
            height: 3,
            left: `${(i * 41 + 6) % 96}%`,
            top: `${(i * 27) % 80}%`,
            boxShadow: "0 0 6px 1px rgba(245,217,103,0.8)",
            animation: `uc-twinkle ${2 + (i % 4)}s ease-in-out ${(i % 5) * -0.5}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

export function SceneAmbience({ sceneId, weather, imageMode = false }: Props) {
  if (imageMode) {
    const g = IMAGE_GLOW[sceneId];
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {/* warm light source in the scene — flickers like fire / a lamp */}
        {g && (
          <span
            className="uc-anim absolute rounded-full blur-2xl"
            style={{ left: g.x, top: g.y, width: g.size, height: g.size, marginLeft: -g.size / 2, marginTop: -g.size / 2, background: g.color, opacity: 0.4, animation: `uc-glow ${g.speed}s ease-in-out infinite` }}
          />
        )}
        {(sceneId === "rooftop" || sceneId === "night_train") && <TwinkleLights />}
        {weather === "snow" && <Snow />}
        {(weather === "rain" || weather === "storm" || weather === "fog") && <Rain />}
      </div>
    );
  }
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {/* warm glow on her (left) side */}
      <div className="absolute -left-24 top-1/4 h-96 w-96 rounded-full bg-yellow/15 blur-3xl" />
      {/* vignette */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 50% 40%, transparent 55%, rgba(0,0,0,0.45) 100%)" }} />

      {/* weather */}
      {weather === "snow" && <Snow />}
      {weather === "rain" && <Rain />}
      {(weather === "storm" || weather === "fog") && <Rain />}

      {/* per-scene foreground */}
      {sceneId === "rooftop" && <Rooftop />}
      {sceneId === "coffee_shop" && <Window />}
      {(sceneId === "library" || sceneId === "bookstore_rain") && <Shelves />}
      {sceneId === "beach" && <Horizon />}
      {sceneId === "night_train" && <TrainWindow />}
      {(sceneId === "campsite" || sceneId === "mountain_cabin") && <Fire />}
    </div>
  );
}

function Snow() {
  return (
    <div className="absolute inset-0">
      {Array.from({ length: 24 }).map((_, i) => (
        <span
          key={i}
          className="uc-anim absolute rounded-full bg-white/80"
          style={{
            width: 2 + (i % 3),
            height: 2 + (i % 3),
            left: `${(i * 53) % 100}%`,
            top: "-5%",
            opacity: 0.35 + (i % 3) * 0.18,
            animation: `uc-fall ${5 + (i % 5)}s linear ${(i % 7) * -0.9}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function Rain() {
  return (
    <div className="absolute inset-0 opacity-40">
      {Array.from({ length: 30 }).map((_, i) => (
        <span
          key={i}
          className="uc-anim absolute bg-white/50"
          style={{
            width: 1,
            height: 12 + (i % 4) * 6,
            left: `${(i * 41) % 100}%`,
            top: "-10%",
            animation: `uc-fall-fast ${0.7 + (i % 4) * 0.15}s linear ${(i % 6) * -0.3}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function Stars({ count = 30 }: { count?: number }) {
  return (
    <div className="absolute inset-x-0 top-0 h-1/2">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="uc-anim absolute rounded-full bg-white"
          style={{
            width: 1.5,
            height: 1.5,
            left: `${(i * 53) % 100}%`,
            top: `${(i * 19) % 100}%`,
            animation: `uc-twinkle ${2 + (i % 4)}s ease-in-out ${(i % 5) * -0.6}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

function Rooftop() {
  return (
    <>
      {/* city lights — gently twinkling */}
      <div className="absolute bottom-14 left-0 right-0 h-20 opacity-70">
        {Array.from({ length: 40 }).map((_, i) => (
          <span
            key={i}
            className="uc-anim absolute bottom-0 bg-yellow/70"
            style={{
              width: 1.5,
              height: 3 + ((i * 7) % 14),
              left: `${(i * 2.5) % 100}%`,
              animation: `uc-twinkle ${2.5 + (i % 5) * 0.6}s ease-in-out ${(i % 6) * -0.5}s infinite`,
            }}
          />
        ))}
      </div>
      {/* railing */}
      <div className="absolute bottom-0 left-0 right-0 h-14 border-t-4 border-ink/70">
        {Array.from({ length: 24 }).map((_, i) => (
          <span key={i} className="absolute bottom-0 top-0 w-1 bg-ink/70" style={{ left: `${(i / 23) * 100}%` }} />
        ))}
      </div>
    </>
  );
}

function Window() {
  return (
    <>
      {/* window frame */}
      <div className="absolute inset-x-6 top-6 bottom-16 rounded-xl border-4 border-ink/40" />
      <div className="absolute left-1/2 top-6 bottom-16 w-1 -translate-x-1/2 bg-ink/40" />
      {/* table edge */}
      <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-black/40 to-transparent" />
    </>
  );
}

function Shelves() {
  return (
    <div className="absolute inset-y-8 left-4 w-16 opacity-40 sm:w-24">
      {Array.from({ length: 7 }).map((_, i) => (
        <span key={i} className="absolute left-0 right-0 h-1 bg-ink/60" style={{ top: `${(i / 6) * 100}%` }} />
      ))}
    </div>
  );
}

function Horizon() {
  return (
    <>
      {/* pulsing sun */}
      <div className="uc-anim absolute right-8 top-6 h-16 w-16 rounded-full bg-yellow/50 blur-md" style={{ animation: "uc-pulse-soft 4s ease-in-out infinite" }} />
      {/* rolling wave line */}
      <div className="uc-anim absolute left-0 right-0 top-1/2 h-[2px] bg-yellow/40" style={{ animation: "uc-sway 5s ease-in-out infinite" }} />
      <div className="uc-anim absolute left-0 right-0 top-[58%] h-[2px] bg-white/25" style={{ animation: "uc-sway 6.5s ease-in-out -1s infinite" }} />
    </>
  );
}

function TrainWindow() {
  return (
    <>
      <div className="absolute inset-x-8 top-8 bottom-20 rounded-lg border-4 border-ink/40" />
      {/* passing lights — drifting sideways */}
      <div className="uc-anim absolute inset-x-10 top-1/3 h-16 opacity-70" style={{ animation: "uc-drift 3s ease-in-out infinite alternate" }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <span key={i} className="absolute h-2 w-2 rounded-full bg-yellow/70" style={{ left: `${(i * 9) % 100}%`, top: `${(i * 17) % 100}%` }} />
        ))}
      </div>
    </>
  );
}

function Fire() {
  return (
    <>
      <div className="uc-anim absolute bottom-6 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full bg-red/25 blur-3xl" style={{ animation: "uc-flicker 1.6s ease-in-out infinite" }} />
      <Stars />
    </>
  );
}
