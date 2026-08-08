// Full-height shell for the AI Date experience so the immersive chat (and the
// report) fill the viewport like the connections chat does. Kept minimal — each
// page owns its own scene/scroll behavior.

export default function DateLayout({ children }: { children: React.ReactNode }) {
  return <div className="h-[100dvh] w-full flex flex-col overflow-hidden">{children}</div>;
}
