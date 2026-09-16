import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatFocusChip,
  formatFocusPath,
  headingPathForQuoteInHtml,
  headingPathFromMarks,
  sectionForHeadingInHtml,
  surroundingQuote,
} from "./docFocus.js";

test("标题栈按层级收成路径", () => {
  assert.deepEqual(
    headingPathFromMarks([
      { level: 1, text: "夜间模式" },
      { level: 2, text: "用户故事" },
      { level: 3, text: "US-001" },
    ]),
    ["夜间模式", "用户故事", "US-001"]
  );
  assert.deepEqual(
    headingPathFromMarks([
      { level: 1, text: "夜间模式" },
      { level: 2, text: "用户故事" },
      { level: 2, text: "规格与约束" },
    ]),
    ["夜间模式", "规格与约束"]
  );
});

test("用户故事下的一句能解析出该节标题", () => {
  const html = `
    <h1>夜间模式</h1>
    <h2>背景与目标</h2>
    <p>设置页太亮。</p>
    <h2>用户故事</h2>
    <p>作为用户我想要一键关灯。</p>
    <h2>规格与约束</h2>
    <p>不要改业务代码。</p>
  `;
  const path = headingPathForQuoteInHtml(html, "作为用户我想要一键关灯。");
  assert.ok(path.includes("用户故事"), `headingPath=${JSON.stringify(path)}`);
  assert.deepEqual(path, ["夜间模式", "用户故事"]);
});

test("引文不在 HTML 里或为空则没有路径", () => {
  assert.deepEqual(headingPathForQuoteInHtml("<h2>用户故事</h2><p>hello</p>", ""), []);
  assert.deepEqual(headingPathForQuoteInHtml("<h2>用户故事</h2><p>hello</p>", "没有这段"), []);
});

test("点用户故事标题取整节，不把下一节卷进来", () => {
  const html = `
    <h1>夜间模式</h1>
    <h2>用户故事</h2>
    <h3>US-001</h3>
    <p>作为用户我想要一键关灯。</p>
    <h2>规格与约束</h2>
    <p>不要改业务代码。</p>
  `;
  const section = sectionForHeadingInHtml(html, "用户故事");
  assert.deepEqual(section.headingPath, ["夜间模式", "用户故事"]);
  assert.match(section.quote, /US-001/);
  assert.match(section.quote, /一键关灯/);
  assert.doesNotMatch(section.quote, /不要改业务代码/);

  const nested = sectionForHeadingInHtml(html, "US-001");
  assert.deepEqual(nested.headingPath, ["夜间模式", "用户故事", "US-001"]);
  assert.match(nested.quote, /一键关灯/);
  assert.doesNotMatch(nested.quote, /规格与约束/);

  const sentencePath = headingPathForQuoteInHtml(html, "作为用户我想要一键关灯。");
  assert.deepEqual(sentencePath, ["夜间模式", "用户故事", "US-001"]);
  assert.notEqual(section.quote, "作为用户我想要一键关灯。");
});

test("surroundingQuote 切出引文前后文", () => {
  const full = "前文甲 作为用户我想要一键关灯。 后文乙";
  assert.deepEqual(surroundingQuote(full, "作为用户我想要一键关灯。"), {
    before: "前文甲",
    after: "后文乙",
  });
  assert.deepEqual(surroundingQuote("没有这段", "一键关灯"), { before: "", after: "" });
});

test("芯片文案是章节路径加 24 字摘录", () => {
  assert.equal(formatFocusChip({ headingPath: [], quote: "" }), "");
  assert.equal(
    formatFocusChip({ headingPath: ["用户故事"], quote: "作为用户我想要一键关灯。" }),
    "用户故事 · 「作为用户我想要一键关灯。」"
  );
  const long = "这是一段超过二十四字用来检查芯片摘录是否截断的选中原文";
  assert.equal(
    formatFocusChip({ headingPath: ["背景与目标", "问题"], quote: long }),
    `背景与目标 / 问题 · 「${long.slice(0, 24)}…」`
  );
});

test("弹出框路径和底条芯片分开：路径不截引文", () => {
  assert.equal(formatFocusPath([]), "（整篇）");
  assert.equal(formatFocusPath(["背景与目标", "背景与问题"]), "背景与目标 / 背景与问题");
});
