#!/usr/bin/env node
/**
 * Molan CLI
 *
 *   ./molan              open local site
 *   ./molan try|docs     open pages
 *   ./molan install      install editor extension from marketplace
 *   ./molan check        site + package gates
 *   ./molan e2e          studio browser e2e (auto Chrome/puppeteer)
 *   ./molan build        build @molan/* packages
 *   ./molan package      build .vsix
 *   ./molan publish      publish extension (needs OVSX_PAT)
 *   ./molan sync         sync apps/studio → site/try
 *   ./molan web|help
 */
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  defaultPort,
  isPortOpen,
  startSiteServer,
} from "../scripts/site-server.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const EXT_ID = "fengshihao.molan-markdown";
const WEB_HOME = "https://fengshihao.github.io/molan/";
const WEB_TRY = "https://fengshihao.github.io/molan/try/";
const WEB_DOCS = "https://fengshihao.github.io/molan/docs/";
const WEB_FORMAL = "https://molan.guoyoutech.cn/";

function help() {
  console.log(`molan

Usage:
  molan              Open local homepage
  molan try          Open local try studio
  molan docs         Open local contribute guide
  molan install      Install Cursor / VS Code extension (marketplace)
  molan check        Run acceptance checks
  molan e2e          Studio browser e2e (auto-installs Chrome/puppeteer)
  molan build        Build @molan/protocol, core, host
  molan package      Build extension .vsix
  molan publish      Publish extension (Open VSX; needs OVSX_PAT)
  molan sync         Sync apps/studio → site/try
  molan web          Open online homepage
  molan help
`);
}

function openUrl(url) {
  const platform = process.platform;
  let cmd;
  let args;
  if (platform === "darwin") {
    cmd = "open";
    args = [url];
  } else if (platform === "win32") {
    cmd = "cmd";
    args = ["/c", "start", "", url];
  } else {
    cmd = "xdg-open";
    args = [url];
  }
  const child = spawn(cmd, args, { detached: true, stdio: "ignore" });
  child.unref();
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    cwd: root,
    shell: process.platform === "win32",
    ...opts,
  });
  process.exitCode = result.status || 0;
  return result.status || 0;
}

function normalize(argv) {
  const raw = (argv[0] || "open").trim().toLowerCase();
  const map = {
    open: "open",
    start: "open",
    try: "try",
    studio: "try",
    docs: "docs",
    doc: "docs",
    contribute: "docs",
    install: "install",
    ext: "install",
    extension: "install",
    check: "check",
    test: "check",
    e2e: "e2e",
    "studio-e2e": "e2e",
    build: "build",
    package: "package",
    pkg: "package",
    publish: "publish",
    web: "web",
    online: "web",
    site: "web",
    sync: "sync",
    help: "help",
    "-h": "help",
    "--help": "help",
  };
  return map[raw] || "unknown";
}

async function ensureLocalAndOpen(pathname = "/") {
  const port = defaultPort;
  const base = `http://127.0.0.1:${port}`;
  const target = `${base}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;

  const already = await isPortOpen(port);
  if (!already) {
    await startSiteServer({ port });
    console.log("Local molan is ready.");
  } else {
    console.log("Local molan is already running.");
  }

  openUrl(target);
  console.log(`Opened ${target}`);
  if (!already) {
    console.log("Press Ctrl+C to stop the local preview.");
    await new Promise(() => {});
  }
}

function findEditorCli() {
  const candidates =
    process.platform === "win32"
      ? ["cursor.cmd", "cursor", "code.cmd", "code"]
      : ["cursor", "code"];
  for (const name of candidates) {
    const probe = spawnSync(name, ["--version"], { encoding: "utf8" });
    if (probe.status === 0) {
      return { name, label: name.startsWith("cursor") ? "Cursor" : "VS Code" };
    }
  }
  return null;
}

function installExtension() {
  const editor = findEditorCli();
  if (!editor) {
    console.log(`Could not find Cursor or VS Code CLI.

Install manually:
  1. Open Cursor / VS Code
  2. Search extensions for "墨览" or ${EXT_ID}
  3. Install

Stores:
  https://open-vsx.org/extension/fengshihao/molan-markdown
  https://marketplace.visualstudio.com/items?itemName=${EXT_ID}
`);
    process.exitCode = 1;
    return;
  }

  console.log(`Installing molan into ${editor.label}…`);
  const code = run(editor.name, ["--install-extension", EXT_ID, "--force"]);
  if (code === 0) console.log("Done. Open any .md file to read with molan.");
  else console.log(`Install failed. Search for "墨览" inside ${editor.label}.`);
}

function runCheck() {
  console.log("Running checks…");
  if (run(process.execPath, [path.join(root, "scripts/check-pr.mjs")]) !== 0) return;
  if (run(process.execPath, [path.join(root, "scripts/smoke-site.mjs")]) !== 0) return;
  console.log("Checks passed. Run ./molan to review the site.");
}

const argv = process.argv.slice(2);
const action = normalize(argv);

switch (action) {
  case "help":
    help();
    break;
  case "open":
    await ensureLocalAndOpen("/");
    break;
  case "try":
    await ensureLocalAndOpen("/try/");
    break;
  case "docs":
    await ensureLocalAndOpen("/docs/");
    break;
  case "install":
    installExtension();
    break;
  case "check":
    runCheck();
    break;
  case "e2e":
    run(process.execPath, [path.join(root, "scripts/run-studio-e2e.mjs"), ...argv.slice(1)]);
    break;
  case "build":
    run("pnpm", ["build"]);
    break;
  case "package":
    run("bash", [path.join(root, "scripts/vscode-molan.sh"), "package"]);
    break;
  case "publish":
    run("bash", [path.join(root, "scripts/molan-publish.sh"), "--skip-site"]);
    break;
  case "sync":
    run(process.execPath, [path.join(root, "scripts/sync-studio-to-site.mjs"), ...argv.slice(1)]);
    break;
  case "web":
    openUrl(WEB_HOME);
    console.log(`Opened ${WEB_HOME}`);
    console.log(`Formal: ${WEB_FORMAL}`);
    console.log(`Try:    ${WEB_TRY}`);
    console.log(`Docs:   ${WEB_DOCS}`);
    break;
  default:
    console.log(`Unknown command: ${argv[0] || ""}\n`);
    help();
    process.exitCode = 1;
}
