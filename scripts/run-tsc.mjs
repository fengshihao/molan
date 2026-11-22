#!/usr/bin/env node
/**
 * 调用本包 typescript，不依赖全局 tsc 或 node_modules/.bin。
 * 用法（在对应 package 目录）：node ../../scripts/run-tsc.mjs -p tsconfig.json
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";

function findTsc(start) {
  let dir = start;
  while (true) {
    try {
      return createRequire(join(dir, "package.json")).resolve("typescript/bin/tsc");
    } catch {
      const parent = dirname(dir);
      if (parent === dir) return "";
      dir = parent;
    }
  }
}

const cwd = process.cwd();
const tsc = findTsc(cwd);
if (!tsc || !existsSync(tsc)) {
  console.error("找不到 tsc。请在仓库根目录运行 pnpm install");
  process.exit(1);
}

const result = spawnSync(process.execPath, [tsc, ...process.argv.slice(2)], {
  cwd,
  stdio: "inherit",
});
process.exit(result.status ?? 1);
