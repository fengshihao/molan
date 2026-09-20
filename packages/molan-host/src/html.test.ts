import assert from "node:assert/strict";
import { test } from "node:test";
import { renderHostHtml } from "./html.js";

const assets = {
  molanCss: "./molan.css",
  vditorCss: "./vditor/dist/index.css",
  vditorMethodJs: "./vditor/dist/method.min.js",
  vditorLuteJs: "./vditor/dist/js/lute/lute.min.js",
  vditorIconsJs: "./vditor/dist/js/icons/ant.js",
  editorJs: "./molan-editor.js",
  bridgeJs: "./web-bridge.js",
  vditorCdn: "https://cdn/vditor",
  linkBase: "",
  googleFontsHref: "https://fonts.googleapis.com/css2?family=DM+Sans",
};

test("renderHostHtml iframe 含 eyebrow 与 fonts", () => {
  const html = renderHostHtml({ variant: "iframe", assets });
  assert.match(html, /readerEyebrow/);
  assert.match(html, /googleapis/);
  assert.match(html, /web-bridge\.js/);
  assert.match(html, /lightbox/);
  assert.match(html, /id="lightboxEdit"/);
  assert.match(html, /id="pdfBtn"/);
  assert.match(html, /id="exportMenu"/);
  assert.match(html, /data-export="png"/);
  assert.doesNotMatch(html, /type-prefs/);
});

test("renderHostHtml vscode 含 type-prefs 与 nonce", () => {
  const html = renderHostHtml({
    variant: "vscode",
    assets: { ...assets, bridgeJs: "./vscode-bridge.js" },
    nonce: "abc123",
    csp: "script-src 'nonce-abc123'",
    feedback: { extensionVersion: "0.1.28", editorVersion: "1.96.0" },
  });
  assert.match(html, /type-prefs/);
  assert.match(html, /nonce="abc123"/);
  assert.match(html, /vscode-bridge\.js/);
  assert.match(html, /id="feedbackBtn"/);
  assert.match(html, /id="molanFeedback"/);
  assert.match(html, /__MOLAN_FEEDBACK__/);
  assert.match(html, /0\.1\.28/);
  assert.doesNotMatch(html, /readerEyebrow/);
});

test("renderHostHtml iframe 不含反馈面板", () => {
  const html = renderHostHtml({ variant: "iframe", assets });
  assert.doesNotMatch(html, /id="feedbackBtn"/);
  assert.doesNotMatch(html, /id="molanFeedback"/);
  assert.doesNotMatch(html, /__MOLAN_FEEDBACK__/);
});
