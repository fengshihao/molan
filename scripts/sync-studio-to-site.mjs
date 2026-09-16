#!/usr/bin/env node
/**
 * Sync apps/studio → site/try (+ marketing assets).
 * Usage: node scripts/sync-studio-to-site.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const studio = path.join(root, "apps/studio");
const tryDir = path.join(root, "site/try");
const assetsDir = path.join(root, "site/assets");

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
    if (st.isDirectory()) copyDir(from, to, { skip });
    else copyFile(from, to);
  }
}

if (!fs.existsSync(path.join(studio, "index.html"))) {
  console.error(`No studio at ${studio}`);
  process.exit(1);
}

console.log(`Sync from ${studio}`);
fs.rmSync(tryDir, { recursive: true, force: true });
ensureDir(tryDir);
copyDir(studio, tryDir, {
  skip: ["node_modules", "deploy", "deploy.example", "scripts", ".DS_Store"],
});

ensureDir(assetsDir);
for (const name of [
  "intro.gif",
  "studio-intro.gif",
  "favicon.png",
  "apple-touch-icon.png",
]) {
  const src = path.join(studio, name);
  if (fs.existsSync(src)) copyFile(src, path.join(assetsDir, name));
}

const tryIndex = path.join(tryDir, "index.html");
if (fs.existsSync(tryIndex)) {
  let html = fs.readFileSync(tryIndex, "utf8");
  if (!html.includes("data-molan-portal-home")) {
    const snip = `<a data-molan-portal-home href="../" style="position:fixed;z-index:9999;right:12px;bottom:12px;padding:8px 12px;font:500 13px/1.2 system-ui,sans-serif;color:#e8efe9;background:rgba(30,42,36,.92);border:1px solid rgba(232,239,233,.18);border-radius:2px;text-decoration:none">← 墨览官网</a>\n`;
    html = html.includes("</body>") ? html.replace("</body>", `${snip}</body>`) : html + snip;
    fs.writeFileSync(tryIndex, html, "utf8");
  }
}

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

fs.writeFileSync(
  path.join(tryDir, "MOLAN_PORTAL.txt"),
  "Synced from apps/studio. Edit the studio, then ./molan sync.\n",
  "utf8"
);

console.log("Synced site/try and site/assets.");
