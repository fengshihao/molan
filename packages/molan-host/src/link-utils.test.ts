import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isExternalHttp,
  isMarkdownHref,
  relativeToLinkBase,
  stripMarkdownExtension,
} from "./link-utils.js";

test("stripMarkdownExtension 去掉常见后缀", () => {
  assert.equal(stripMarkdownExtension("readme.md"), "readme");
  assert.equal(stripMarkdownExtension("note.MDX"), "note");
});

test("isMarkdownHref 识别 md 链接", () => {
  assert.equal(isMarkdownHref("docs/a.md"), true);
  assert.equal(isMarkdownHref("docs/a.md#sec"), true);
  assert.equal(isMarkdownHref("https://x.com/a.png"), false);
});

test("relativeToLinkBase 计算相对路径", () => {
  const base = "https://example.com/proj/docs/";
  assert.equal(relativeToLinkBase("sub/a.md", base), "sub/a.md");
  assert.equal(relativeToLinkBase("../other.md", base), "../other.md");
});

test("isExternalHttp 区分站内外", () => {
  const base = "https://example.com/proj/";
  assert.equal(isExternalHttp("https://example.com/proj/a.md", base), false);
  assert.equal(isExternalHttp("https://other.com/a.md", base), true);
  assert.equal(isExternalHttp("mailto:a@b.c", base), false);
});
