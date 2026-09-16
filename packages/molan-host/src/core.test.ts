import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";
import { createBridgeCore } from "./core.js";
import type { EditorApi } from "@molan/protocol";

beforeEach(() => {
  (globalThis as { document?: { body: { classList: { toggle: () => void } } } }).document = {
    body: { classList: { toggle: () => {} } },
  };
});

function mockEl(id: string) {
  return {
    id,
    textContent: "",
    title: "",
    classList: {
      _set: new Set<string>(),
      toggle(name: string, on?: boolean) {
        if (on === undefined) {
          if (this._set.has(name)) this._set.delete(name);
          else this._set.add(name);
        } else if (on) this._set.add(name);
        else this._set.delete(name);
      },
    },
    setAttribute(_name: string, _value: string) {},
  } as unknown as HTMLElement;
}

function mockEditor(value = "# hello"): EditorApi {
  let preview = true;
  return {
    getValue: () => value,
    setValue: async (next: string) => {
      value = next;
    },
    setPreview: async (p: boolean) => {
      preview = p;
      return preview;
    },
    isPreview: () => preview,
    focus: () => {},
    onPreviewChange: () => () => {},
    onSelection: () => () => {},
  };
}

test("createBridgeCore applyHostContent 同步 baseline 与 chrome", async () => {
  const posts: unknown[] = [];
  const readerTitle = mockEl("readerTitle");
  const readerEyebrow = mockEl("readerEyebrow");
  const statusRight = mockEl("statusRight");

  const bridge = createBridgeCore({
    chrome: { readerTitle, readerEyebrow, statusRight },
    post: (msg) => posts.push(msg),
    toast: () => {},
    countWords: (t) => t.length,
    readOnlyFeatures: true,
    ensureEditor: async () => mockEditor("初始"),
  });

  await bridge.applyHostContent({
    type: "init",
    value: "# 标题\n\n正文",
    fileName: "demo.md",
    readOnly: true,
    dirty: false,
  });

  assert.equal(readerTitle.textContent, "demo");
  assert.equal(readerEyebrow.textContent, "只读");
  assert.match(String(statusRight.textContent), /字 · 只读/);
  assert.equal(bridge.readOnly, true);
  assert.ok(posts.some((m) => (m as { type?: string }).type === "previewChange"));
});

test("createBridgeCore handleSaved 清 dirty", async () => {
  const readerEyebrow = mockEl("readerEyebrow");
  const bridge = createBridgeCore({
    chrome: { readerEyebrow },
    post: () => {},
    toast: () => {},
    countWords: (t) => t.length,
    readOnlyFeatures: true,
    ensureEditor: async () => mockEditor("saved"),
  });

  await bridge.applyHostContent({
    type: "init",
    value: "saved",
    fileName: "a.md",
    dirty: true,
  });
  await bridge.handleSaved();
  assert.equal(readerEyebrow.textContent, "已同步");
});

test("bindEditor 把预览选区转成 selection 消息", () => {
  const posts: unknown[] = [];
  let report: ((focus: { headingPath: string[]; quote: string }) => void) | undefined;
  const api: EditorApi = {
    ...mockEditor(),
    onSelection(cb) {
      report = cb;
      return () => undefined;
    },
  };
  const bridge = createBridgeCore({
    chrome: {},
    post: (msg) => posts.push(msg),
    toast: () => {},
    countWords: (t) => t.length,
    ensureEditor: async () => api,
  });
  bridge.bindEditor(api);
  report?.({ headingPath: ["用户故事"], quote: "作为用户我想要一键关灯。" });
  const sel = posts.find((m) => (m as { type?: string }).type === "selection") as {
    headingPath: string[];
    quote: string;
  };
  assert.ok(sel);
  assert.deepEqual(sel.headingPath, ["用户故事"]);
  assert.match(sel.quote, /一键关灯/);
});

test("handleHostMessage clearSelection 调用编辑器清选区", async () => {
  let cleared = 0;
  const api: EditorApi = {
    ...mockEditor(),
    clearSelection() {
      cleared += 1;
    },
  };
  const bridge = createBridgeCore({
    chrome: {},
    post: () => {},
    toast: () => {},
    countWords: (t) => t.length,
    ensureEditor: async () => api,
  });
  bridge.bindEditor(api);
  const ok = await bridge.handleHostMessage({ type: "clearSelection" });
  assert.equal(ok, true);
  assert.equal(cleared, 1);
});
