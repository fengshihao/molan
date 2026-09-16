import type { EditorApi, FrameToHostMessage, HostToFrameMessage } from "@molan/protocol";
import { parseHostToFrameMessage } from "@molan/protocol";
import { stripMarkdownExtension } from "./link-utils.js";

export type BridgeChrome = {
  readerTitle?: HTMLElement | null;
  readerEyebrow?: HTMLElement | null;
  statusLeft?: HTMLElement | null;
  statusRight?: HTMLElement | null;
  modeBtn?: HTMLElement | null;
};

export type BridgeCoreOptions = {
  chrome: BridgeChrome;
  post: (msg: FrameToHostMessage) => void;
  toast: (msg: string) => void;
  countWords: (text: string) => number;
  ensureEditor: () => Promise<EditorApi>;
  /** Web 工作台：只读模式与 eyebrow 状态 */
  readOnlyFeatures?: boolean;
  statusRightSuffix?: string;
  /** 切换 is-readonly 的容器（默认 document.body） */
  readonlyRoot?: HTMLElement;
};

export function createBridgeCore(options: BridgeCoreOptions) {
  const {
    chrome,
    post,
    toast,
    countWords,
    ensureEditor,
    readOnlyFeatures = false,
    statusRightSuffix = "",
    readonlyRoot,
  } = options;

  const readonlyEl = readonlyRoot ?? (typeof document !== "undefined" ? document.body : null);

  function setReadonlyClass(on: boolean) {
    readonlyEl?.classList.toggle("is-readonly", on);
  }

  let editorApi: EditorApi | null = null;
  let applyingRemote = false;
  let currentFileName = "";
  let dirty = false;
  let baseline = "";
  let readOnly = false;
  let editorIdleTimer = 0;

  type MolanRuntime = {
    source?: { isOpen?: () => boolean };
  };

  function readMolanRuntime(): MolanRuntime | undefined {
    if (typeof window === "undefined") return undefined;
    return (window as unknown as { MolanEditor?: MolanRuntime }).MolanEditor;
  }

  function syncModeButton() {
    const { modeBtn } = chrome;
    if (!modeBtn) return;
    const preview = editorApi?.isPreview?.() ?? (readOnlyFeatures ? true : false);
    modeBtn.classList.toggle("is-preview", preview);
    const label = preview ? "编辑" : "预览";
    modeBtn.title = label;
    modeBtn.setAttribute("aria-label", label);
    if (readOnlyFeatures) {
      setReadonlyClass(readOnly);
    }
  }

  function setChrome(input: { fileName?: string; value?: string; isDirty?: boolean }) {
    const { fileName, value, isDirty } = input;
    if (fileName) {
      currentFileName = fileName;
      if (chrome.readerTitle) {
        chrome.readerTitle.textContent = stripMarkdownExtension(fileName);
      }
    }
    if (typeof isDirty === "boolean") dirty = isDirty;

    if (readOnlyFeatures && chrome.readerEyebrow) {
      chrome.readerEyebrow.classList.toggle("dirty", dirty);
      chrome.readerEyebrow.textContent = dirty ? "未保存" : readOnly ? "只读" : "已同步";
    }

    if (chrome.statusLeft) {
      chrome.statusLeft.textContent = currentFileName || "墨览";
    }

    const text = value ?? (editorApi ? editorApi.getValue() : "");
    if (chrome.statusRight) {
      if (readOnlyFeatures) {
        const syncLabel = dirty ? "未保存" : readOnly ? "只读" : "已同步";
        chrome.statusRight.textContent = `${countWords(text)} 字 · ${syncLabel}`;
      } else {
        chrome.statusRight.textContent = statusRightSuffix || `${countWords(text)} 字`;
      }
    }

    syncModeButton();
  }

  function scheduleEditorIdleWork() {
    clearTimeout(editorIdleTimer);
    editorIdleTimer = window.setTimeout(() => {
      if (applyingRemote || !editorApi) return;
      if (readOnlyFeatures && readOnly) return;
      const value = editorApi.getValue();
      const isDirty = value !== baseline;
      setChrome({ value, isDirty });
      if (isDirty) {
        post({ type: "change", value, dirty: readOnlyFeatures ? true : undefined });
      }
      if (readOnlyFeatures) {
        post({ type: "previewChange", isPreview: editorApi.isPreview() });
      }
    }, 180);
  }

  async function applyHostContent(msg: Extract<HostToFrameMessage, { type: "init" | "setContent" }>) {
    const api = await ensureEditor();
    editorApi = api;
    clearTimeout(editorIdleTimer);
    applyingRemote = true;
    const incoming = msg.value ?? "";
    if (readOnlyFeatures) readOnly = Boolean(msg.readOnly);
    // 已在预览则只 setValue 一次；从编辑退出时跳过「先渲旧文」再渲新文
    if (!api.isPreview()) {
      const setPreview = api.setPreview as (
        on: boolean,
        opts?: { skipRender?: boolean }
      ) => boolean | Promise<boolean>;
      await setPreview(true, { skipRender: true });
    }
    await api.setValue(incoming, true);
    baseline = api.getValue();
    applyingRemote = false;
    setChrome({
      fileName: msg.fileName || currentFileName,
      value: incoming,
      isDirty: !!msg.dirty,
    });
    if (readOnlyFeatures) {
      setReadonlyClass(readOnly);
      post({ type: "previewChange", isPreview: true });
    }
  }

  async function applyReadOnly(next: boolean) {
    if (!readOnlyFeatures) return;
    readOnly = Boolean(next);
    setReadonlyClass(readOnly);
    if (readOnly && editorApi && !editorApi.isPreview()) {
      await editorApi.setPreview(true);
    }
    setChrome({ value: editorApi ? editorApi.getValue() : undefined });
    post({ type: "previewChange", isPreview: editorApi ? editorApi.isPreview() : true });
  }

  async function handleSaved() {
    if (editorApi) baseline = editorApi.getValue();
    setChrome({ value: baseline, isDirty: false });
    toast("已保存");
    if (readOnlyFeatures) {
      post({ type: "change", value: baseline, dirty: false });
    }
  }

  function handleGetState(requestId: number) {
    const value = editorApi ? editorApi.getValue() : "";
    post({
      type: "state",
      requestId,
      value,
      dirty: value !== baseline,
      isPreview: editorApi ? editorApi.isPreview() : true,
    });
  }

  async function handleExitEdit() {
    if (editorApi && !editorApi.isPreview()) {
      await editorApi.setPreview(true);
    }
    post({ type: "previewChange", isPreview: true });
  }

  function bindEditor(api: EditorApi) {
    editorApi = api;
    api.onPreviewChange?.(() => {
      syncModeButton();
      if (readOnlyFeatures) {
        post({ type: "previewChange", isPreview: api.isPreview() });
      }
    });
    api.onSelection?.((focus) => {
      post({
        type: "selection",
        headingPath: focus.headingPath,
        quote: focus.quote,
        before: focus.before,
        after: focus.after,
        rect: focus.rect ?? null,
      });
    });
  }

  function onEditorInput() {
    if (applyingRemote) return;
    if (readOnlyFeatures && readOnly) return;
    const sourceEditing = readMolanRuntime()?.source?.isOpen?.() === true;
    if (readOnlyFeatures && editorApi?.isPreview?.() && !sourceEditing) return;
    scheduleEditorIdleWork();
  }

  function onEditorCounter() {
    if (applyingRemote || !editorApi || editorApi.isPreview?.()) return;
    setChrome({ value: editorApi.getValue() });
  }

  async function handleHostMessage(data: unknown): Promise<boolean> {
    const msg = parseHostToFrameMessage(data);
    if (!msg) return false;

    if (msg.type === "init" || msg.type === "setContent") {
      await applyHostContent(msg);
      return true;
    }
    if (msg.type === "setReadOnly") {
      await applyReadOnly(msg.readOnly);
      return true;
    }
    if (msg.type === "saved") {
      await handleSaved();
      return true;
    }
    if (msg.type === "getState") {
      handleGetState(msg.requestId);
      return true;
    }
    if (msg.type === "exitEdit") {
      await handleExitEdit();
      return true;
    }
    if (msg.type === "clearSelection") {
      editorApi?.clearSelection?.();
      return true;
    }
    if (msg.type === "expandSection") {
      editorApi?.expandToSection?.();
      return true;
    }
    return false;
  }

  return {
    get editorApi() {
      return editorApi;
    },
    get readOnly() {
      return readOnly;
    },
    setChrome,
    syncModeButton,
    scheduleEditorIdleWork,
    applyHostContent,
    applyReadOnly,
    handleSaved,
    handleGetState,
    handleExitEdit,
    bindEditor,
    onEditorInput,
    onEditorCounter,
    handleHostMessage,
    ensureEditor,
    setBaseline(value: string) {
      baseline = value;
    },
    getBaseline() {
      return baseline;
    },
  };
}
