import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MOLAN_ISSUES_CHOOSE,
  buildFeedbackIssueUrl,
} from "./feedback.js";

test("buildFeedbackIssueUrl bug 预填模板字段", () => {
  const url = buildFeedbackIssueUrl({
    kind: "bug",
    title: "预览卡住",
    body: "打开大文件后无法滚动",
    env: { extensionVersion: "0.1.28", editorVersion: "1.96.0" },
  });
  const u = new URL(url);
  assert.equal(u.origin + u.pathname, "https://github.com/fengshihao/molan/issues/new");
  assert.equal(u.searchParams.get("template"), "bug.yml");
  assert.equal(u.searchParams.get("title"), "bug: 预览卡住");
  assert.equal(u.searchParams.get("surface"), "VS Code / Cursor 扩展");
  assert.match(u.searchParams.get("version") || "", /0\.1\.28/);
  assert.equal(u.searchParams.get("steps"), "打开大文件后无法滚动");
});

test("buildFeedbackIssueUrl idea 预填模板字段", () => {
  const url = buildFeedbackIssueUrl({
    kind: "idea",
    title: "大纲折叠",
    body: "希望按层级折叠",
    env: { extensionVersion: "0.1.28", editorVersion: "1.96.0" },
  });
  const u = new URL(url);
  assert.equal(u.searchParams.get("template"), "idea.yml");
  assert.equal(u.searchParams.get("title"), "idea: 大纲折叠");
  assert.equal(u.searchParams.get("intent"), "大纲折叠");
  assert.equal(u.searchParams.get("scope"), "不确定");
  assert.match(u.searchParams.get("detail") || "", /希望按层级折叠/);
});

test("MOLAN_ISSUES_CHOOSE 指向 choose 页", () => {
  assert.match(MOLAN_ISSUES_CHOOSE, /\/issues\/new\/choose$/);
});
