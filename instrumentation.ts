// Next.js calls register() once when the server process boots. We use it to
// start the abandoned-chat reaper (Node runtime only — not edge/build).
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startReaper } = await import("./lib/reaper");
    startReaper();
  }
}
