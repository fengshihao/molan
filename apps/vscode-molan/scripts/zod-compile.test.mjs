#!/usr/bin/env node
/**
 * 回归：没有 zod 时 protocol 编译失败；ensure-deps 装上后能编过。
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..", "..");
const protocol = join(repoRoot, "packages", "molan-protocol");
const hideDir = join("/tmp", "molan-zod-compile-test");
const zodPaths = [
  join(protocol, "node_modules", "zod"),
  join(repoRoot, "packages", "molan-host", "node_modules", "zod"),
  join(root, "node_modules", "zod"),
];

function run(cmd, args, opts = {}) {
  return spawnSync(cmd, args, {
    encoding: "utf8",
    cwd: opts.cwd || repoRoot,
    env: { ...process.env, ...(opts.env || {}) },
    shell: process.platform === "win32",
  });
}

function hideZod() {
  mkdirSync(hideDir, { recursive: true });
  for (const p of zodPaths) {
    if (!existsSync(p)) continue;
    renameSync(p, join(hideDir, p.replaceAll("/", "_")));
  }
}

function restoreZod() {
  for (const p of zodPaths) {
    const hid = join(hideDir, p.replaceAll("/", "_"));
    if (existsSync(hid) && !existsSync(p)) renameSync(hid, p);
  }
}

function protocolTsc() {
  return run("pnpm", ["--filter", "@molan/protocol", "exec", "tsc", "-p", "tsconfig.json", "--noEmit"]);
}

try {
  hideZod();
  const missing = protocolTsc();
  assert.notEqual(missing.status, 0, "藏起 zod 后 protocol tsc 应失败");
  assert.match(
    `${missing.stdout || ""}\n${missing.stderr || ""}`,
    /Cannot find module 'zod'|找不到 zod/,
    "失败信息应提到 zod",
  );

  const ensure = run(process.execPath, [join(root, "scripts", "ensure-deps.mjs")]);
  assert.equal(ensure.status, 0, `ensure-deps 应装回 zod: ${ensure.stderr || ensure.stdout}`);
  createRequire(join(protocol, "package.json")).resolve("zod");

  const ok = protocolTsc();
  assert.equal(ok.status, 0, `装回 zod 后 protocol tsc 应通过: ${ok.stderr || ok.stdout}`);
  console.log("zod compile regression ok");
} finally {
  restoreZod();
}
