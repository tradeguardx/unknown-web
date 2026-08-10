"use client";

// Cinematic sound bed for the date. A single looping track that fades in/out:
//   - text date  → soft music (SOFT_MUSIC)
//   - voice date → the scene's ambience (café murmur / waves / fire / rain …)
// Gated by the scene "sound" toggle (and the voice-screen mute). Autoplay is
// best-effort — browsers allow it here because the date starts on a user tap;
// if a browser still blocks it, we fail silently rather than throw.

import { useEffect, useRef } from "react";

export const MEDIA = "https://eppdibglxxapupwgssxu.supabase.co/storage/v1/object/public/media";
export const SOFT_MUSIC = `${MEDIA}/soft_music.mp3`;

export function AmbientAudio({ src, enabled, volume = 0.35 }: { src?: string | null; enabled: boolean; volume?: number }) {
  const ref = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const a = ref.current;
    if (!a || !src) return;
    let raf = 0;
    if (enabled) {
      a.volume = 0;
      a.play()
        .then(() => {
          const step = () => {
            if (a.volume < volume) {
              a.volume = Math.min(volume, a.volume + 0.015);
              raf = requestAnimationFrame(step);
            }
          };
          step();
        })
        .catch(() => {/* autoplay blocked — ignore */});
    } else {
      // fade out then pause
      const step = () => {
        if (a.volume > 0.02) {
          a.volume = Math.max(0, a.volume - 0.03);
          raf = requestAnimationFrame(step);
        } else {
          a.pause();
        }
      };
      step();
    }
    return () => cancelAnimationFrame(raf);
  }, [enabled, src, volume]);

  if (!src) return null;
  return <audio ref={ref} src={src} loop preload="auto" />;
}
