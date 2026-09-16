#!/usr/bin/env node
/**
 * 编译前确认 zod 能被 molan-protocol / 扩展解析。
 * pnpm 隔离下只装扩展、不装 protocol 依赖时，tsc 会报找不到 zod。
 */
import { createRequire } from "node:module";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..", "..");

export function resolveZod() {
  const probes = [
    join(repoRoot, "packages", "molan-protocol", "package.json"),
    join(root, "package.json"),
    join(repoRoot, "packages", "molan-host", "package.json"),
    join(repoRoot, "package.json"),
  ];
  for (const pkg of probes) {
    try {
      return createRequire(pkg).resolve("zod");
    } catch {
      /* try next */
    }
  }
  return "";
}

function install() {
  console.log("==> 缺少 zod，正在安装 molan-protocol / molan-host / molan-markdown 依赖");
  const env = { ...process.env };
  delete env.CI;
  env.npm_config_frozen_lockfile = "false";
  const result = spawnSync(
    "pnpm",
    [
      "install",
      "--filter",
      "molan-markdown",
      "--filter",
      "@molan/protocol",
      "--filter",
      "@molan/host",
      "--filter",
      "@molan/core",
      "--config.confirmModulesPurge=false",
    ],
    { cwd: repoRoot, stdio: "inherit", env, shell: process.platform === "win32" },
  );
  if (result.status !== 0) {
    throw new Error("pnpm install 失败，无法安装 zod");
  }
}

export function ensureZod() {
  const vditorOk =
    existsSync(join(root, "node_modules", "vditor"))
    || existsSync(join(repoRoot, "node_modules", "vditor"));
  if (!resolveZod() || !vditorOk) install();
  const path = resolveZod();
  if (!path) {
    throw new Error("找不到 zod。请在仓库根目录运行 pnpm install 后再编译墨览扩展");
  }
  return path;
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const path = ensureZod();
  console.log("zod ok:", path);
}
