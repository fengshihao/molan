/**
 * VSCode webview ↔ 墨览编辑器桥。
 * 消息类型见 @molan/protocol。
 */
import type { EditorApi } from "@molan/protocol";
import { createBridgeCore } from "./core.js";
import {
  buildFeedbackIssueUrl,
  type FeedbackEnv,
  type FeedbackKind,
} from "./feedback.js";
import { isExternalHttp, isMarkdownHref, relativeToLinkBase } from "./link-utils.js";

declare global {
  interface Window {
    MolanEditor: {
      create(options: Record<string, unknown>): Promise<EditorApi>;
      toast(msg: string): void;
      countWords(text: string): number;
      copyText?(text: string): Promise<void>;
      find?: { open(): void; next(): void; prev(): void };
      format?: { bold(): boolean; italic(): boolean; link(): boolean };
    };
    __MOLAN_VDITOR_CDN__?: string;
    __MOLAN_LINK_BASE__?: string;
    __MOLAN_FEEDBACK__?: FeedbackEnv;
    __molanHostCopyText?: (text: string) => Promise<void>;
  }
  function acquireVsCodeApi(): { postMessage(msg: unknown): void };
}

function readFeedbackEnv(): FeedbackEnv {
  const raw = window.__MOLAN_FEEDBACK__;
  return {
    extensionVersion: raw?.extensionVersion?.trim() || "",
    editorVersion: raw?.editorVersion?.trim() || "",
  };
}

function bindFeedbackPanel(post: (msg: unknown) => void, toast: (msg: string) => void): {
  open(): void;
} {
  const root = document.getElementById("molanFeedback");
  const kindEl = document.getElementById("molanFeedbackKind") as HTMLSelectElement | null;
  const titleEl = document.getElementById("molanFeedbackTitleInput") as HTMLInputElement | null;
  const bodyEl = document.getElementById("molanFeedbackBody") as HTMLTextAreaElement | null;
  const envEl = document.getElementById("molanFeedbackEnv");
  const submitBtn = document.getElementById("molanFeedbackSubmit");
  const openBtn = document.getElementById("feedbackBtn");

  const syncEnvLabel = () => {
    const env = readFeedbackEnv();
    if (!envEl) return;
    const parts = [
      env.extensionVersion ? `扩展 ${env.extensionVersion}` : "",
      env.editorVersion ? `编辑器 ${env.editorVersion}` : "",
    ].filter(Boolean);
    envEl.textContent = parts.length ? parts.join(" · ") : "环境信息未注入";
  };

  const close = () => {
    if (!root) return;
    root.hidden = true;
    root.setAttribute("aria-hidden", "true");
    openBtn?.setAttribute("aria-expanded", "false");
  };

  const open = () => {
    if (!root) return;
    syncEnvLabel();
    root.hidden = false;
    root.setAttribute("aria-hidden", "false");
    openBtn?.setAttribute("aria-expanded", "true");
    queueMicrotask(() => titleEl?.focus());
  };

  openBtn?.addEventListener("click", () => {
    if (root && !root.hidden) close();
    else open();
  });

  root?.querySelectorAll("[data-feedback-close]").forEach((el) => {
    el.addEventListener("click", () => close());
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && root && !root.hidden) {
      e.preventDefault();
      close();
    }
  });

  submitBtn?.addEventListener("click", () => {
    const title = titleEl?.value.trim() || "";
    const body = bodyEl?.value.trim() || "";
    if (!title) {
      toast("请填写标题");
      titleEl?.focus();
      return;
    }
    if (!body) {
      toast("请填写描述");
      bodyEl?.focus();
      return;
    }
    const kind = (kindEl?.value === "idea" ? "idea" : "bug") as FeedbackKind;
    const url = buildFeedbackIssueUrl({
      kind,
      title,
      body,
      env: readFeedbackEnv(),
    });
    post({ type: "openExternal", value: url });
    close();
    toast("已打开 GitHub，请登录后提交");
  });

  return { open };
}

function bootVscodeBridge() {
  const vscode = acquireVsCodeApi();
  const toast = (msg: string) => window.MolanEditor.toast(msg);
  const countWords = (text: string) => window.MolanEditor.countWords(text);
  window.__molanHostCopyText = async (text) => {
    vscode.postMessage({ type: "copyText", value: text });
  };

  let editorReady: Promise<EditorApi> | null = null;

  const bridge = createBridgeCore({
    chrome: {
      readerTitle: document.getElementById("readerTitle"),
      statusLeft: document.getElementById("statusLeft"),
      statusRight: document.getElementById("statusRight"),
      modeBtn: document.getElementById("modeBtn"),
    },
    post: (msg) => vscode.postMessage(msg),
    toast,
    countWords,
    ensureEditor: () => {
      if (bridge.editorApi) return Promise.resolve(bridge.editorApi);
      if (editorReady) return editorReady;
      editorReady = window.MolanEditor.create({
        elementId: "vditor",
        cdn: window.__MOLAN_VDITOR_CDN__,
        linkBase: window.__MOLAN_LINK_BASE__ || "",
        previewActions: [],
        previewFormatBar: true,
        onInput: () => bridge.onEditorInput(),
        onCounter: () => bridge.onEditorCounter(),
        onSave: () => vscode.postMessage({ type: "save" }),
      }).then((api) => {
        bridge.bindEditor(api);
        return api;
      });
      return editorReady;
    },
  });

  const feedback = bindFeedbackPanel((msg) => vscode.postMessage(msg), toast);

  window.addEventListener("message", async (event) => {
    const msg = event.data;
    if (!msg || typeof msg !== "object") return;

    const handled = await bridge.handleHostMessage(msg);
    if (handled) return;

    if (msg.type === "find") {
      window.MolanEditor.find?.open();
      return;
    }
    if (msg.type === "findNext") {
      window.MolanEditor.find?.next();
      return;
    }
    if (msg.type === "findPrev") {
      window.MolanEditor.find?.prev();
      return;
    }
    if (msg.type === "formatBold") {
      window.MolanEditor.format?.bold();
      return;
    }
    if (msg.type === "formatItalic") {
      window.MolanEditor.format?.italic();
      return;
    }
    if (msg.type === "formatLink") {
      window.MolanEditor.format?.link();
      return;
    }
    if (msg.type === "openFeedback") {
      feedback.open();
    }
  });

  document.getElementById("copyBtn")?.addEventListener("click", async () => {
    if (!bridge.editorApi) return;
    try {
      const copy = window.MolanEditor.copyText;
      if (typeof copy === "function") await copy(bridge.editorApi.getValue());
      else await navigator.clipboard.writeText(bridge.editorApi.getValue());
      const copyBtn = document.getElementById("copyBtn");
      copyBtn?.classList.remove("is-pulse");
      void copyBtn?.offsetWidth;
      copyBtn?.classList.add("is-pulse");
      toast("已复制 Markdown 原文");
    } catch {
      toast("复制失败");
    }
  });

  document.getElementById("modeBtn")?.addEventListener("click", async () => {
    if (!bridge.editorApi) return;
    const nextPreview = !bridge.editorApi.isPreview();
    await bridge.editorApi.setPreview(nextPreview);
    bridge.syncModeButton();
    const wrap = document.getElementById("editorWrap");
    if (wrap) {
      wrap.classList.remove("is-mode");
      void wrap.offsetWidth;
      wrap.classList.add("is-mode");
    }
    if (!nextPreview) {
      try {
        bridge.editorApi.focus();
      } catch {
        /* ignore */
      }
    }
  });

  function isApplePlatform() {
    const platform = navigator.platform || "";
    if (/Mac|iPhone|iPad|iPod/i.test(platform)) return true;
    try {
      const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
      if (nav.userAgentData?.platform === "macOS") return true;
    } catch {
      /* ignore */
    }
    return /Mac OS X|Macintosh/i.test(navigator.userAgent || "");
  }

  function isPrimaryModKey(e: KeyboardEvent, key: string) {
    if (e.key.toLowerCase() !== key || e.shiftKey || e.altKey) return false;
    if (isApplePlatform()) return e.metaKey && !e.ctrlKey;
    return e.ctrlKey && !e.metaKey;
  }

  document.addEventListener("keydown", (e) => {
    if (isPrimaryModKey(e, "s")) {
      e.preventDefault();
      vscode.postMessage({ type: "save" });
      return;
    }
    // Mac ⌘P / Win Ctrl+P → 交回 VS Code Quick Open，不要弹出打印
    if (isPrimaryModKey(e, "p")) {
      e.preventDefault();
      e.stopPropagation();
      vscode.postMessage({ type: "quickOpen" });
    }
  });

  vscode.postMessage({ type: "ready" });

  document.getElementById("editorWrap")?.addEventListener(
    "click",
    (e) => {
      const event = e as MouseEvent;
      if (event.defaultPrevented || event.button !== 0) return;
      const target = event.target as Element | null;
      const a = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!a) return;
      const attr = a.getAttribute("href") || "";
      if (/^javascript:/i.test(attr)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (/^(mailto:|tel:)/i.test(attr)) return;
      const linkBase = window.__MOLAN_LINK_BASE__ || "";
      if (isExternalHttp(attr, linkBase)) {
        event.preventDefault();
        event.stopPropagation();
        vscode.postMessage({ type: "openExternal", value: attr });
        return;
      }
      const rel = relativeToLinkBase(attr || a.href, linkBase);
      if (rel.startsWith("#")) return;
      if (!isMarkdownHref(rel) && !isMarkdownHref(attr) && !isMarkdownHref(a.href)) return;
      event.preventDefault();
      event.stopPropagation();
      vscode.postMessage({ type: "openRelative", value: rel || attr });
    },
    true,
  );
}

bootVscodeBridge();
