  /* --- copy: 预览态复制保留 Markdown（加粗 / 列表 / 链接等） --- */
  let previewCopyLute = null;
  let copyGuardAt = 0;

  function getPreviewCopyLute() {
    if (previewCopyLute) return previewCopyLute;
    if (typeof global.Lute?.New === "function") {
      try {
        previewCopyLute = global.Lute.New();
      } catch (_) {
        previewCopyLute = null;
      }
    }
    return previewCopyLute;
  }

  function scrubPreviewCopyClone(host) {
    if (!host) return;
    host.querySelectorAll([
      ".molan-diagram-toolbar",
      ".molan-ask-section",
      ".molan-block-insert",
      ".molan-insert-menu",
      ".molan-feedback",
      ".vditor-copy",
      ".vditor-speech",
      "button",
      "audio",
      "video",
    ].join(", ")).forEach((el) => el.remove());
  }

  function markdownFromPreviewHtml(html) {
    const raw = String(html || "").trim();
    if (!raw) return "";
    const lute = getPreviewCopyLute();
    if (!lute || typeof lute.HTML2Md !== "function") return "";
    try {
      return String(lute.HTML2Md(raw) || "").replace(/^\n+/, "").replace(/\n+$/, "");
    } catch (_) {
      return "";
    }
  }

  function expandMarkdownSpan(source, start, end) {
    const src = String(source || "");
    let s = Math.max(0, start);
    let e = Math.min(src.length, end);
    if (s >= e) return null;

    let changed = true;
    while (changed) {
      changed = false;
      const link = src.slice(e).match(/^\]\([^)]*\)/);
      if (link && src.slice(s - 1, s) === "[") {
        s -= 1;
        e += link[0].length;
        if (src.slice(s - 1, s) === "!") s -= 1;
        changed = true;
        continue;
      }
      for (const mark of ["**", "~~", "__"]) {
        if (src.slice(s - mark.length, s) === mark && src.slice(e, e + mark.length) === mark) {
          s -= mark.length;
          e += mark.length;
          changed = true;
        }
      }
      if (changed) continue;
      for (const mark of ["*", "_", "`"]) {
        if (src.slice(s - 1, s) !== mark || src.slice(e, e + 1) !== mark) continue;
        if (mark === "*" && (src.slice(s - 2, s) === "**" || src.slice(e, e + 2) === "**")) continue;
        if (mark === "_" && (src.slice(s - 2, s) === "__" || src.slice(e, e + 2) === "__")) continue;
        s -= 1;
        e += 1;
        changed = true;
      }
    }

    const lineStart = src.lastIndexOf("\n", s - 1) + 1;
    const prefix = src.slice(lineStart, s);
    const lineEndIdx = src.indexOf("\n", e);
    const lineEnd = lineEndIdx < 0 ? src.length : lineEndIdx;
    const tail = src.slice(e, lineEnd);
    if (tail.trim() === "") {
      if (/^ {0,3}([-*+]|\d+[.)])(?: \[[ xX]\])? $/.test(prefix) || /^#{1,6} $/.test(prefix) || /^ {0,3}> ?/.test(prefix)) {
        s = lineStart;
        e = lineEnd;
      }
    }
    return { start: s, end: e };
  }

  function markdownFromPreviewSource(source, root, range) {
    const quote = range.toString();
    if (!String(quote || "").replace(/\s+/g, "")) return "";
    if (typeof pickCollapsedSpan !== "function") return "";
    const around = typeof surroundingFromRange === "function"
      ? surroundingFromRange(root, range)
      : { before: "", after: "" };
    const hit = pickCollapsedSpan(source, quote, around.before, around.after);
    if (!hit) return "";
    const span = expandMarkdownSpan(source, hit.start, hit.end) || hit;
    return String(source).slice(span.start, span.end);
  }

  function markdownFromPreviewBlocks(source, root, range) {
    if (typeof topLevelBlocks !== "function" || typeof splitMdBlocks !== "function") return "";
    const blocks = topLevelBlocks(root);
    const mdBlocks = splitMdBlocks(source);
    if (!blocks.length || mdBlocks.length !== blocks.length) return "";
    let first = -1;
    let last = -1;
    for (let i = 0; i < blocks.length; i += 1) {
      try {
        if (!range.intersectsNode(blocks[i])) continue;
      } catch (_) {
        continue;
      }
      if (first < 0) first = i;
      last = i;
    }
    if (first < 0) return "";
    const firstBlock = blocks[first];
    const lastBlock = blocks[last];
    try {
      const startCmp = range.compareBoundaryPoints(Range.START_TO_START, (() => {
        const r = document.createRange();
        r.selectNodeContents(firstBlock);
        return r;
      })());
      const endCmp = range.compareBoundaryPoints(Range.END_TO_END, (() => {
        const r = document.createRange();
        r.selectNodeContents(lastBlock);
        return r;
      })());
      // 只在几乎整块选中时走块级回退，避免半段选中却整段复制
      if (startCmp > 0 || endCmp < 0) {
        const selected = collapseWs(range.toString());
        const covered = collapseWs(mdBlocks.slice(first, last + 1).map((b) => b.text).join("\n"));
        if (!selected || !covered || selected.length < covered.length * 0.85) return "";
      }
    } catch (_) {
      return "";
    }
    return mdBlocks.slice(first, last + 1).map((b) => b.text).join("\n\n");
  }

  function markdownFromPreviewSelection(root, range, source) {
    if (!root || !range) return "";
    const clipped = typeof clipRangeToRoot === "function" ? clipRangeToRoot(root, range) : range;
    const fromSource = markdownFromPreviewSource(source, root, clipped);
    const temp = document.createElement("div");
    try {
      temp.appendChild(clipped.cloneContents());
    } catch (_) {
      return fromSource || String(clipped.toString() || "");
    }
    scrubPreviewCopyClone(temp);
    const fromHtml = markdownFromPreviewHtml(temp.innerHTML);
    const fromBlocks = markdownFromPreviewBlocks(source, root, clipped);
    const plain = String(clipped.toString() || "");

    // 优先保留原文切片（含 ** / 链接 / 列表符）；HTML2Md 处理跨格式混选；整块作回退
    const ranked = [fromSource, fromHtml, fromBlocks]
      .map((v) => String(v || "").replace(/\s+$/g, "").replace(/^\n+/, ""))
      .filter(Boolean);
    if (!ranked.length) return plain;
    const rich = ranked.find((v) => /(?:\*\*|__|~~|`|\[[^\]]+\]\([^)]+\)|^ {0,3}([-*+]|\d+[.)])\s|^#{1,6}\s)/m.test(v));
    return rich || ranked[0] || plain;
  }

  function writePreviewCopy(text, event) {
    const value = String(text ?? "");
    if (!value) return;
    try {
      event?.clipboardData?.setData("text/plain", value);
    } catch (_) { /* ignore */ }
    writeCutClipboard(value);
  }

  function performPreviewCopy(getRoot, isPreviewing, getMarkdown, event) {
    const now = Date.now();
    if (now - copyGuardAt < 80) return "repeat";
    if (!isPreviewing?.()) return "skip";
    const field = document.activeElement;
    if (field) {
      const tag = field.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || field.isContentEditable) return "skip";
    }
    const root = getRoot?.();
    const sel = window.getSelection();
    if (!root || !sel || !sel.rangeCount || sel.isCollapsed) return "skip";
    const range = sel.getRangeAt(0);
    if (typeof rangeTouchesRoot === "function" && !rangeTouchesRoot(root, range)) return "skip";
    const md = markdownFromPreviewSelection(root, range, getMarkdown?.() || "");
    if (!md) return "skip";
    // 与浏览器默认纯文本相同则不必拦截（避免多余 host 写剪贴板）
    if (md === range.toString()) return "skip";
    writePreviewCopy(md, event);
    copyGuardAt = now;
    return "copy";
  }

  function bindPreviewCopy(getRoot, isPreviewing, getMarkdown) {
    if (bindPreviewCopy.bound) return;
    bindPreviewCopy.bound = true;
    document.addEventListener("copy", (event) => {
      const result = performPreviewCopy(getRoot, isPreviewing, getMarkdown, event);
      if (result === "skip") return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
  }
