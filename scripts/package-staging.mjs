#!/usr/bin/env node
/** Package staging handoff zip (excludes node_modules, dist, .git) */
import { execSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "..", "artstage-8-staging-package.zip");

execSync(
  `zip -r "${out}" . -x "node_modules/*" -x "dist/*" -x ".git/*" -x "*.zip" -x "test-results/*" -x "playwright-report/*" -x "blob-report/*"`,
  {
    cwd: root,
    stdio: "inherit",
  },
);
console.log(`\nStaging package: ${out}`);
