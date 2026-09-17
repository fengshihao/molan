/**
 * Studio / 录制脚本共用的浏览器运行时。
 * AI / CI：不要求本机预装 Chrome；优先系统 Chrome，否则用 puppeteer 自带 Chromium。
 * 缺依赖时自动 pnpm install / sync vendor，无需人工配置。
 */
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const require = createRequire(import.meta.url);
const studioRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const defaultRepoRoot = join(studioRoot, "..", "..");

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

function tryRequirePuppeteer(repoRoot) {
  const paths = [
    join(studioRoot, "node_modules", "puppeteer"),
    join(repoRoot, "node_modules", "puppeteer"),
    join(studioRoot, "node_modules", "puppeteer-core"),
    join(repoRoot, "node_modules", "puppeteer-core"),
    "puppeteer",
    "puppeteer-core",
  ];
  for (const p of paths) {
    try {
      return require(p);
    } catch {
      /* try next */
    }
  }
  return null;
}

function run(cmd, args, cwd) {
  const result = spawnSync(cmd, args, {
    cwd,
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env,
  });
  return result.status || 0;
}

/**
 * 确保 puppeteer（含 Chromium）已安装；缺则自动装。
 * @returns {typeof import("puppeteer")}
 */
export function ensurePuppeteer(repoRoot = defaultRepoRoot) {
  let puppeteer = tryRequirePuppeteer(repoRoot);
  if (puppeteer) return puppeteer;

  console.log("studio e2e: 未找到 puppeteer，正在自动安装…");
  const code = run("pnpm", ["install"], repoRoot);
  if (code !== 0) {
    console.error("studio e2e: pnpm install 失败。请在仓库根目录手动运行：pnpm install");
    process.exit(1);
  }

  puppeteer = tryRequirePuppeteer(repoRoot);
  if (!puppeteer) {
    console.error("studio e2e: 无法加载 puppeteer。请在仓库根目录运行：pnpm install");
    process.exit(1);
  }
  return puppeteer;
}

/** @deprecated 用 ensurePuppeteer */
export function loadPuppeteer(repoRoot) {
  return ensurePuppeteer(repoRoot);
}

/**
 * 解析可执行 Chrome：系统安装优先，否则 puppeteer 自带 Chromium。
 */
export function resolveChromePath(puppeteer) {
  const system = findChromePath();
  if (system) return system;

  try {
    const bundled = typeof puppeteer.executablePath === "function"
      ? puppeteer.executablePath()
      : null;
    if (bundled && existsSync(bundled)) return bundled;
  } catch {
    /* fall through */
  }

  console.error("studio e2e: 找不到 Chrome/Chromium。");
  console.error("  已尝试系统路径与 puppeteer 自带浏览器。");
  console.error("  也可设置：export CHROME_PATH=/path/to/chrome");
  process.exit(1);
}

/** @deprecated 用 resolveChromePath(ensurePuppeteer()) */
export function requireChromePath() {
  return resolveChromePath(ensurePuppeteer());
}

/**
 * 确保 apps/studio/vendor/vditor 存在（gitignore，需从 vditor 包同步）。
 */
export function ensureStudioVendor(repoRoot = defaultRepoRoot) {
  const marker = join(studioRoot, "vendor", "vditor", "dist", "index.min.js");
  if (existsSync(marker)) return;

  console.log("studio e2e: 缺少 vendor/vditor，正在 sync-media…");
  const sync = join(repoRoot, "apps", "vscode-molan", "scripts", "sync-media.mjs");
  const code = run(process.execPath, [sync], repoRoot);
  if (code !== 0 || !existsSync(marker)) {
    console.error("studio e2e: sync-media 失败。请先：pnpm build && node apps/vscode-molan/scripts/sync-media.mjs");
    process.exit(1);
  }
}

/**
 * 一键准备浏览器运行时（AI / CI 入口）。
 * @returns {{ puppeteer: object, executablePath: string }}
 */
export function ensureBrowser(repoRoot = defaultRepoRoot) {
  ensureStudioVendor(repoRoot);
  const puppeteer = ensurePuppeteer(repoRoot);
  const executablePath = resolveChromePath(puppeteer);
  return { puppeteer, executablePath };
}
