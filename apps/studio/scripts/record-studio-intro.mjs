#!/usr/bin/env node
/**
 * 录制浏览器工作室介绍 GIF，并导出教程用静帧。
 * 用法：先启动静态服务，再运行：
 *   MOLAN_URL=http://127.0.0.1:5500/ node apps/studio/scripts/record-studio-intro.mjs
 */
import { spawn } from "node:child_process";
import {
  mkdirSync,
  rmSync,
  writeFileSync,
  copyFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { findChromePath, loadPuppeteer, requireChromePath } from "./e2e-chrome.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(root, "..", "..");
const shotsDir = join(root, "shots");
const gifPath = join(root, "studio-intro.gif");
const workDir = join(tmpdir(), "molan-studio-intro");
const chrome = findChromePath() || requireChromePath();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: "inherit" });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited ${code}`));
    });
  });
}

const CURSOR_SVG = `<svg viewBox="0 0 24 24" width="22" height="22" xmlns="http://www.w3.org/2000/svg">
  <path d="M4.2 2.8l15.2 9.1-6.9 1.5 3.7 7.4-2.8 1.4-3.7-7.3-5.5 4.7z" fill="#f4efe6" stroke="#1c1914" stroke-width="1.4" stroke-linejoin="round"/>
</svg>`;

async function main() {
  const puppeteer = loadPuppeteer(repoRoot);
  const url = process.env.MOLAN_URL || "http://127.0.0.1:5500/";
  mkdirSync(workDir, { recursive: true });
  mkdirSync(shotsDir, { recursive: true });
  rmSync(join(workDir, "frames"), { recursive: true, force: true });
  mkdirSync(join(workDir, "frames"), { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: "new",
    defaultViewport: { width: 1440, height: 900, deviceScaleFactor: 1 },
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--hide-scrollbars",
      "--font-render-hinting=medium",
      "--window-size=1440,900",
    ],
  });

  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.evaluateOnNewDocument(() => {
    try {
      localStorage.setItem("molan-lang", "zh");
      localStorage.setItem("molan-theme", "night");
      localStorage.setItem("molan-pick-hint-seen", "1");
    } catch (_) { /* ignore */ }
  });

  console.log("open", url);
  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
  await page.waitForSelector(".file-item", { timeout: 20000 });
  await page.evaluate(() => document.fonts.ready);
  await sleep(800);

  await page.addStyleTag({
    content: `
      #molan-demo-cursor {
        position: fixed; left: 40px; top: 40px; width: 22px; height: 22px;
        pointer-events: none; z-index: 2147483647;
        filter: drop-shadow(0 1px 1.5px rgba(0,0,0,.45));
        transform: translate(-2px, -1px);
      }
      #molan-demo-cursor.is-down { transform: translate(-2px, -1px) scale(.86); }
    `,
  });
  await page.evaluate((svg) => {
    const el = document.createElement("div");
    el.id = "molan-demo-cursor";
    el.innerHTML = svg;
    document.body.appendChild(el);
  }, CURSOR_SVG);

  let cursor = { x: 80, y: 80 };
  let frame = 0;
  const fps = 10;
  const frameMs = 1000 / fps;

  async function setCursor(x, y, down) {
    cursor = { x, y };
    await page.evaluate((pos) => {
      const el = document.getElementById("molan-demo-cursor");
      if (!el) return;
      el.style.left = pos.x + "px";
      el.style.top = pos.y + "px";
      el.classList.toggle("is-down", !!pos.down);
    }, { x, y, down });
  }

  async function grab() {
    const dest = join(workDir, "frames", `f${String(frame).padStart(4, "0")}.png`);
    await page.screenshot({ path: dest, type: "png" });
    frame += 1;
  }

  async function hold(ms) {
    const n = Math.max(1, Math.round(ms / frameMs));
    for (let i = 0; i < n; i++) {
      await grab();
      if (i < n - 1) await sleep(frameMs);
    }
  }

  async function centerOf(sel) {
    return page.$eval(sel, (el) => {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
  }

  async function moveToPoint(x, y, ms = 520) {
    const n = Math.max(4, Math.round(ms / frameMs));
    const x0 = cursor.x;
    const y0 = cursor.y;
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      const e = 1 - (1 - t) * (1 - t);
      await setCursor(x0 + (x - x0) * e, y0 + (y - y0) * e);
      await grab();
      await sleep(frameMs);
    }
  }

  async function moveTo(sel, ms = 520) {
    const target = await centerOf(sel);
    await moveToPoint(target.x, target.y, ms);
  }

  async function clickNow() {
    await setCursor(cursor.x, cursor.y, true);
    await grab();
    await page.mouse.click(cursor.x, cursor.y);
    await sleep(80);
    await setCursor(cursor.x, cursor.y, false);
  }

  async function clickSel(sel) {
    await setCursor(cursor.x, cursor.y, true);
    await grab();
    await page.click(sel);
    await sleep(80);
    await setCursor(cursor.x, cursor.y, false);
  }

  async function typeVisible(text, delay = 90) {
    for (const ch of [...text]) {
      await page.keyboard.type(ch);
      await grab();
      await sleep(Math.max(frameMs, delay));
    }
  }

  async function waitDocReady() {
    await page.waitForFunction(() => {
      const preview = document.querySelector("#molanPreviewBody");
      if (!preview) return false;
      const table = preview.querySelector("table");
      const code = preview.querySelector("pre code, code.language-typescript");
      const r = table?.getBoundingClientRect();
      return !!(code && r && r.width > 40);
    }, { timeout: 20000 });
    await sleep(360);
  }

  async function shot(name) {
    await page.evaluate(() => {
      document.getElementById("molan-demo-cursor")?.style.setProperty("display", "none");
      document.getElementById("toast")?.classList.remove("show");
    });
    const png = join(workDir, `${name}.png`);
    const jpg = join(shotsDir, `${name}.jpg`);
    await page.screenshot({
      path: png,
      type: "png",
    });
    await page.evaluate(() => {
      document.getElementById("molan-demo-cursor")?.style.setProperty("display", "block");
    });
    await run("ffmpeg", [
      "-y", "-i", png,
      "-vf", "scale=1440:-1",
      "-q:v", "2",
      "-update", "1",
      "-frames:v", "1",
      jpg,
    ]);
    console.log("shot", name);
  }

  await page.evaluate(() => {
    const el = document.getElementById("aphorismText");
    if (!el) return;
    el.className = "aphorism is-in";
    el.style.fontFamily = "var(--font-display)";
    el.textContent = "";
    const line = "打开即阅读。要点处，再落一笔。";
    [...line].forEach((ch, i) => {
      const span = document.createElement("span");
      span.className = "ink-ch";
      span.style.setProperty("--i", String(i));
      span.textContent = ch;
      el.appendChild(span);
    });
  });

  await setCursor(1180, 120);
  await hold(900);
  await shot("welcome");

  await moveTo(".file-item", 700);
  await hold(220);
  await clickSel(".file-item");
  await waitDocReady();
  await hold(1100);
  await shot("preview-night");

  await moveTo("#prefsToggle", 640);
  await hold(160);
  await clickSel("#prefsToggle");
  await page.waitForSelector("#prefsMenu.is-open", { timeout: 4000 });
  await hold(500);
  await shot("prefs");

  const themes = [
    ["xuan", "preview-xuan"],
    ["hack", "preview-hack"],
    ["rose", "preview-rose"],
    ["night", "preview-night-return"],
  ];
  for (const [id, name] of themes) {
    const sel = `#themeSwitch [data-theme="${id}"]`;
    await moveTo(sel, 420);
    await hold(120);
    await clickSel(sel);
    await sleep(420);
    await hold(520);
    await shot(name);
  }

  await page.mouse.click(900, 80);
  await sleep(220);
  await hold(220);

  await moveTo("#modeBtn", 520);
  await hold(140);
  await clickSel("#modeBtn");
  await page.waitForSelector(".vditor-ir h1.vditor-ir__node", { timeout: 15000 });
  await sleep(700);
  await hold(500);
  await shot("edit");

  const heading = await page.$eval(".vditor-ir h1.vditor-ir__node", (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + 168, y: r.top + r.height / 2 };
  });
  await moveToPoint(heading.x, heading.y, 480);
  await hold(120);
  await clickNow();
  await page.keyboard.press("End");
  await hold(160);
  await typeVisible("草案", 140);
  await hold(500);
  await shot("edit-title");

  const codeTop = await page.$eval('.vditor-ir [data-type="code-block"]', (el) => {
    const r = el.getBoundingClientRect();
    return { x: r.left + 28, y: r.top + 10 };
  });
  await moveToPoint(codeTop.x, codeTop.y, 480);
  await hold(120);
  await clickNow();
  await page.waitForSelector('.vditor-ir [data-type="code-block"].vditor-ir__node--expand', { timeout: 4000 });
  await hold(360);
  const codeSrc = await page.evaluate(() => {
    const code = document.querySelector('.vditor-ir [data-type="code-block"].vditor-ir__node--expand .vditor-ir__marker--pre code')
      || document.querySelector('.vditor-ir [data-type="code-block"].vditor-ir__node--expand .vditor-ir__marker--pre');
    const r = code.getBoundingClientRect();
    return { x: r.left + 48, y: r.bottom - 12 };
  });
  await moveToPoint(codeSrc.x, codeSrc.y, 280);
  await clickNow();
  await page.keyboard.press("End");
  await hold(120);
  await typeVisible("\nconsole.log(open(doc));", 42);
  await hold(480);
  await shot("edit-code");

  const cell = await page.evaluate(() => {
    const tds = [...document.querySelectorAll(".vditor-ir table td")];
    const el = tds.find((td) => (td.textContent || "").includes("Vue 3"));
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width - 10, y: r.top + r.height / 2 };
  });
  await moveToPoint(cell.x, cell.y, 480);
  await hold(120);
  await clickNow();
  await page.keyboard.press("End");
  await hold(140);
  await typeVisible(", Pinia", 70);
  await hold(520);
  await shot("edit-table");

  await moveTo("#modeBtn", 480);
  await hold(120);
  await clickSel("#modeBtn");
  await page.waitForSelector("#molanPreviewBody h1", { timeout: 8000 });
  await sleep(500);
  await hold(1400);
  await shot("preview-edited");

  await browser.close();
  console.log("frames", frame);

  const palette = join(workDir, "palette.png");
  const framesGlob = join(workDir, "frames", "f%04d.png");
  await run("ffmpeg", [
    "-y",
    "-framerate", String(fps),
    "-i", framesGlob,
    "-vf", "scale=1280:-1:flags=lanczos,palettegen=stats_mode=diff:max_colors=160",
    palette,
  ]);
  await run("ffmpeg", [
    "-y",
    "-framerate", String(fps),
    "-i", framesGlob,
    "-i", palette,
    "-lavfi", "scale=1280:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=sierra2_4a",
    "-loop", "0",
    gifPath,
  ]);
  copyFileSync(join(shotsDir, "preview-night.jpg"), join(root, "studio-screenshot.jpg"));
  writeFileSync(join(workDir, "done.txt"), String(frame));
  console.log("wrote", gifPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
