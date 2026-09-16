import type { EditorApi, FrameToHostMessage, HostToFrameMessage, MolanState } from "@molan/protocol";
import { createBridgeCore } from "./core.js";

declare global {
  interface Window {
    MolanEditor: {
      create(options: Record<string, unknown>): Promise<EditorApi>;
      toast(msg: string): void;
      countWords(text: string): number;
      copyText?(text: string): Promise<void>;
    };
    __MOLAN_VDITOR_CDN__?: string;
    __MOLAN_LINK_BASE__?: string;
  }
}

export type InlineHostCallbacks = {
  onSave: () => void;
  onChange: (dirty: boolean) => void;
  onPreviewChange: (isPreview: boolean) => void;
  onWantEdit: () => void;
  /** 只读时点编辑：宿主可先抢锁，返回 true 则放行进入编辑 */
  onRequestEdit?: () => boolean | Promise<boolean>;
  onReady?: () => void;
  onSelection?: (focus: {
    headingPath: string[];
    quote: string;
    before?: string;
    after?: string;
    rect?: { top: number; left: number; bottom: number; right: number } | null;
  }) => void;
};

export type InlineHostHandle = {
  applyHostMessage(msg: HostToFrameMessage): Promise<void>;
  getState(): Promise<MolanState>;
  markSaved(): Promise<void>;
  exitEdit(): Promise<void>;
  clearSelection(): Promise<void>;
  expandToSection(): Promise<void>;
  dispose(): void;
};

function queryInRoot(root: HTMLElement, id: string): HTMLElement | null {
  return root.querySelector(`#${CSS.escape(id)}`);
}

export function mountInlineHost(root: HTMLElement, callbacks: InlineHostCallbacks): InlineHostHandle {
  const toast = (msg: string) => window.MolanEditor.toast(msg);
  const countWords = (text: string) => window.MolanEditor.countWords(text);

  let editorReady: Promise<EditorApi> | null = null;
  const stateWaiters = new Map<number, (state: MolanState) => void>();

  const bridge = createBridgeCore({
    chrome: {
      readerTitle: queryInRoot(root, "readerTitle"),
      readerEyebrow: queryInRoot(root, "readerEyebrow"),
      statusLeft: queryInRoot(root, "statusLeft"),
      statusRight: queryInRoot(root, "statusRight"),
      modeBtn: queryInRoot(root, "modeBtn"),
    },
    post: (msg: FrameToHostMessage) => {
      if (msg.type === "save") {
        callbacks.onSave();
        return;
      }
      if (msg.type === "change") {
        callbacks.onChange(Boolean(msg.dirty));
        return;
      }
      if (msg.type === "previewChange") {
        callbacks.onPreviewChange(msg.isPreview);
        return;
      }
      if (msg.type === "wantEdit") {
        callbacks.onWantEdit();
        return;
      }
      if (msg.type === "selection") {
        callbacks.onSelection?.({
          headingPath: msg.headingPath,
          quote: msg.quote,
          before: msg.before,
          after: msg.after,
          rect: msg.rect,
        });
        return;
      }
      if (msg.type === "state") {
        const resolve = stateWaiters.get(msg.requestId);
        if (resolve) {
          stateWaiters.delete(msg.requestId);
          resolve({
            value: msg.value,
            dirty: msg.dirty,
            isPreview: msg.isPreview,
          });
        }
      }
    },
    toast,
    countWords,
    readOnlyFeatures: true,
    readonlyRoot: root,
    ensureEditor: () => {
      if (bridge.editorApi) return Promise.resolve(bridge.editorApi);
      if (editorReady) return editorReady;
      editorReady = window.MolanEditor.create({
        elementId: "vditor",
        cdn: window.__MOLAN_VDITOR_CDN__,
        linkBase: window.__MOLAN_LINK_BASE__ || "",
        previewActions: [],
        sectionAsk: true,
        onInput: () => bridge.onEditorInput(),
        onCounter: () => bridge.onEditorCounter(),
        onSave: () => {
          if (bridge.readOnly) return;
          callbacks.onSave();
        },
      }).then((api) => {
        bridge.bindEditor(api);
        return api;
      });
      return editorReady;
    },
  });

  const onCopy = async () => {
    if (!bridge.editorApi) return;
    try {
      const copy = window.MolanEditor.copyText;
      if (typeof copy === "function") await copy(bridge.editorApi.getValue());
      else await navigator.clipboard.writeText(bridge.editorApi.getValue());
      const copyBtn = queryInRoot(root, "copyBtn");
      copyBtn?.classList.remove("is-pulse");
      void copyBtn?.offsetWidth;
      copyBtn?.classList.add("is-pulse");
      toast("已复制 Markdown 原文");
    } catch {
      toast("复制失败");
    }
  };

  const onMode = async () => {
    if (!bridge.editorApi) return;
    if (bridge.readOnly) {
      const allowed = await callbacks.onRequestEdit?.();
      if (!allowed) {
        callbacks.onWantEdit();
        return;
      }
      await bridge.applyReadOnly(false);
    }
    const nextPreview = !bridge.editorApi.isPreview();
    await bridge.editorApi.setPreview(nextPreview);
    bridge.syncModeButton();
    callbacks.onPreviewChange(nextPreview);
    if (!nextPreview) {
      try {
        bridge.editorApi.focus();
      } catch {
        /* ignore */
      }
    }
  };

  const onKeydown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    if ((e.metaKey || e.ctrlKey) && key === "s") {
      e.preventDefault();
      if (!bridge.readOnly) callbacks.onSave();
    }
  };

  queryInRoot(root, "copyBtn")?.addEventListener("click", onCopy);
  queryInRoot(root, "modeBtn")?.addEventListener("click", onMode);
  document.addEventListener("keydown", onKeydown);

  void bridge.ensureEditor().then(() => {
    callbacks.onReady?.();
  });

  let reqId = 1;

  return {
    async applyHostMessage(msg) {
      await bridge.handleHostMessage(msg);
    },
    getState() {
      return new Promise<MolanState>((resolve) => {
        const id = reqId++;
        stateWaiters.set(id, resolve);
        bridge.handleGetState(id);
        window.setTimeout(() => {
          if (stateWaiters.has(id)) {
            stateWaiters.delete(id);
            resolve({
              value: bridge.editorApi?.getValue() ?? "",
              dirty: false,
              isPreview: bridge.editorApi?.isPreview() ?? true,
            });
          }
        }, 800);
      });
    },
    markSaved() {
      return bridge.handleSaved();
    },
    exitEdit() {
      return bridge.handleExitEdit();
    },
    async clearSelection() {
      await bridge.handleHostMessage({ type: "clearSelection" });
    },
    async expandToSection() {
      await bridge.handleHostMessage({ type: "expandSection" });
    },
    dispose() {
      queryInRoot(root, "copyBtn")?.removeEventListener("click", onCopy);
      queryInRoot(root, "modeBtn")?.removeEventListener("click", onMode);
      document.removeEventListener("keydown", onKeydown);
      stateWaiters.clear();
    },
  };
}
