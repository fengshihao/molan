#!/usr/bin/env node
/**
 * Sync studio try assets from DesignWeave into this repo.
 * Usage: node scripts/sync-from-designweave.mjs [--dw /path/to/DesignWeave]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function parseArgs(argv) {
  const out = { dw: null };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--dw" && argv[i + 1]) {
      out.dw = path.resolve(argv[++i]);
    }
  }
  return out;
}

function resolveDw(cliDw) {
  if (cliDw) return cliDw;
  if (process.env.DESIGNWEAVE_ROOT) {
    return path.resolve(process.env.DESIGNWEAVE_ROOT);
  }
  const sibling = path.resolve(root, "../DesignWeave");
  if (fs.existsSync(sibling)) return sibling;
  return null;
}

function rmrf(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function copyDir(src, dest, { skip = [] } = {}) {
  ensureDir(dest);
  for (const name of fs.readdirSync(src)) {
    if (skip.includes(name)) continue;
    const from = path.join(src, name);
    const to = path.join(dest, name);
    const st = fs.statSync(from);
    if (st.isDirectory()) {
      copyDir(from, to, { skip });
    } else {
      copyFile(from, to);
    }
  }
}

const { dw: cliDw } = parseArgs(process.argv.slice(2));
const dw = resolveDw(cliDw);

if (!dw || !fs.existsSync(dw)) {
  console.error(
    "Cannot find DesignWeave. Pass --dw <path> or set DESIGNWEAVE_ROOT, or place the repo at ../DesignWeave"
  );
  process.exit(1);
}

const viewer = path.join(dw, "tools/markdown-viewer");
if (!fs.existsSync(path.join(viewer, "index.html"))) {
  console.error(`No studio at ${viewer}`);
  process.exit(1);
}

const tryDir = path.join(root, "site/try");
const assetsDir = path.join(root, "site/assets");

console.log(`Sync from ${viewer}`);
rmrf(tryDir);
ensureDir(tryDir);

const skip = new Set([
  "node_modules",
  "deploy",
  "deploy.example",
  "scripts",
  ".DS_Store",
]);

copyDir(viewer, tryDir, {
  skip: [...skip],
});

// Assets for marketing site
ensureDir(assetsDir);
for (const name of [
  "intro.gif",
  "studio-intro.gif",
  "favicon.png",
  "apple-touch-icon.png",
]) {
  const src = path.join(viewer, name);
  if (fs.existsSync(src)) {
    copyFile(src, path.join(assetsDir, name));
  }
}

// Inject a thin "back to site" banner note via overlay file for discoverability
const notePath = path.join(tryDir, "MOLAN_PORTAL.txt");
fs.writeFileSync(
  notePath,
  "This folder is synced from DesignWeave tools/markdown-viewer. Edit the source there, then npm run sync.\nPortal home: ../index.html\n",
  "utf8"
);

// Patch try index with a portal home link (idempotent)
const tryIndex = path.join(tryDir, "index.html");
if (fs.existsSync(tryIndex)) {
  let html = fs.readFileSync(tryIndex, "utf8");
  if (!html.includes("data-molan-portal-home")) {
    const snip = `<a data-molan-portal-home href="../" style="position:fixed;z-index:9999;right:12px;bottom:12px;padding:8px 12px;font:500 13px/1.2 system-ui,sans-serif;color:#e8efe9;background:rgba(30,42,36,.92);border:1px solid rgba(232,239,233,.18);border-radius:2px;text-decoration:none">← 墨览官网</a>\n`;
    if (html.includes("</body>")) {
      html = html.replace("</body>", `${snip}</body>`);
    } else {
      html += snip;
    }
    fs.writeFileSync(tryIndex, html, "utf8");
  }
}

// Studio upstream ignores vendor/; portal must ship it for GitHub Pages try/
const tryGitignore = path.join(tryDir, ".gitignore");
if (fs.existsSync(tryGitignore)) {
  let gi = fs.readFileSync(tryGitignore, "utf8");
  gi = gi
    .split("\n")
    .filter((line) => line.trim() !== "vendor/" && line.trim() !== "vendor")
    .join("\n");
  if (!gi.includes("# portal ships vendor")) {
    gi = `# portal ships vendor for Pages try/\n${gi}`;
  }
  fs.writeFileSync(tryGitignore, gi, "utf8");
}

console.log("Synced site/try and site/assets.");
