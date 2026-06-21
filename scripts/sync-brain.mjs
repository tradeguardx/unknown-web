// Sync the canonical shared brain (chatApp/lib/brain — the source of truth, used
// directly by chatApp) into match-service. The two services deploy independently
// and can't import across repo roots, so match-service gets a generated copy.
// Run from chatApp/ after editing anything in lib/brain:
//   node scripts/sync-brain.mjs

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, "..", "lib", "brain"); // chatApp/lib/brain (canonical)
const target = join(here, "..", "..", "match-service", "src", "brain"); // generated copy

const banner =
  "// ============================================================================\n" +
  "// GENERATED FILE — DO NOT EDIT. Source of truth: chatApp/lib/brain/<name>\n" +
  "// Regenerate: cd chatApp && node scripts/sync-brain.mjs\n" +
  "// ============================================================================\n\n";

const files = readdirSync(src).filter((f) => f.endsWith(".ts"));
mkdirSync(target, { recursive: true });
for (const f of files) {
  writeFileSync(join(target, f), banner + readFileSync(join(src, f), "utf8"), "utf8");
}
console.log(`synced ${files.length} brain file(s) → match-service/src/brain:`);
console.log(files.map((f) => "  - " + f).join("\n"));
