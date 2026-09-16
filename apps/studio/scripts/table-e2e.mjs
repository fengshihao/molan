#!/usr/bin/env node
/**
 * 表格插入尺寸与增删行列的真实编辑器自测。
 * 用法：在仓库根目录
 *   node apps/studio/scripts/table-e2e.mjs
 */
import { spawn } from "node:child_process";
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import { findChromePath, loadPuppeteer, requireChromePath } from "./e2e-chrome.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..", "..");
const port = Number(process.env.MOLAN_E2E_PORT || 5511);
const chrome = findChromePath() || requireChromePath();

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

function tableShape(md) {
  const lines = String(md || "").split(/\r?\n/).filter((line) => line.includes("|"));
  if (!lines.length) return { rows: 0, cols: 0 };
  const isSep = (line) => /^\s*\|?(?:\s*:?-{1,}:?\s*\|)+\s*$/.test(line);
  const body = lines.filter((line) => !isSep(line));
  const parts = lines[0].trim().split("|");
  if (parts[0] === "") parts.shift();
  if (parts[parts.length - 1] === "") parts.pop();
  return { rows: body.length, cols: parts.length };
}

const harness = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>table e2e</title>
  <link rel="stylesheet" href="./vendor/vditor/dist/index.css" />
  <link rel="stylesheet" href="./molan.css" />
  <style>
    html, body { height: 100%; margin: 0; }
    .editor-wrap { height: 100%; display: flex; flex-direction: column; }
    #vditor { flex: 1; min-height: 0; }
  </style>
</head>
<body>
  <div class="editor-wrap visible">
    <div id="vditor"></div>
  </div>
  <div class="toast" id="toast"></div>
  <script src="./vendor/vditor/dist/method.min.js"></script>
  <script src="./molan-i18n.js"></script>
  <script src="./molan-editor.js"></script>
  <script>
    window.MolanEditor.create({
      elementId: "vditor",
      defaultPreview: false,
      lang: "zh_CN",
      placeholder: "table e2e",
    }).then((api) => {
      window.__molan = api;
      return api.setValue(["# 表格自测", "", "点这里插入表格。", ""].join("\\n"), true);
    }).then(async () => {
      for (let i = 0; i < 120; i++) {
        if (document.querySelector(".vditor-toolbar [data-type='table']")) break;
        await new Promise((r) => setTimeout(r, 100));
      }
      document.documentElement.dataset.ready = "1";
    }).catch((err) => {
      document.documentElement.dataset.ready = "error";
      document.documentElement.dataset.error = String(err && err.message || err);
    });
  </script>
</body>
</html>
`;

async function main() {
  if (!existsSync(join(root, "vendor/vditor/dist/index.min.js"))) {
    throw new Error("缺少 vendor/vditor，请先运行 apps/vscode-molan/scripts/sync-media.mjs");
  }

  const harnessPath = join(root, ".table-e2e.html");
  writeFileSync(harnessPath, harness);

  const server = spawn(process.execPath, [join(root, "serve.mjs")], {
    env: { ...process.env, MOLAN_ROOT: root, MOLAN_SERVE_PORT: String(port) },
    stdio: "inherit",
  });
  const stop = () => {
    try { server.kill("SIGTERM"); } catch { /* ignore */ }
    try { unlinkSync(harnessPath); } catch { /* ignore */ }
  };
  process.on("exit", stop);
  process.on("SIGINT", () => { stop(); process.exit(1); });

  await waitForServer(`http://127.0.0.1:${port}/.table-e2e.html`);

  const puppeteer = loadPuppeteer(repoRoot);
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: "new",
    defaultViewport: { width: 1280, height: 800 },
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();
  const failures = [];
  const shotDir = join(root, ".table-e2e-shots");
  mkdirSync(shotDir, { recursive: true });

  async function shot(name) {
    await page.screenshot({ path: join(shotDir, `${name}.png`), type: "png" });
  }

  function assert(cond, message) {
    if (!cond) failures.push(message);
    console.log(cond ? `ok  ${message}` : `FAIL ${message}`);
  }

  try {
    await page.goto(`http://127.0.0.1:${port}/.table-e2e.html`, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });
    await page.waitForFunction(() => document.documentElement.dataset.ready === "1", { timeout: 30000 });
    await page.waitForSelector(".vditor-toolbar [data-type='table']", { timeout: 20000 });
    await sleep(400);

    const tablesBefore = await page.evaluate(() => document.querySelectorAll(".vditor-ir table").length);
    assert(tablesBefore === 0, "打开编辑器时还没有表格");

    await page.evaluate(() => {
      const btn = document.querySelector(".vditor-toolbar [data-type='table']");
      if (!btn) throw new Error("table toolbar button missing");
      btn.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
      btn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    });
    await page.waitForSelector("#molanTablePicker:not([hidden])", { timeout: 5000 });
    await shot("01-picker");
    const tablesAfterClick = await page.evaluate(() => document.querySelectorAll(".vditor-ir table").length);
    assert(tablesAfterClick === 0, "点表格按钮只弹出尺寸网格，不立刻插入 3×3");
    const hasCol1 = await page.evaluate(() => (window.__molan.getValue() || "").includes("col1"));
    assert(!hasCol1, "未插入 Vditor 默认 col1 表头");

    await page.click('#molanTablePicker [data-col="4"][data-row="2"]');
    await page.waitForFunction(() => document.querySelectorAll(".vditor-ir table").length === 1, { timeout: 8000 });
    await sleep(300);
    await shot("02-inserted-2x4");

    const inserted = await page.evaluate(() => {
      const table = document.querySelector(".vditor-ir table");
      return {
        rows: table?.rows.length || 0,
        cols: table?.rows[0]?.cells.length || 0,
        md: window.__molan.getValue(),
      };
    });
    assert(inserted.rows === 2 && inserted.cols === 4, `插入 4 列 × 2 行，实际 ${inserted.cols}×${inserted.rows}`);
    const shape = tableShape(inserted.md);
    assert(shape.rows === 2 && shape.cols === 4, `Markdown 为 4 列 × 2 行，实际 ${shape.cols}×${shape.rows}`);

    await page.click(".vditor-ir table td, .vditor-ir table th");
    await page.waitForSelector("#molanTableToolbar:not([hidden])", { timeout: 5000 });
    await shot("03-toolbar");

    await page.click('#molanTableToolbar [data-molan-table="insertRowBelow"]');
    await sleep(250);
    const afterRow = await page.evaluate(() => {
      const table = document.querySelector(".vditor-ir table");
      return { rows: table?.rows.length || 0, cols: table?.rows[0]?.cells.length || 0, md: window.__molan.getValue() };
    });
    assert(afterRow.rows === 3 && afterRow.cols === 4, `下方插行后应为 4×3，实际 ${afterRow.cols}×${afterRow.rows}`);
    assert(tableShape(afterRow.md).rows === 3, "getValue 含新增行");

    await page.click(".vditor-ir table td");
    await page.waitForSelector("#molanTableToolbar:not([hidden])", { timeout: 5000 });
    await page.click('#molanTableToolbar [data-molan-table="insertColRight"]');
    await sleep(250);
    const afterCol = await page.evaluate(() => {
      const table = document.querySelector(".vditor-ir table");
      return { rows: table?.rows.length || 0, cols: table?.rows[0]?.cells.length || 0, md: window.__molan.getValue() };
    });
    assert(afterCol.rows === 3 && afterCol.cols === 5, `右侧插列后应为 5×3，实际 ${afterCol.cols}×${afterCol.rows}`);
    assert(tableShape(afterCol.md).cols === 5, "getValue 含新增列");

    await page.click(".vditor-ir table tbody td, .vditor-ir table td");
    await page.waitForSelector("#molanTableToolbar:not([hidden])", { timeout: 5000 });
    await page.click('#molanTableToolbar [data-molan-table="deleteRow"]');
    await sleep(250);
    const afterDelRow = await page.evaluate(() => {
      const table = document.querySelector(".vditor-ir table");
      return { rows: table?.rows.length || 0, cols: table?.rows[0]?.cells.length || 0, md: window.__molan.getValue() };
    });
    assert(afterDelRow.rows === 2 && afterDelRow.cols === 5, `删行后应为 5×2，实际 ${afterDelRow.cols}×${afterDelRow.rows}`);
    assert(tableShape(afterDelRow.md).rows === 2, "getValue 已去掉一行");

    await page.click(".vditor-ir table td, .vditor-ir table th");
    await page.waitForSelector("#molanTableToolbar:not([hidden])", { timeout: 5000 });
    await page.click('#molanTableToolbar [data-molan-table="deleteColumn"]');
    await sleep(250);
    const afterDelCol = await page.evaluate(() => {
      const table = document.querySelector(".vditor-ir table");
      return { rows: table?.rows.length || 0, cols: table?.rows[0]?.cells.length || 0, md: window.__molan.getValue() };
    });
    assert(afterDelCol.rows === 2 && afterDelCol.cols === 4, `删列后应为 4×2，实际 ${afterDelCol.cols}×${afterDelCol.rows}`);
    assert(tableShape(afterDelCol.md).cols === 4, "getValue 已去掉一列");
    await shot("04-after-edits");

    await page.click(".vditor-ir table tbody td, .vditor-ir table td");
    await page.waitForSelector("#molanTableToolbar:not([hidden])", { timeout: 5000 });
    await page.click('#molanTableToolbar [data-molan-table="insertRowAbove"]');
    await sleep(250);
    const afterRowAbove = await page.evaluate(() => {
      const table = document.querySelector(".vditor-ir table");
      return { rows: table?.rows.length || 0, cols: table?.rows[0]?.cells.length || 0, md: window.__molan.getValue() };
    });
    assert(afterRowAbove.rows === 3 && afterRowAbove.cols === 4, `上方插行后应为 4×3，实际 ${afterRowAbove.cols}×${afterRowAbove.rows}`);
    assert(tableShape(afterRowAbove.md).rows === 3, "getValue 含上方新增行");

    await page.click(".vditor-ir table td, .vditor-ir table th");
    await page.waitForSelector("#molanTableToolbar:not([hidden])", { timeout: 5000 });
    await page.click('#molanTableToolbar [data-molan-table="insertColLeft"]');
    await sleep(250);
    const afterColLeft = await page.evaluate(() => {
      const table = document.querySelector(".vditor-ir table");
      return { rows: table?.rows.length || 0, cols: table?.rows[0]?.cells.length || 0, md: window.__molan.getValue() };
    });
    assert(afterColLeft.rows === 3 && afterColLeft.cols === 5, `左侧插列后应为 5×3，实际 ${afterColLeft.cols}×${afterColLeft.rows}`);
    assert(tableShape(afterColLeft.md).cols === 5, "getValue 含左侧新增列");

    await page.click(".vditor-ir table th");
    await page.waitForSelector("#molanTableToolbar:not([hidden])", { timeout: 5000 });
    const headerDeleteDisabled = await page.evaluate(() => {
      const btn = document.querySelector('#molanTableToolbar [data-molan-table="deleteRow"]');
      return !!(btn && (btn.disabled || btn.classList.contains("is-disabled")));
    });
    assert(headerDeleteDisabled, "表头行禁用删除");
  } catch (err) {
    await shot("error").catch(() => {});
    failures.push(err.stack || String(err));
  } finally {
    await browser.close();
    stop();
  }

  if (failures.length) {
    console.error("\n表格自测失败:\n" + failures.map((f) => `- ${f}`).join("\n"));
    process.exit(1);
  }
  console.log("\n表格自测通过");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
