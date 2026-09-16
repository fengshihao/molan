import { existsSync } from "node:fs";
import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

export function ensureMolanPackagesBuilt() {
  const protocolRun = join(repoRoot, "packages", "molan-protocol", "dist", "run.js");
  const coreEditor = join(repoRoot, "packages", "molan-core", "dist", "molan-editor.js");
  const hostBridge = join(repoRoot, "packages", "molan-host", "dist", "vscode-bridge.js");

  if (existsSync(protocolRun) && existsSync(coreEditor) && existsSync(hostBridge)) return;

  console.log("==> 构建 @molan/protocol / molan-core / molan-host …");
  execSync(
    "pnpm --filter @molan/protocol build && pnpm --filter @molan/core build && pnpm --filter @molan/host build",
    { cwd: repoRoot, stdio: "inherit" },
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  ensureMolanPackagesBuilt();
}
