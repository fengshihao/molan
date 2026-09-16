#!/usr/bin/env node
/**
 * Molan CLI — simple English commands.
 *
 *   ./molan              open local site
 *   ./molan try          open try studio
 *   ./molan docs         open contribute guide
 *   ./molan install      install editor extension
 *   ./molan check        run acceptance checks
 *   ./molan web          open online homepage
 *   ./molan sync         refresh try assets from DesignWeave
 *   ./molan help
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
  molan install      Install Cursor / VS Code extension
  molan check        Run acceptance checks (for AI / contributors)
  molan web          Open online homepage
  molan sync         Sync try assets from DesignWeave (optional --dw path)
  molan help         Show this help
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
  const result = spawnSync(
    editor.name,
    ["--install-extension", EXT_ID, "--force"],
    { stdio: "inherit" }
  );
  if (result.status === 0) {
    console.log("Done. Open any .md file to read with molan.");
  } else {
    console.log(`Install failed. Search for "墨览" inside ${editor.label}.`);
    process.exitCode = result.status || 1;
  }
}

function runCheck() {
  console.log("Running checks…");
  const result = spawnSync(
    process.execPath,
    [path.join(root, "scripts/check-pr.mjs")],
    { stdio: "inherit", cwd: root }
  );
  if (result.status !== 0) {
    process.exitCode = result.status || 1;
    return;
  }
  const smoke = spawnSync(
    process.execPath,
    [path.join(root, "scripts/smoke-site.mjs")],
    { stdio: "inherit", cwd: root }
  );
  if (smoke.status === 0) {
    console.log("Checks passed. Run ./molan to review the site.");
  } else {
    process.exitCode = smoke.status || 1;
  }
}

function runSync(argv) {
  const args = [path.join(root, "scripts/sync-from-designweave.mjs"), ...argv];
  const result = spawnSync(process.execPath, args, {
    stdio: "inherit",
    cwd: root,
  });
  process.exitCode = result.status || 0;
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
  case "sync":
    runSync(argv.slice(1));
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
