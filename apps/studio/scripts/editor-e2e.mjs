#!/usr/bin/env node
/**
 * 编辑器核心路径回归：预览/编辑切换、查找、主题。
 * 用法（仓库根目录）：
 *   ./molan e2e
 *   node apps/studio/scripts/editor-e2e.mjs
 */
import { spawn } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";
import { ensureBrowser } from "./e2e-chrome.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..", "..");
const port = Number(process.env.MOLAN_E2E_PORT || 5512);

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

const harness = `<!DOCTYPE html>
<html lang="zh-CN" data-theme="night">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>editor e2e</title>
  <link rel="stylesheet" href="./vendor/vditor/dist/index.css" />
  <link rel="stylesheet" href="./molan.css" />
  <style>
    html, body { height: 100%; margin: 0; }
    .editor-wrap { height: 100%; display: flex; flex-direction: column; }
    #vditor { flex: 1; min-height: 0; }
  </style>
</head>
<body>
  <header class="reader-header">
    <div class="reader-actions">
      <button class="icon-btn molan-find-btn" id="molanFindBtn" type="button" title="查找" aria-label="查找"></button>
      <button class="icon-btn is-preview" id="modeBtn" type="button" title="编辑" aria-label="编辑"></button>
      <div class="header-prefs" id="headerPrefs">
        <button class="icon-btn" id="headerPrefsBtn" type="button" title="界面配置" aria-label="界面配置"></button>
        <div class="theme-menu" id="headerPrefsMenu" hidden role="dialog" aria-label="界面配置">
          <div class="theme-switch" id="themeSwitch" role="radiogroup" aria-label="界面样式">
            <button type="button" role="radio" data-theme="xuan" aria-label="宣纸"></button>
            <button type="button" role="radio" data-theme="night" aria-label="墨夜" aria-checked="true"></button>
            <button type="button" role="radio" data-theme="hack" aria-label="终端"></button>
            <button type="button" role="radio" data-theme="rose" aria-label="胭脂"></button>
          </div>
        </div>
      </div>
    </div>
  </header>
  <div class="editor-wrap visible" id="editorWrap">
    <div id="vditor"></div>
  </div>
  <div class="toast" id="toast"></div>
  <script src="./vendor/vditor/dist/method.min.js"></script>
  <script src="./molan-i18n.js"></script>
  <script src="./molan-editor.js"></script>
  <script>
    window.MolanEditor.create({
      elementId: "vditor",
      defaultPreview: true,
      lang: "zh_CN",
      placeholder: "editor e2e",
    }).then((api) => {
      window.__molan = api;
      return api.setValue("# 墨览回归\\n\\n查找目标：alpha beta gamma\\n\\n第二段文字。", true);
    }).then(() => {
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
  const { puppeteer, executablePath: chrome } = ensureBrowser(repoRoot);

  const harnessPath = join(root, ".editor-e2e.html");
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

  await waitForServer(`http://127.0.0.1:${port}/.editor-e2e.html`);

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
    await page.goto(`http://127.0.0.1:${port}/.editor-e2e.html`, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });
    await page.waitForFunction(() => document.documentElement.dataset.ready === "1", { timeout: 30000 });
    await sleep(400);

    const previewFirst = await page.evaluate(() => window.__molan.isPreview());
    assert(previewFirst === true, "默认处于预览模式");

    await page.evaluate(async () => {
      await window.__molan.setValue(
        "# 流程图\n\n```mermaid\nflowchart TD\n  A[开始] --> B{是否继续?}\n  B -->|是| C[完成]\n  B -->|否| D[结束]\n```\n",
        true,
      );
    });
    await page.waitForSelector(".language-mermaid svg", { timeout: 25000 });
    await sleep(400);
    const copyResult = await page.evaluate(async () => {
      const svg = document.querySelector(".language-mermaid svg");
      if (!svg) return { ok: false, error: "no svg" };
      const foCount = svg.querySelectorAll("foreignObject").length;
      try {
        const blob = await window.MolanEditor.svgToPngBlob(svg);
        return {
          ok: true,
          foCount,
          type: blob.type,
          size: blob.size,
          stillFo: svg.querySelectorAll("foreignObject").length,
        };
      } catch (err) {
        return {
          ok: false,
          foCount,
          error: String(err && err.message || err),
          name: err && err.name,
        };
      }
    });
    assert(copyResult.foCount > 0, `预览流程图应使用 HTML 标签（foreignObject），实际 ${copyResult.foCount}`);
    assert(copyResult.ok, `复制流程图不应污染 canvas，实际 ${copyResult.name || ""} ${copyResult.error || ""}`);
    assert(copyResult.type === "image/png", `导出应为 PNG，实际 ${copyResult.type}`);
    assert(copyResult.size > 100, `PNG 不应为空，实际 ${copyResult.size} bytes`);
    assert(copyResult.stillFo === copyResult.foCount, "导出不得改动页面上的流程图 SVG");

    // 本 harness 不加载 molan-app.js，预览/编辑切换走编辑器 API。
    await page.evaluate(async () => {
      await window.__molan.setValue("# 墨览回归\n\n查找目标：alpha beta gamma\n\n第二段文字。", true);
      await window.__molan.setPreview(false);
    });
    await page.waitForFunction(() => window.__molan && !window.__molan.isPreview(), { timeout: 20000 });
    await sleep(500);
    assert(await page.evaluate(() => !window.__molan.isPreview()), "setPreview(false) 进入编辑模式");

    await page.evaluate(() => {
      const api = window.__molan;
      const cur = api.getValue();
      api.setValue(cur + "\\n\\n追加一行。", false);
    });
    await sleep(300);
    const hasAppended = await page.evaluate(() => (window.__molan.getValue() || "").includes("追加一行"));
    assert(hasAppended, "编辑模式下 setValue 生效");

    await page.evaluate(async () => {
      await window.__molan.setPreview(true);
    });
    await page.waitForFunction(() => window.__molan && window.__molan.isPreview(), { timeout: 15000 });
    assert(await page.evaluate(() => window.__molan.isPreview()), "setPreview(true) 回到预览模式");

    await page.keyboard.down("Meta");
    await page.keyboard.press("f");
    await page.keyboard.up("Meta");
    await page.waitForSelector("#molanFindBar:not([hidden])", { timeout: 5000 });
    await page.type("#molanFindInput", "alpha");
    await sleep(350);
    const findCount = await page.evaluate(() => document.getElementById("molanFindCount")?.textContent || "");
    assert(/1\/1/.test(findCount), `查找 alpha 应命中 1 处，实际「${findCount}」`);

    await page.click("#molanFindClose");
    await page.waitForFunction(() => {
      const bar = document.getElementById("molanFindBar");
      return !bar || bar.hidden;
    }, { timeout: 3000 });
    const findHidden = await page.evaluate(() => {
      const bar = document.getElementById("molanFindBar");
      return !bar || bar.hidden;
    });
    assert(findHidden, "关闭查找栏");

    await page.click("#headerPrefsBtn");
    await page.waitForSelector("#headerPrefsMenu:not([hidden])", { timeout: 3000 });
    await page.click('#themeSwitch [data-theme="hack"]');
    await sleep(250);
    const theme = await page.evaluate(() => document.documentElement.getAttribute("data-theme"));
    assert(theme === "hack", `切换终端主题，实际 data-theme=${theme}`);

    await page.evaluate(async () => {
      await window.__molan.setValue(
        "# 时序\n\n```mermaid\nsequenceDiagram\n  participant U as 用户\n  participant S as 服务\n  U->>S: 请求\n  alt 失败\n    S-->>U: 错误\n  else 成功\n    S-->>U: 完成\n  end\n```\n",
        true,
      );
    });
    await page.waitForSelector(".language-mermaid svg", { timeout: 25000 });
    await sleep(700);
    const themeCopy = await page.evaluate(async () => {
      const svg = document.querySelector(".language-mermaid svg");
      if (!svg) return { ok: false, error: "no svg" };
      const sample = svg.querySelector("rect.actor, .actor-line, line, rect");
      let liveStroke = "";
      let liveFill = "";
      try {
        if (sample) {
          const cs = getComputedStyle(sample);
          liveStroke = cs.stroke || "";
          liveFill = cs.fill || "";
        }
      } catch (_) { /* ignore */ }
      const blob = await window.MolanEditor.svgToPngBlob(svg);
      const bitmap = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(bitmap, 0, 0);
      const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const parseRgb = (value) => {
        const m = String(value).match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
        return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
      };
      const near = (pixel, target, tol) => (
        Math.abs(pixel[0] - target[0]) <= tol
        && Math.abs(pixel[1] - target[1]) <= tol
        && Math.abs(pixel[2] - target[2]) <= tol
      );
      let greenish = 0;
      let mermaidBlue = 0;
      let white = 0;
      let matchedLive = 0;
      const liveColors = [parseRgb(liveStroke), parseRgb(liveFill)].filter(Boolean);
      const mermaidDarkBlue = [129, 177, 219];
      for (let i = 0; i < data.length; i += 16) {
        const px = [data[i], data[i + 1], data[i + 2]];
        const a = data[i + 3];
        if (a < 128) continue;
        if (px[1] > px[0] + 18 && px[1] > px[2] + 8 && px[1] > 70) greenish += 1;
        if (near(px, mermaidDarkBlue, 22) && px[2] > px[0] + 30) mermaidBlue += 1;
        if (px[0] > 240 && px[1] > 240 && px[2] > 240) white += 1;
        if (liveColors.some((c) => near(px, c, 28))) matchedLive += 1;
      }
      return {
        ok: true,
        size: blob.size,
        liveStroke,
        liveFill,
        greenish,
        mermaidBlue,
        white,
        matchedLive,
        samples: data.length / 16,
      };
    });
    assert(themeCopy.ok, `终端主题时序图应能导出 PNG，实际 ${themeCopy.error || ""}`);
    assert(themeCopy.size > 100, `终端主题 PNG 不应为空，实际 ${themeCopy.size} bytes`);
    assert(
      themeCopy.greenish > themeCopy.mermaidBlue,
      `复制图应保留终端绿而不是 Mermaid 默认蓝，greenish=${themeCopy.greenish} mermaidBlue=${themeCopy.mermaidBlue} stroke=${themeCopy.liveStroke}`,
    );
    assert(
      themeCopy.matchedLive > 8 || themeCopy.greenish > 8,
      `复制图应出现页面上的主题色，matchedLive=${themeCopy.matchedLive} greenish=${themeCopy.greenish} white=${themeCopy.white}`,
    );
  } catch (err) {
    failures.push(err.stack || String(err));
  } finally {
    await browser.close();
    stop();
  }

  if (failures.length) {
    console.error("\n编辑器回归失败:\n" + failures.map((f) => `- ${f}`).join("\n"));
    process.exit(1);
  }
  console.log("\n编辑器回归通过");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
