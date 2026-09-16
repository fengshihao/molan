#!/usr/bin/env node
/**
 * 把扩展入口和 workspace 包（molan-host / molan-protocol）打成一份 CJS。
 * vsce --no-dependencies 不会带上 node_modules，未打包时安装后会一直转圈。
 */
import { createRequire } from "node:module";
import { mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureZod } from "./ensure-deps.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..", "..");
const watch = process.argv.includes("--watch");

function loadEsbuild() {
  const probes = [
    join(repoRoot, "packages", "molan-host", "package.json"),
    join(root, "package.json"),
    join(repoRoot, "package.json"),
  ];
  for (const pkg of probes) {
    try {
      return createRequire(pkg)("esbuild");
    } catch {
      /* try next */
    }
  }
  throw new Error("找不到 esbuild。请先在仓库根目录 pnpm install");
}

const esbuild = loadEsbuild();
const zodEntry = ensureZod();
mkdirSync(join(root, "out"), { recursive: true });

const options = {
  absWorkingDir: root,
  entryPoints: ["src/extension.ts"],
  outfile: "out/extension.js",
  bundle: true,
  platform: "node",
  format: "cjs",
  target: ["node18"],
  sourcemap: true,
  sourcesContent: false,
  external: ["vscode"],
  alias: { zod: zodEntry },
  nodePaths: [
    join(root, "node_modules"),
    join(repoRoot, "packages", "molan-protocol", "node_modules"),
    join(repoRoot, "packages", "molan-host", "node_modules"),
    join(repoRoot, "node_modules"),
  ],
  logLevel: "info",
};

const ctx = await esbuild.context(options);
if (watch) {
  await ctx.watch();
  console.log("bundling molan-markdown (watch)");
} else {
  await ctx.rebuild();
  await ctx.dispose();
  for (const name of readdirSync(join(root, "out"))) {
    if (name === "extension.js" || name === "extension.js.map") continue;
    unlinkSync(join(root, "out", name));
  }
  console.log("bundled molan-markdown → out/extension.js");
}
