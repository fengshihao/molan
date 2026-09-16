import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const require = createRequire(import.meta.url);

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  join(homedir(), "Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
  "/usr/local/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
].filter(Boolean);

export function findChromePath() {
  return CHROME_CANDIDATES.find((path) => existsSync(path)) || null;
}

export function requireChromePath() {
  const chrome = findChromePath();
  if (chrome) return chrome;
  console.error("需要 Google Chrome 或 Chromium。");
  console.error("macOS 请安装 Chrome，或设置：export CHROME_PATH=\"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome\"");
  process.exit(1);
}

export function loadPuppeteer(repoRoot) {
  const paths = [
    "puppeteer-core",
    join(repoRoot, "node_modules", "puppeteer-core"),
    "/tmp/molan-rec/node_modules/puppeteer-core",
  ];
  for (const p of paths) {
    try {
      return require(p);
    } catch {
      /* try next */
    }
  }
  console.error("请先安装 puppeteer-core：npm install --prefix /tmp/molan-rec puppeteer-core");
  process.exit(1);
}
