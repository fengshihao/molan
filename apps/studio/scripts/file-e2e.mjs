#!/usr/bin/env node
/**
 * 浏览器工作室：新建文档（无文件夹时先起草）。
 * 用法（仓库根目录）：
 *   ./molan e2e
 *   node apps/studio/scripts/file-e2e.mjs
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import { ensureBrowser } from "./e2e-chrome.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..", "..");
const port = Number(process.env.MOLAN_E2E_PORT || 5514);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const ping = () => {
      http.get(url, (res) => {
        res.resume();
        resolve();
      }).on("error", () => {
        if (Date.now() - start > timeoutMs) reject(new Error(`服务未就绪: ${url}`));
        else setTimeout(ping, 150);
      });
    };
    ping();
  });
}

async function main() {
  const { puppeteer, executablePath: chrome } = ensureBrowser(repoRoot);

  const server = spawn(process.execPath, [join(root, "serve.mjs")], {
    env: { ...process.env, MOLAN_ROOT: root, MOLAN_SERVE_PORT: String(port) },
    stdio: "inherit",
  });
  const stop = () => {
    try { server.kill("SIGTERM"); } catch { /* ignore */ }
  };
  process.on("exit", stop);
  process.on("SIGINT", () => { stop(); process.exit(1); });

  await waitForServer(`http://127.0.0.1:${port}/index.html`);

  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: "new",
    defaultViewport: { width: 1280, height: 800 },
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();
  const failures = [];

  function assert(cond, message) {
    if (!cond) failures.push(message);
    console.log(cond ? `ok  ${message}` : `FAIL ${message}`);
  }

  try {
    await page.evaluateOnNewDocument(() => {
      window.showSaveFilePicker = null;
    });
    await page.goto(`http://127.0.0.1:${port}/index.html?debug=1`, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });
    await page.waitForSelector("#newFileBtn", { timeout: 15000 });
    await sleep(400);

    assert(await page.$("#newFileBtn") !== null, "侧栏有新建按钮");

    await page.click("#newFileBtn");
    await page.waitForSelector("#molanNewFileDialog input", { timeout: 8000 });
    const name = await page.$eval("#molanNewFileDialog input", (el) => el.value);
    assert(/\.(md|markdown)$/i.test(name), `对话框预填 Markdown 文件名，实际「${name}」`);

    await page.click("#molanNewFileDialog button[type=submit]");
    await page.waitForFunction(() => !document.getElementById("molanNewFileDialog"), { timeout: 8000 });
    await page.waitForFunction((n) => {
      return [...document.querySelectorAll(".file-item .file-name")]
        .some((el) => (el.textContent || "").includes(n));
    }, { timeout: 20000 }, name);

    const listed = await page.evaluate((n) => (
      [...document.querySelectorAll(".file-item .file-name")]
        .some((el) => (el.textContent || "").includes(n))
    ), name);
    assert(listed, `侧栏出现新建文档 ${name}`);

    await page.waitForFunction(() => {
      const title = document.getElementById("readerTitle")?.textContent || "";
      return title && title !== "墨览";
    }, { timeout: 20000 });

    const title = await page.evaluate(() => document.getElementById("readerTitle")?.textContent || "");
    const stem = name.replace(/\.(md|markdown|mdx|mdown)$/i, "");
    assert(title.includes(stem), `顶栏标题为新建文档，实际「${title}」`);

    await page.waitForFunction((stemText) => {
      const preview = document.querySelector(".molan-preview")?.textContent || "";
      const ir = document.querySelector("#vditor")?.textContent || "";
      return preview.includes(stemText) || ir.includes(stemText);
    }, { timeout: 20000 }, stem);
    assert(true, "编辑器已打开新建文档");
  } catch (err) {
    failures.push(err.stack || String(err));
    try {
      await page.screenshot({ path: "/tmp/molan-file-e2e.png", fullPage: true });
      console.error("失败截图 /tmp/molan-file-e2e.png");
    } catch { /* ignore */ }
  } finally {
    await browser.close();
    stop();
  }

  if (failures.length) {
    console.error("\n新建文档回归失败:\n" + failures.map((f) => `- ${f}`).join("\n"));
    process.exit(1);
  }
  console.log("\n新建文档回归通过");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
