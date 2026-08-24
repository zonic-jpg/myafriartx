#!/usr/bin/env node
/** Render docs/BUSINESS_CAPABILITIES.md to a print-ready styled HTML file. */
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { marked } from "marked";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const md = readFileSync(join(root, "docs/BUSINESS_CAPABILITIES.md"), "utf8");
const body = marked.parse(md);

const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>MyAfriart — Business Capabilities</title>
<style>
  @page { size: A4; margin: 22mm 18mm; }
  :root { --ink: #1c1917; --muted: #57534e; --accent: #92400e; --rule: #e7e5e4; }
  * { box-sizing: border-box; }
  body {
    font-family: "Avenir Next", "Helvetica Neue", Arial, sans-serif;
    color: var(--ink); font-size: 10.5pt; line-height: 1.55; margin: 0;
  }
  h1 {
    font-size: 21pt; line-height: 1.2; letter-spacing: -0.01em;
    border-bottom: 3px solid var(--accent); padding-bottom: 10px; margin: 0 0 6px;
  }
  h1 + p strong { color: var(--muted); font-weight: 600; }
  h2 {
    font-size: 14.5pt; color: var(--accent); margin: 26px 0 8px;
    page-break-after: avoid; border-bottom: 1px solid var(--rule); padding-bottom: 4px;
  }
  h3 { font-size: 11.5pt; margin: 18px 0 6px; page-break-after: avoid; }
  p { margin: 6px 0; }
  ul, ol { margin: 6px 0; padding-left: 20px; }
  li { margin: 3px 0; }
  table {
    border-collapse: collapse; width: 100%; margin: 8px 0 12px;
    font-size: 9.5pt; page-break-inside: avoid;
  }
  th {
    text-align: left; background: #faf7f2; color: var(--accent);
    border: 1px solid var(--rule); padding: 6px 9px; font-size: 9pt;
    text-transform: uppercase; letter-spacing: 0.04em;
  }
  td { border: 1px solid var(--rule); padding: 6px 9px; vertical-align: top; }
  blockquote {
    margin: 14px 0; padding: 12px 16px; background: #faf7f2;
    border-left: 4px solid var(--accent); font-size: 11.5pt; font-style: italic;
  }
  blockquote p { margin: 0; }
  code {
    font-family: "SF Mono", Menlo, monospace; font-size: 9pt;
    background: #f5f5f4; padding: 1px 4px; border-radius: 3px;
  }
  hr { border: 0; border-top: 1px solid var(--rule); margin: 20px 0; }
  strong { font-weight: 700; }
</style>
</head>
<body>${body}</body>
</html>`;

const out = join(root, "docs/BUSINESS_CAPABILITIES.html");
writeFileSync(out, html);
console.log(out);
