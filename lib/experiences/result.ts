// Result-engine registry (extensible). Each experience's resultType maps to an
// engine that turns the transcript (+ later, behavioral signals) into a structured
// result. first_date → the Dating Report. Add debate/mystery/etc. by registering
// a new engine — no changes to the session/chat flow.

import { generateDateReport } from "../dateReport";
import type { ResultEngine, ResultContext } from "./types";

const dateResultEngine: ResultEngine = {
  resultType: "date_report",
  async generate(ctx: ResultContext) {
    return generateDateReport(ctx.messages, ctx.persona, ctx.language, ctx.onUsage);
  },
};

const REGISTRY: Record<string, ResultEngine> = {
  [dateResultEngine.resultType]: dateResultEngine,
};

export function getResultEngine(resultType: string): ResultEngine | null {
  return REGISTRY[resultType] ?? null;
}

// Convenience: run the result engine for a given experience.
export async function runResult(ctx: ResultContext): Promise<unknown | null> {
  const engine = getResultEngine(ctx.experience.resultType);
  if (!engine) return null;
  return engine.generate(ctx);
}
