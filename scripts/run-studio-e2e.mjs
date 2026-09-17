#!/usr/bin/env node
/**
 * Studio 浏览器 e2e：自动装 puppeteer/Chromium、sync vendor，再跑全部用例。
 * 用法（仓库根目录）：
 *   ./molan e2e
 *   node scripts/run-studio-e2e.mjs
 *   pnpm --filter @molan/studio e2e
 */
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureBrowser } from "../apps/studio/scripts/e2e-chrome.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const scripts = join(root, "apps", "studio", "scripts");

const suite = [
  "editor-e2e.mjs",
  "buttons-e2e.mjs",
  "table-e2e.mjs",
];

const only = process.argv.slice(2).filter((a) => !a.startsWith("-"));
const selected = only.length
  ? suite.filter((name) => only.some((q) => name.includes(q)))
  : suite;

if (!selected.length) {
  console.error(`未知套件。可选：${suite.join(", ")}`);
  process.exit(1);
}

console.log("studio e2e: 准备运行时…");
const { executablePath } = ensureBrowser(root);
console.log(`studio e2e: Chrome → ${executablePath}`);

let failed = 0;
for (const name of selected) {
  console.log(`\n==> ${name}`);
  const result = spawnSync(process.execPath, [join(scripts, name)], {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });
  if ((result.status || 0) !== 0) failed += 1;
}

if (failed) {
  console.error(`\nstudio e2e: ${failed}/${selected.length} 失败`);
  process.exit(1);
}
console.log(`\nstudio e2e: ${selected.length} 套件全部通过`);
