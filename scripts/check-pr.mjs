#!/usr/bin/env node
/**
 * PR gate checks — keep in sync with docs/ai/CHECKLIST.md
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const errors = [];
const warnings = [];

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const name of fs.readdirSync(dir)) {
    if (name === ".git" || name === "node_modules" || name === ".sync-cache") continue;
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

// Required files
for (const rel of [
  "README.md",
  "AGENTS.md",
  "LICENSE",
  "docs/ai/START.md",
  "docs/ai/CHECKLIST.md",
  "docs/ai/PR_PLAYBOOK.md",
  "site/index.html",
  "site/css/site.css",
  "site/docs/index.html",
]) {
  if (!exists(rel)) errors.push(`missing required file: ${rel}`);
}

// Site markers
if (exists("site/index.html")) {
  const html = read("site/index.html");
  if (!html.includes("墨览") && !html.includes("molan")) {
    errors.push("site/index.html missing brand mark");
  }
  if (!html.includes("./try/")) {
    errors.push("site/index.html missing try CTA link");
  }
  if (!html.includes("data-molan-hero")) {
    // soft: we use hero class instead
  }
  if (!html.includes('class="hero"')) {
    errors.push("site/index.html missing hero composition");
  }
}

if (exists("site/try/index.html")) {
  const tryHtml = read("site/try/index.html");
  if (!tryHtml.includes("molan") && !tryHtml.includes("墨览")) {
    warnings.push("site/try/index.html looks unexpected");
  }
} else {
  errors.push("site/try/index.html missing — run: npm run sync -- --dw <DesignWeave>");
}

// Secret patterns in text files (shallow)
const secretRe =
  /(api[_-]?key\s*=\s*['\"][a-zA-Z0-9]{16,}|BEGIN (RSA |OPENSSH )?PRIVATE KEY|ghp_[a-zA-Z0-9]{20,}|sk-[a-zA-Z0-9]{20,})/i;
const textExt = new Set([
  ".md",
  ".html",
  ".css",
  ".js",
  ".mjs",
  ".ts",
  ".json",
  ".yml",
  ".yaml",
  ".txt",
]);

for (const file of walk(root)) {
  const rel = path.relative(root, file);
  if (rel.startsWith("site/try/vendor")) continue;
  const ext = path.extname(file);
  if (!textExt.has(ext)) continue;
  let body;
  try {
    body = fs.readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (secretRe.test(body)) {
    errors.push(`possible secret in ${rel}`);
  }
}

// Large new binaries warning threshold (informational on all large files under site/assets only)
for (const file of walk(path.join(root, "site/assets"))) {
  const st = fs.statSync(file);
  if (st.size > 5 * 1024 * 1024) {
    warnings.push(
      `large asset ${path.relative(root, file)} (${(st.size / 1024 / 1024).toFixed(1)}MB) — explain in PR`
    );
  }
}

for (const w of warnings) console.warn(`warn: ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`error: ${e}`);
  process.exit(1);
}

console.log("check-pr: ok");
