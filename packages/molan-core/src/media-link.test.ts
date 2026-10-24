import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import vm from "node:vm";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const mediaSrc = readFileSync(join(root, "src", "editor", "media.js"), "utf8");
const sandbox: { api?: { mediaLinkKind: (url: string) => string } } = {};
vm.runInNewContext(
  `${mediaSrc}\nthis.api = { mediaLinkKind };`,
  sandbox,
);
const mediaLinkKind = sandbox.api!.mediaLinkKind;

test("只有真正的音视频扩展名才渲染播放器", () => {
  assert.equal(mediaLinkKind("pdf-to-mp3"), "");
  assert.equal(mediaLinkKind("https://github.com/example/pdf-to-mp3"), "");
  assert.equal(mediaLinkKind("https://github.com/example/pdf-to-mp3/"), "");
  assert.equal(mediaLinkKind("foomp3"), "");
  assert.equal(mediaLinkKind("pdf-to-webm"), "");
  assert.equal(mediaLinkKind("https://example.com/pdf-to-mp4"), "");
  assert.equal(mediaLinkKind("readme.md"), "");
  assert.equal(mediaLinkKind("javascript:alert(1).mp3"), "");

  assert.equal(mediaLinkKind("voice.mp3"), "audio");
  assert.equal(mediaLinkKind("./talks/voice.mp3"), "audio");
  assert.equal(mediaLinkKind("https://cdn.example/a/Song.MP3"), "audio");
  assert.equal(mediaLinkKind("voice.mp3?download=1"), "audio");
  assert.equal(mediaLinkKind("voice.wav#t=3"), "audio");
  assert.equal(mediaLinkKind("note.flac"), "audio");

  assert.equal(mediaLinkKind("clip.mp4"), "video");
  assert.equal(mediaLinkKind("./clip.webm"), "video");
  assert.equal(mediaLinkKind("movie.ogg"), "video");
});

test("阅读预览不用 Vditor 的宽松媒体规则", () => {
  const create = readFileSync(join(root, "src", "editor", "create.js"), "utf8");
  assert.match(create, /render:\s*\{\s*media:\s*\{\s*enable:\s*false\s*\}\s*\}/);
  assert.match(create, /restoreFalseMedia\(previewBody\)/);
  assert.match(create, /renderLinkMedia\(previewBody\)/);
});
