import assert from "node:assert/strict";
import { test } from "node:test";
import {
  filesystemPathFromWebviewHref,
  isExternalHttp,
  isLocalResourceHref,
  isMarkdownHref,
  localLinkToOpen,
  parseLineFragment,
  relativeToLinkBase,
  splitLocalLink,
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

test("本地文件链接不会被当成外链", () => {
  const base = "https://file+.vscode-resource.vscode-cdn.net/Users/username/proj/";
  const absolute =
    "https://file+.vscode-resource.vscode-cdn.net/Users/username/proj/a/b/c.go#L516";
  assert.equal(relativeToLinkBase("a/b/c.go#L516", base), "a/b/c.go#L516");
  assert.equal(relativeToLinkBase(absolute, base), "a/b/c.go#L516");
  assert.equal(isLocalResourceHref("a/b/c.go#L516"), true);
  assert.equal(isLocalResourceHref(absolute, "a/b/c.go#L516"), true);
  assert.equal(isLocalResourceHref("file:///Users/username/a/b/c.go"), true);
  assert.equal(isLocalResourceHref("C:/src/main.go"), true);
  assert.equal(isLocalResourceHref("#安装"), false);
  assert.equal(isLocalResourceHref("mailto:a@b.c"), false);
  assert.equal(isLocalResourceHref("https://example.com/a.go", "https://example.com/a.go"), false);
  assert.equal(localLinkToOpen(absolute, "a/b/c.go#L516"), "a/b/c.go#L516");
  assert.equal(
    filesystemPathFromWebviewHref(absolute),
    "/Users/username/proj/a/b/c.go",
  );
  assert.equal(
    filesystemPathFromWebviewHref(
      "https://file+.vscode-resource.vscode-cdn.net/file///Users/username/proj/a/b/c.go#L516",
    ),
    "/Users/username/proj/a/b/c.go",
  );
});

test("行号片段解析", () => {
  assert.deepEqual(parseLineFragment("#L516"), {
    line: 516,
    column: 1,
    endLine: 516,
    endColumn: 1,
  });
  assert.deepEqual(parseLineFragment("#L516C3-L520C4"), {
    line: 516,
    column: 3,
    endLine: 520,
    endColumn: 4,
  });
  assert.equal(parseLineFragment("#安装"), null);
  assert.deepEqual(splitLocalLink("a/b/c.go#L516"), {
    path: "a/b/c.go",
    location: { line: 516, column: 1, endLine: 516, endColumn: 1 },
  });
  assert.deepEqual(splitLocalLink("a/b/c.go:516"), {
    path: "a/b/c.go",
    location: { line: 516, column: 1, endLine: 516, endColumn: 1 },
  });
  assert.equal(splitLocalLink("C:/src/a.go:12").path, "C:/src/a.go");
  assert.equal(splitLocalLink("docs/readme.md#安装").path, "docs/readme.md");
  assert.equal(splitLocalLink("docs/readme.md#安装").location, null);
});
