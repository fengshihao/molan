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
  });
  assert.match(html, /type-prefs/);
  assert.match(html, /nonce="abc123"/);
  assert.match(html, /vscode-bridge\.js/);
  assert.doesNotMatch(html, /readerEyebrow/);
});
