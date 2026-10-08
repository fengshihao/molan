import assert from "node:assert/strict";
import { test } from "node:test";
import {
  decodeFragment,
  headingPlainKey,
  normalizeFragmentKey,
} from "./preview-anchor.js";

test("decodeFragment 解码中文锚点", () => {
  assert.equal(decodeFragment("#安装"), "安装");
  assert.equal(decodeFragment("%E5%AE%89%E8%A3%85"), "安装");
  assert.equal(decodeFragment(""), "");
});

test("normalizeFragmentKey 去掉 user-content 前缀", () => {
  assert.equal(normalizeFragmentKey("user-content-Usage"), "usage");
});

test("headingPlainKey 去掉行内标记并归一空白", () => {
  assert.equal(headingPlainKey("**安装**"), "安装");
  assert.equal(headingPlainKey("  Hello   world  "), "hello world");
});
