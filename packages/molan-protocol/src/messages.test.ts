import assert from "node:assert/strict";
import { test } from "node:test";
import {
  FrameToHostMessageSchema,
  HostToFrameMessageSchema,
  MolanThemeSchema,
  parseFrameToHostMessage,
  parseHostToFrameMessage,
} from "./index.js";

test("MolanThemeSchema 只接受四款纸面", () => {
  assert.equal(MolanThemeSchema.safeParse("night").success, true);
  assert.equal(MolanThemeSchema.safeParse("xuan").success, true);
  assert.equal(MolanThemeSchema.safeParse("paper").success, false);
});

test("HostToFrameMessageSchema init/setContent 正例", () => {
  const init = HostToFrameMessageSchema.parse({
    type: "init",
    value: "# hello",
    fileName: "demo.md",
    readOnly: false,
    dirty: false,
  });
  assert.equal(init.type, "init");

  const setContent = HostToFrameMessageSchema.parse({
    type: "setContent",
    value: "next",
    fileName: "demo.md",
    dirty: true,
  });
  assert.equal(setContent.dirty, true);
  assert.equal(setContent.readOnly, undefined);
});

test("HostToFrameMessageSchema 拒绝缺字段", () => {
  assert.equal(
    HostToFrameMessageSchema.safeParse({ type: "init", value: "x" }).success,
    false,
  );
  assert.equal(
    HostToFrameMessageSchema.safeParse({ type: "unknown" }).success,
    false,
  );
});

test("FrameToHostMessageSchema 正例", () => {
  assert.deepEqual(FrameToHostMessageSchema.parse({ type: "ready" }), { type: "ready" });
  const state = FrameToHostMessageSchema.parse({
    type: "state",
    requestId: 1,
    value: "body",
    dirty: true,
    isPreview: false,
  });
  assert.equal(state.requestId, 1);
  assert.equal(state.isPreview, false);
});

test("parseHostToFrameMessage / parseFrameToHostMessage 安全解析", () => {
  assert.equal(parseHostToFrameMessage(null), null);
  assert.equal(parseHostToFrameMessage({ type: "find" })?.type, "find");
  assert.equal(parseFrameToHostMessage({ type: "theme", theme: "hack" })?.theme, "hack");
  assert.equal(parseFrameToHostMessage({ type: "theme", theme: "bad" }), null);
  assert.equal(parseFrameToHostMessage({ type: "copyText", value: "abc" })?.type, "copyText");
  assert.equal(parseFrameToHostMessage({ type: "quickOpen" })?.type, "quickOpen");
  const selection = parseFrameToHostMessage({
    type: "selection",
    headingPath: ["用户故事"],
    quote: "作为用户我想要一键关灯。",
  });
  assert.equal(selection?.type, "selection");
  if (selection?.type === "selection") {
    assert.deepEqual(selection.headingPath, ["用户故事"]);
  }
});
