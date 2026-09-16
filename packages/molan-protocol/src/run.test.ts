import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AguiEventSchema,
  agui,
  assistantMessageId,
  maxSeq,
  mergeAguiEvents,
  parseSseData,
  reduceAguiEvents,
  toAguiEvent,
  userMessageId,
} from "./run.js";

test("AguiEventSchema 接受 RUN_STARTED / TEXT_MESSAGE_CONTENT / CUSTOM", () => {
  const started = AguiEventSchema.parse({
    seq: 1,
    type: "RUN_STARTED",
    runId: "r1",
    threadId: "p1",
    mode: "coauthor",
  });
  assert.equal(started.type, "RUN_STARTED");

  const text = AguiEventSchema.parse({
    seq: 3,
    type: "TEXT_MESSAGE_CONTENT",
    runId: "r1",
    messageId: "user-r1",
    role: "user",
    delta: "把登录写清楚",
  });
  assert.equal(text.delta, "把登录写清楚");

  const hint = AguiEventSchema.parse({
    seq: 4,
    type: "CUSTOM",
    runId: "r1",
    name: "hint",
    value: { text: "正在读文档仓…" },
  });
  assert.equal(hint.name, "hint");
});

test("toAguiEvent 把旧事件名收成 AG-UI 子集", () => {
  assert.equal(
    toAguiEvent({ seq: 1, type: "trust", payload: { text: "只写文档仓" }, runId: "r1" }).name,
    "trust"
  );
  const hint = toAguiEvent({
    seq: 2,
    type: "progress",
    payload: { text: "正在读" },
    runId: "r1",
  });
  assert.equal(hint.type, "CUSTOM");
  assert.equal(hint.name, "hint");
  assert.equal(hint.value?.text, "正在读");

  const text = toAguiEvent({
    seq: 3,
    type: "text",
    payload: { text: "你好" },
    runId: "r1",
  });
  assert.equal(text.type, "TEXT_MESSAGE_CONTENT");
  assert.equal(text.delta, "你好");

  const done = toAguiEvent({
    seq: 9,
    type: "done",
    payload: { ok: true },
    runId: "r1",
  });
  assert.equal(done.result, "success");
});

test("parseSseData 读 AG-UI 帧，也能读旧 event 名", () => {
  const modern = parseSseData("RUN_STARTED", {
    seq: 1,
    type: "RUN_STARTED",
    runId: "r1",
    threadId: "p1",
  });
  assert.equal(modern?.type, "RUN_STARTED");

  const legacy = parseSseData("tool", { seq: 4, name: "Read" }, "r1");
  assert.equal(legacy?.type, "TOOL_CALL_START");
  assert.equal(legacy?.toolCallName, "Read");

  assert.equal(parseSseData("text", { hello: 1 }), null);
});

test("reduceAguiEvents 折成用户气泡 + 助手块", () => {
  const turns = reduceAguiEvents([
    { seq: 1, type: "RUN_STARTED", runId: "r1", threadId: "p1" },
    { seq: 2, type: "TEXT_MESSAGE_START", runId: "r1", messageId: "user-r1", role: "user" },
    {
      seq: 3,
      type: "TEXT_MESSAGE_CONTENT",
      runId: "r1",
      messageId: "user-r1",
      role: "user",
      delta: "写清登录",
    },
    { seq: 4, type: "TEXT_MESSAGE_END", runId: "r1", messageId: "user-r1", role: "user" },
    {
      seq: 5,
      type: "CUSTOM",
      runId: "r1",
      name: "trust",
      value: { text: "只写文档仓。" },
    },
    { seq: 6, type: "TEXT_MESSAGE_START", runId: "r1", messageId: "assistant-r1", role: "assistant" },
    {
      seq: 7,
      type: "TEXT_MESSAGE_CONTENT",
      runId: "r1",
      messageId: "assistant-r1",
      role: "assistant",
      delta: "先读 ",
    },
    {
      seq: 8,
      type: "TEXT_MESSAGE_CONTENT",
      runId: "r1",
      messageId: "assistant-r1",
      role: "assistant",
      delta: "README。",
    },
    { seq: 9, type: "TOOL_CALL_START", runId: "r1", toolCallId: "t1", toolCallName: "Read" },
    { seq: 10, type: "TOOL_CALL_END", runId: "r1", toolCallId: "t1", toolCallName: "Read" },
    { seq: 11, type: "CUSTOM", runId: "r1", name: "file", value: { path: "01-背景与目标.md" } },
    { seq: 12, type: "RUN_FINISHED", runId: "r1", result: "success" },
  ]);

  assert.equal(turns.length, 1);
  assert.equal(turns[0].you, "写清登录");
  const kinds = turns[0].blocks.map((b) => b.kind);
  assert.deepEqual(kinds, ["trust", "text", "tool", "file", "status"]);
  const text = turns[0].blocks.find((b) => b.kind === "text");
  assert.equal(text && text.kind === "text" ? text.text : "", "先读 README。");
});

test("reduceAguiEvents 把工具参数收成 path/detail，同路径 file 不重复", () => {
  const frames = [
    agui.toolStart("t1", "Read", { file_path: "01-背景与目标.md", content: "不要进事件" }),
    agui.toolStart("t2", "Grep", { pattern: "登录", path: "docs" }),
    agui.custom("file", { path: "01-背景与目标.md" }),
    agui.custom("file", { path: "01-背景与目标.md" }),
    agui.custom("file", { path: "02-方案.md" }),
  ];
  const events = frames.map((frame, i) =>
    toAguiEvent({ seq: i + 1, type: frame.type, payload: { runId: "r3", ...frame.payload }, runId: "r3" })
  );
  const turns = reduceAguiEvents(events);
  const tools = turns[0].blocks.filter((b) => b.kind === "tool");
  const files = turns[0].blocks.filter((b) => b.kind === "file");
  assert.equal(tools.length, 2);
  assert.equal(tools[0].kind === "tool" ? tools[0].detail : "", "01-背景与目标.md");
  assert.equal(tools[1].kind === "tool" ? tools[1].detail : "", "登录 · docs");
  assert.deepEqual(
    files.map((b) => (b.kind === "file" ? b.path : "")),
    ["02-方案.md"]
  );
});

test("reduceAguiEvents 丢掉与已有正文完全相同的重复 delta", () => {
  const turns = reduceAguiEvents([
    { seq: 1, type: "TEXT_MESSAGE_START", runId: "r4", messageId: "assistant-r4", role: "assistant" },
    {
      seq: 2,
      type: "TEXT_MESSAGE_CONTENT",
      runId: "r4",
      messageId: "assistant-r4",
      role: "assistant",
      delta: "先改登录。",
    },
    {
      seq: 3,
      type: "TEXT_MESSAGE_CONTENT",
      runId: "r4",
      messageId: "assistant-r4",
      role: "assistant",
      delta: "先改登录。",
    },
  ]);
  const text = turns[0].blocks.find((b) => b.kind === "text");
  assert.equal(text && text.kind === "text" ? text.text : "", "先改登录。");
});

test("mergeAguiEvents 按 runId+seq 去重", () => {
  const a = [{ seq: 1, type: "RUN_STARTED" as const, runId: "r1" }];
  const b = [
    { seq: 1, type: "RUN_STARTED" as const, runId: "r1" },
    { seq: 2, type: "RUN_FINISHED" as const, runId: "r1", result: "success" as const },
  ];
  const merged = mergeAguiEvents(a, b);
  assert.equal(merged.length, 2);
  assert.equal(maxSeq(merged), 2);
});

test("agui 工厂发出的载荷能被 toAguiEvent / reduce 吃进去", () => {
  const runId = "r2";
  const userId = userMessageId(runId);
  const frames = [
    agui.runStarted("p1", "coauthor"),
    agui.textStart(userId, "user"),
    agui.textDelta(userId, "user", "补验收"),
    agui.textEnd(userId, "user"),
    agui.custom("hint", { text: "正在写文档仓…" }),
    agui.textDelta(assistantMessageId(runId), "assistant", "好。"),
    agui.finished("success"),
  ];
  const events = frames.map((frame, i) =>
    toAguiEvent({ seq: i + 1, type: frame.type, payload: { runId, ...frame.payload }, runId })
  );
  const turns = reduceAguiEvents(events);
  assert.equal(turns[0].you, "补验收");
  assert.ok(turns[0].blocks.some((b) => b.kind === "hint"));
  assert.ok(turns[0].blocks.some((b) => b.kind === "status"));
});

test("reduceAguiEvents 把 focus 自定义事件收成气泡引文", () => {
  const frames = [
    agui.runStarted("p1", "coauthor"),
    agui.custom("focus", {
      file: "PRD.md",
      headingPath: ["用户故事"],
      quote: "作为用户我想要一键关灯。",
    }),
    agui.textStart("user-r5", "user"),
    agui.textDelta("user-r5", "user", "把验收写清楚"),
    agui.textEnd("user-r5", "user"),
  ];
  const events = frames.map((frame, i) =>
    toAguiEvent({ seq: i + 1, type: frame.type, payload: { runId: "r5", ...frame.payload }, runId: "r5" })
  );
  const turns = reduceAguiEvents(events);
  assert.equal(turns[0].you, "把验收写清楚");
  assert.deepEqual(turns[0].focus?.headingPath, ["用户故事"]);
  assert.match(turns[0].focus?.quote || "", /一键关灯/);
  assert.equal(turns[0].focus?.file, "PRD.md");
});
