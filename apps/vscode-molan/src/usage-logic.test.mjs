import assert from "node:assert/strict";
import test from "node:test";
import {
  contentFeatures,
  createUsageReporter,
  hostKind,
  osKind,
} from "./usage-logic.mjs";

test("contentFeatures 只认出功能名", () => {
  assert.deepEqual(contentFeatures("# 标题\n\n一段话"), []);
  assert.deepEqual(
    contentFeatures("```mermaid\nflowchart LR\n  A-->B\n```\n"),
    ["mermaid"],
  );
  assert.deepEqual(contentFeatures("行内 $$E=mc^2$$ 结束"), ["math"]);
  assert.deepEqual(contentFeatures("\\(a+b\\)"), ["math"]);
  assert.deepEqual(
    contentFeatures("| 列 | 值 |\n| --- | --- |\n| a | 1 |\n"),
    ["table"],
  );
  assert.deepEqual(contentFeatures("价格 $12 和 $3"), []);
});

test("hostKind / osKind 只保留低基数值", () => {
  assert.equal(hostKind("Cursor"), "cursor");
  assert.equal(hostKind("Visual Studio Code"), "vscode");
  assert.equal(hostKind("Other Editor"), "other");
  assert.equal(osKind("darwin"), "darwin");
  assert.equal(osKind("freebsd"), "other");
});

test("未配置 website id 或未允许遥测时不发送", async () => {
  let calls = 0;
  const off = createUsageReporter({
    websiteId: "",
    endpoint: "https://gateway.umami.is/api/send",
    enabled: () => true,
    distinctId: () => "a".repeat(32),
    context: () => ({ version: "0.1.44", host: "vscode", os: "darwin" }),
    send: async () => {
      calls += 1;
    },
  });
  off.event("session");
  const denied = createUsageReporter({
    websiteId: "site-id",
    endpoint: "https://gateway.umami.is/api/send",
    enabled: () => false,
    distinctId: () => "a".repeat(32),
    context: () => ({ version: "0.1.44", host: "vscode", os: "darwin" }),
    send: async () => {
      calls += 1;
    },
  });
  denied.event("session");
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(calls, 0);
});

test("同一键只发一次，正文和路径不会进载荷", async () => {
  const sent = [];
  const reporter = createUsageReporter({
    websiteId: "site-id",
    endpoint: "https://gateway.umami.is/api/send",
    enabled: () => true,
    distinctId: () => "abc12345abc12345",
    context: () => ({
      version: "0.1.44",
      host: "cursor",
      os: "darwin",
      language: "zh-cn",
    }),
    send: async (_url, body) => {
      sent.push(body);
    },
  });
  reporter.event("open", "open:file-a");
  reporter.event("open", "open:file-a");
  reporter.event("open", "open:file-b");
  reporter.event("table", "table:file-a");
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(sent.length, 3);
  const payload = sent[0].payload;
  assert.equal(payload.name, "open");
  assert.equal(payload.url, "/open");
  assert.equal(payload.id, "abc12345abc12345");
  assert.deepEqual(payload.data, { version: "0.1.44", host: "cursor", os: "darwin" });
  assert.equal(JSON.stringify(sent).includes("file-a"), false);
  assert.equal(JSON.stringify(sent).includes("#"), false);
});
