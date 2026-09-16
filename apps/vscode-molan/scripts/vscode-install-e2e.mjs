#!/usr/bin/env node
/**
 * 端到端：安装 .vsix → 用 VS Code 打开示例 .md → 解析日志，确认扩展能加载且无 zod 等模块错误。
 * 云环境无桌面时用 xvfb-run；本机可直接跑。
 */
import assert from "node:assert/strict";
import { spawnSync, spawn } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { homedir, tmpdir } from "node:os";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..", "..");
const sampleMd = join(repoRoot, "apps", "studio", "demo", "实例演示.md");
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

function packageVsix() {
  console.log("vscode-install-e2e: 未找到 .vsix，正在打包…");
  const result = spawnSync(
    "npx",
    [
      "--yes",
      "@vscode/vsce",
      "package",
      "--no-dependencies",
      "--baseContentUrl",
      "https://github.com/fengshihao/molan/blob/main/apps/vscode-molan",
      "--baseImagesUrl",
      "https://molan.guoyoutech.cn",
    ],
    { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
  );
  assert(
    result.status === 0,
    `vsce package failed: ${result.stderr || result.stdout || result.status}`,
  );
}

function latestVsix() {
  const wanted = join(root, `molan-markdown-${pkg.version}.vsix`);
  if (!existsSync(wanted)) {
    packageVsix();
  }
  assert(existsSync(wanted), `missing molan-markdown-${pkg.version}.vsix after package`);
  return wanted;
}

function knownEditorBinaries() {
  const home = homedir();
  if (process.platform === "darwin") {
    return [
      "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code",
      join(home, "Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"),
      "/Applications/Cursor.app/Contents/Resources/app/bin/cursor",
      join(home, "Applications/Cursor.app/Contents/Resources/app/bin/cursor"),
    ];
  }
  if (process.platform === "linux") {
    return [
      "/usr/share/code/bin/code",
      "/usr/bin/code",
      "/snap/bin/code",
      join(home, ".cursor", "bin", "cursor"),
      "/usr/bin/cursor",
    ];
  }
  if (process.platform === "win32") {
    const localAppData = process.env.LOCALAPPDATA || join(home, "AppData", "Local");
    return [
      join(localAppData, "Programs", "Microsoft VS Code", "bin", "code.cmd"),
      join(localAppData, "Programs", "cursor", "resources", "app", "bin", "cursor.cmd"),
    ];
  }
  return [];
}

function resolveCodeBinary() {
  const env = process.env.MOLAN_VSCODE_BIN?.trim();
  if (env && existsSync(env)) return env;
  const bundled = "/tmp/vscode-test/VSCode-linux-x64/bin/code";
  if (existsSync(bundled)) return bundled;
  for (const name of ["code", "cursor"]) {
    const hit = spawnSync("sh", ["-lc", `command -v ${name}`], { encoding: "utf8" });
    const bin = hit.stdout.trim();
    if (hit.status === 0 && bin) return bin;
  }
  for (const bin of knownEditorBinaries()) {
    if (existsSync(bin)) return bin;
  }
  return "";
}

function ensureBundledVsCode() {
  const bundled = "/tmp/vscode-test/VSCode-linux-x64/bin/code";
  if (existsSync(bundled)) return bundled;
  if (process.platform !== "linux" || process.arch !== "x64") return "";
  mkdirSync("/tmp/vscode-test", { recursive: true });
  const archive = "/tmp/vscode-test/code.tar.gz";
  const dl = spawnSync(
    "curl",
    [
      "-fsSL",
      "https://update.code.visualstudio.com/latest/linux-x64/stable",
      "-o",
      archive,
    ],
    { encoding: "utf8", timeout: 120_000 },
  );
  if (dl.status !== 0) return "";
  const untar = spawnSync("tar", ["-xzf", archive, "-C", "/tmp/vscode-test"], {
    encoding: "utf8",
    timeout: 120_000,
  });
  return untar.status === 0 && existsSync(bundled) ? bundled : "";
}

function installVsix(code, vsix, extDir) {
  const result = spawnSync(
    code,
    ["--install-extension", vsix, "--extensions-dir", extDir, "--force"],
    { encoding: "utf8", timeout: 120_000 },
  );
  assert(result.status === 0, `install vsix failed: ${result.stderr || result.stdout}`);
  assert(
    existsSync(join(extDir, `fengshihao.molan-markdown-${pkg.version}`)),
    `extension dir fengshihao.molan-markdown-${pkg.version} missing`,
  );
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function collectLogText(...roots) {
  const chunks = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const name of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, name.name);
      if (name.isDirectory()) walk(path);
      else if (/\.log$|\.stderr$/i.test(name.name)) {
        try {
          chunks.push(readFileSync(path, "utf8"));
        } catch {
          /* ignore */
        }
      }
    }
  };
  for (const dir of roots) walk(dir);
  return chunks.join("\n");
}

function listInstalledExtension(code, extDir) {
  const result = spawnSync(
    code,
    ["--extensions-dir", extDir, "--list-extensions", "--show-versions"],
    { encoding: "utf8" },
  );
  return result.stdout || "";
}

function runIsolatedActivate() {
  const extJs = join(root, "out", "extension.js");
  assert(existsSync(extJs), "missing out/extension.js — run compile first");
  const dir = mkdtempSync(join(tmpdir(), "molan-vscode-isolated-"));
  try {
    cpSync(extJs, join(dir, "extension.js"));
    writeFileSync(
      join(dir, "vscode.cjs"),
      `module.exports = {
  window: {
    showWarningMessage() {},
    showInformationMessage() {},
    registerCustomEditorProvider() { return { dispose() {} }; },
    tabGroups: { activeTabGroup: { tabs: [] } },
    activeTextEditor: undefined,
  },
  commands: { registerCommand() { return { dispose() {} }; } },
  workspace: {
    getConfiguration() { return { get() { return {}; }, update() { return Promise.resolve(); } }; },
    workspaceFolders: [],
    fs: {},
  },
  Uri: {
    joinPath() { return { fsPath: "", path: "", scheme: "file", toString() { return ""; } }; },
    parse(s) { return { fsPath: String(s), path: String(s), toString() { return String(s); } }; },
  },
  ConfigurationTarget: { Global: 1 },
  EventEmitter: class {
    constructor() { this.event = () => ({ dispose() {} }); }
    fire() {}
    dispose() {}
  },
};
`,
    );
    writeFileSync(
      join(dir, "run.cjs"),
      `const Module = require("module");
const path = require("path");
const orig = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === "vscode") return path.join(__dirname, "vscode.cjs");
  return orig.call(this, request, parent, isMain, options);
};
const ext = require("./extension.js");
if (typeof ext.activate !== "function") throw new Error("activate missing");
const subscriptions = [];
ext.activate({
  subscriptions,
  extensionUri: { fsPath: __dirname, path: __dirname, toString() { return "file://" + __dirname; } },
  extensionPath: __dirname,
});
if (!subscriptions.length) throw new Error("activate registered nothing");
console.log("isolated-activate-ok");
`,
    );
    const result = spawnSync(process.execPath, [join(dir, "run.cjs")], {
      encoding: "utf8",
      cwd: dir,
      env: { ...process.env, NODE_PATH: "" },
    });
    return result.status === 0 && (result.stdout || "").includes("isolated-activate-ok");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function pollLogStats(userDataDir, logDir, deadlineMs = 15_000) {
  const start = Date.now();
  let stats = analyzeLogs("");
  while (Date.now() - start < deadlineMs) {
    const text = collectLogText(join(userDataDir, "logs"), logDir);
    stats = analyzeLogs(text);
    if (stats.molanExt && stats.molanView) break;
    await sleep(500);
  }
  if (!stats.molanExt || !stats.molanView) {
    const text = collectLogText(join(userDataDir, "logs"), logDir);
    stats = analyzeLogs(text);
  }
  return stats;
}

function analyzeLogs(text) {
  const cannotFind = /Cannot find module/i.test(text);
  const activateFail = /Activating extension fengshihao\.molan-markdown failed/i.test(text);
  const molanView = /molan\.markdownEditor/.test(text);
  const molanExt = /fengshihao\.molan-markdown/.test(text);
  const customProvider =
    /registerCustomEditorProvider[\s\S]{0,120}molan\.markdownEditor/.test(text) ||
    /\$registerCustomEditorProvider\([\s\S]{0,120}molan\.markdownEditor/.test(text);
  return { cannotFind, activateFail, molanView, molanExt, customProvider };
}

async function openSampleAndCollectLogs(code, vsix) {
  const waitMs = process.env.CI ? 40_000 : 20_000;
  assert(existsSync(sampleMd), `sample markdown missing: ${sampleMd}`);
  const userDataDir = mkdtempSync(join(tmpdir(), "molan-vscode-e2e-"));
  const extDir = mkdtempSync(join(tmpdir(), "molan-vscode-ext-"));
  const logDir = mkdtempSync(join(tmpdir(), "molan-vscode-log-"));
  mkdirSync(join(userDataDir, "User"), { recursive: true });
  writeFileSync(
    join(userDataDir, "User", "settings.json"),
    JSON.stringify(
      {
        "workbench.editorAssociations": {
          "*.md": "molan.markdownEditor",
          "*.markdown": "molan.markdownEditor",
          "*.mdown": "molan.markdownEditor",
          "*.mdx": "molan.markdownEditor",
        },
        "extensions.autoCheckUpdates": false,
        "extensions.autoUpdate": false,
        "update.mode": "none",
        "telemetry.telemetryLevel": "off",
      },
      null,
      2,
    ),
  );

  installVsix(code, vsix, extDir);
  const installed = listInstalledExtension(code, extDir);
  assert(
    installed.includes(`fengshihao.molan-markdown@${pkg.version}`) ||
      installed.includes("fengshihao.molan-markdown"),
    `extension not listed after install: ${installed.trim()}`,
  );

  const args = [
    "--user-data-dir",
    userDataDir,
    "--extensions-dir",
    extDir,
    "--disable-gpu",
    "--no-sandbox",
    "--log",
    logDir,
    "--disable-workspace-trust",
    "--skip-welcome",
    "--skip-release-notes",
    "--disable-telemetry",
    sampleMd,
  ];
  const prefix =
    process.platform === "linux" && !process.env.DISPLAY ? ["xvfb-run", "-a"] : [];
  const cmd = prefix.length ? prefix[0] : code;
  const cmdArgs = prefix.length ? [...prefix.slice(1), code, ...args] : args;

  await new Promise((resolve) => {
    const child = spawn(cmd, cmdArgs, {
      stdio: "ignore",
      detached: true,
    });
    child.unref();
    setTimeout(() => {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        try {
          child.kill("SIGTERM");
        } catch {
          /* ignore */
        }
      }
      resolve();
    }, waitMs);
  });

  spawnSync("pkill", ["-f", userDataDir], { encoding: "utf8" });
  await sleep(2000);
  const stats = await pollLogStats(userDataDir, logDir);
  const isolatedOk = runIsolatedActivate();

  try {
    rmSync(userDataDir, { recursive: true, force: true });
    rmSync(extDir, { recursive: true, force: true });
    rmSync(logDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
  return { stats, isolatedOk, installed: installed.trim() };
}

async function main() {
  let code = resolveCodeBinary();
  if (!code) code = ensureBundledVsCode();
  assert(code, "need VS Code or Cursor CLI, or linux-x64 to download VS Code");

  const vsix = latestVsix();
  console.log(`vscode-install-e2e: ${code}`);
  console.log(`  vsix: ${vsix}`);
  console.log(`  sample: ${sampleMd}`);

  const { stats, isolatedOk, installed } = await openSampleAndCollectLogs(code, vsix);
  console.log("  installed:", installed);
  console.log("  log checks:", stats);
  console.log("  isolated activate:", isolatedOk);

  assert(!stats.cannotFind, "extension host logged Cannot find module");
  assert(!stats.activateFail, "molan-markdown activation failed");
  assert(
    (stats.molanExt && stats.molanView) || isolatedOk,
    "molan extension neither appeared in VS Code logs nor passed isolated activate",
  );

  console.log("vscode-install-e2e ok");
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
