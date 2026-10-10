import assert from "node:assert/strict";
import { test } from "node:test";
import { decodeReadPosition, encodeReadPosition } from "./read-position.js";

test("encodeReadPosition 编码块序号与偏移", () => {
  assert.equal(encodeReadPosition({ index: 0, offset: 0 }), "b0o0");
  assert.equal(encodeReadPosition({ index: 12, offset: 96 }), "b12o96");
  // 长段读到一半：块顶边已在视口上方
  assert.equal(encodeReadPosition({ index: 3, offset: -120 }), "b3o-120");
  // 偏移取整
  assert.equal(encodeReadPosition({ index: 2, offset: 48.6 }), "b2o49");
});

test("encodeReadPosition 拒绝非法输入", () => {
  assert.equal(encodeReadPosition({ index: -1, offset: 0 }), "");
  assert.equal(encodeReadPosition({ index: 1.5, offset: 0 }), "");
  assert.equal(encodeReadPosition({ index: 1, offset: Number.NaN }), "");
  assert.equal(encodeReadPosition({ index: 1, offset: Number.POSITIVE_INFINITY }), "");
});

test("decodeReadPosition 解回位置", () => {
  assert.deepEqual(decodeReadPosition("b0o0"), { index: 0, offset: 0 });
  assert.deepEqual(decodeReadPosition(" b12o96 "), { index: 12, offset: 96 });
  assert.deepEqual(decodeReadPosition("b3o-120"), { index: 3, offset: -120 });
});

test("decodeReadPosition 拒绝坏值", () => {
  assert.equal(decodeReadPosition(""), null);
  assert.equal(decodeReadPosition(null), null);
  assert.equal(decodeReadPosition(3), null);
  assert.equal(decodeReadPosition("b-1o0"), null);
  assert.equal(decodeReadPosition("12:96"), null);
  assert.equal(decodeReadPosition("b1o"), null);
});

test("encode/decode 往返一致", () => {
  for (const pos of [
    { index: 0, offset: 0 },
    { index: 7, offset: 128 },
    { index: 42, offset: -64 },
  ]) {
    assert.deepEqual(decodeReadPosition(encodeReadPosition(pos)), pos);
  }
});