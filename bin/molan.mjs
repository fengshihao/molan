#!/usr/bin/env node
/**
 * 墨览命令行：给普通人用的一键入口，少讲技术细节。
 *
 *   ./molan           打开本机墨览网页
 *   ./molan 试读      打开试读
 *   ./molan 安装      安装编辑器扩展
 *   ./molan 网上      打开网上主页
 *   ./molan 帮助
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
const EXT_ID = "fengshihao.molan-markdown";
const WEB_HOME = "https://fengshihao.github.io/molan/";
const WEB_TRY = "https://fengshihao.github.io/molan/try/";
const WEB_FORMAL = "https://molan.guoyoutech.cn/";

function help() {
  console.log(`墨览 · molan

用法：
  molan              在本机打开墨览网页
  molan 试读         打开试读工作室
  molan 安装         安装 Cursor / VS Code 扩展
  molan 检查         验收改动是否合格（给 AI / 贡献者）
  molan 网上         打开网上的墨览主页
  molan 帮助         显示这段说明

也可以写英文：open / try / install / check / web / help
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
  const raw = (argv[0] || "").trim();
  if (!raw || raw === "打开" || raw === "open" || raw === "start") return "open";
  if (raw === "试读" || raw === "try" || raw === "studio") return "try";
  if (raw === "安装" || raw === "install" || raw === "扩展") return "install";
  if (
    raw === "检查" ||
    raw === "check" ||
    raw === "验收" ||
    raw === "测试"
  ) {
    return "check";
  }
  if (raw === "网上" || raw === "web" || raw === "online" || raw === "site") {
    return "web";
  }
  if (raw === "帮助" || raw === "help" || raw === "-h" || raw === "--help") {
    return "help";
  }
  return "unknown";
}

async function ensureLocalAndOpen(pathname = "/") {
  const port = defaultPort;
  const base = `http://127.0.0.1:${port}`;
  const target = `${base}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;

  const already = await isPortOpen(port);
  if (!already) {
    await startSiteServer({ port });
    console.log("墨览已在本机就绪。");
  } else {
    console.log("墨览已在运行。");
  }

  openUrl(target);
  console.log(`已为你打开：${target}`);
  if (!already) {
    console.log("关掉这个窗口（或按 Ctrl+C）就会停止本机预览。");
    // Keep process alive so the server stays up
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
    console.log(`没有找到 Cursor 或 VS Code 命令行。

也可以手动安装：
  1. 打开 Cursor / VS Code
  2. 扩展市场搜索「墨览」或 ${EXT_ID}
  3. 点安装

网上商店：
  https://open-vsx.org/extension/fengshihao/molan-markdown
  https://marketplace.visualstudio.com/items?itemName=${EXT_ID}
`);
    process.exitCode = 1;
    return;
  }

  console.log(`正在向 ${editor.label} 安装墨览扩展…`);
  const result = spawnSync(
    editor.name,
    ["--install-extension", EXT_ID, "--force"],
    { stdio: "inherit" }
  );
  if (result.status === 0) {
    console.log("安装完成。打开任意 .md 文件即可用墨览阅读。");
  } else {
    console.log(`自动安装未成功。请在 ${editor.label} 里搜索「墨览」手动安装。`);
    process.exitCode = result.status || 1;
  }
}

function runCheck() {
  const root = path.resolve(__dirname, "..");
  console.log("正在验收…");
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
    console.log("验收通过。可以再用 ./molan 打开网页，肉眼看一下效果。");
  } else {
    process.exitCode = smoke.status || 1;
  }
}

const action = normalize(process.argv.slice(2));

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
  case "install":
    installExtension();
    break;
  case "check":
    runCheck();
    break;
  case "web":
    openUrl(WEB_HOME);
    console.log(`已打开网上主页：${WEB_HOME}`);
    console.log(`正式域名：${WEB_FORMAL}`);
    console.log(`试读：${WEB_TRY}`);
    break;
  default:
    console.log(`不认识这个用法。\n`);
    help();
    process.exitCode = 1;
}
