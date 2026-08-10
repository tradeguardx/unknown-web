// Wrapper for the AI Date experience. Intentionally NOT height-constrained — the
// picker steps grow with their content and use the normal page (main) scroller;
// the immersive date/voice screens set their own 100dvh height internally.

export default function DateLayout({ children }: { children: React.ReactNode }) {
  return <div className="w-full">{children}</div>;
}
