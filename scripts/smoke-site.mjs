#!/usr/bin/env node
/**
 * Static smoke: required pages exist and contain expected anchors.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const site = path.join(root, "site");

const errors = [];

function mustContain(rel, needles) {
  const p = path.join(site, rel);
  if (!fs.existsSync(p)) {
    errors.push(`missing ${rel}`);
    return;
  }
  const body = fs.readFileSync(p, "utf8");
  for (const n of needles) {
    if (!body.includes(n)) errors.push(`${rel} missing marker: ${n}`);
  }
}

mustContain("index.html", ["墨览", "./try/", "fengshihao.molan-markdown", "hero"]);
mustContain("docs/index.html", ["START.md", "AGENTS.md", "./molan check"]);
mustContain("css/site.css", ["--ink", "Instrument Serif", ".hero"]);

if (!fs.existsSync(path.join(site, "try/index.html"))) {
  errors.push("try/index.html missing");
} else {
  mustContain("try/index.html", ["molan"]);
}

if (!fs.existsSync(path.join(site, "assets/intro.gif"))) {
  errors.push("assets/intro.gif missing");
}

if (errors.length) {
  for (const e of errors) console.error(`smoke: ${e}`);
  process.exit(1);
}

console.log("smoke-site: ok");
