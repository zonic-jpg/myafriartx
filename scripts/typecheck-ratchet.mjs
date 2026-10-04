// Type-check gate that fails only on NEW errors.
// The repo carries a backlog of older type errors; failing CI on every push for
// those just buries real failures in noise. This compares against a baseline of
// known errors (file + code + message, line numbers ignored) so the backlog can
// be paid down gradually while any new error still fails the build.
//   node scripts/typecheck-ratchet.mjs            check
//   node scripts/typecheck-ratchet.mjs --update   rewrite the baseline
import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const BASELINE = "scripts/typecheck-baseline.txt";
const r = spawnSync("npx", ["tsc", "--noEmit", "--pretty", "false"], { encoding: "utf8", maxBuffer: 1 << 28 });
const out = `${r.stdout ?? ""}${r.stderr ?? ""}`;
const keys = new Set();
for (const line of out.split("\n")) {
  const m = line.match(/^(.+?)\(\d+,\d+\): error (TS\d+): (.*)$/);
  if (m) keys.add(`${m[1]} ${m[2]} ${m[3].trim()}`);
}
const current = [...keys].sort();

if (process.argv.includes("--update")) {
  writeFileSync(BASELINE, current.join("\n") + "\n");
  console.log(`Baseline updated: ${current.length} known errors.`);
  process.exit(0);
}
const base = new Set(existsSync(BASELINE) ? readFileSync(BASELINE, "utf8").split("\n").filter(Boolean) : []);
const fresh = current.filter((k) => !base.has(k));
const fixed = [...base].filter((k) => !keys.has(k)).length;
console.log(`Type errors: ${current.length} (baseline ${base.size}, ${fixed} fixed, ${fresh.length} new).`);
if (fresh.length) {
  console.error("\nNEW type errors:\n" + fresh.join("\n"));
  process.exit(1);
}
