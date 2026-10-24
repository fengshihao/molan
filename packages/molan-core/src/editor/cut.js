  /* --- cut: 编辑态 Cmd/Ctrl+X。VS Code 会在外层吃掉快捷键，改由扩展把剪切送进 webview --- */
  let cutGuardAt = 0;

  function writeCutClipboard(text) {
    const value = String(text ?? "");
    if (!value) return;
    const hostCopy = global.__molanHostCopyText;
    if (typeof hostCopy === "function") {
      try {
        void hostCopy(value);
        return;
      } catch (_) { /* 改走浏览器剪贴板 */ }
    }
    const clipboard = global.navigator?.clipboard;
    if (typeof clipboard?.writeText === "function") {
      clipboard.writeText(value).catch(() => {});
    }
  }

  function cutPlainField(el) {
    if (!el || el.disabled || el.readOnly) return false;
    const tag = el.tagName;
    if (tag !== "INPUT" && tag !== "TEXTAREA") return false;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (typeof start !== "number" || typeof end !== "number" || start === end) return false;
    writeCutClipboard(String(el.value).slice(start, end));
    el.setRangeText("", start, end, "end");
    el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "deleteByCut" }));
    return true;
  }

  function irCutRoot(vditor) {
    return vditor?.vditor?.ir?.element
      || vditor?.ir?.element
      || document.querySelector("#vditor .vditor-ir");
  }

  function rangeInRoot(root, range) {
    if (!root || !range) return false;
    const node = range.commonAncestorContainer;
    return node === root || root.contains(node);
  }

  function markdownFromCutRange(vditor, range) {
    const temp = document.createElement("div");
    temp.appendChild(range.cloneContents());
    const lute = vditor?.vditor?.lute || vditor?.lute;
    if (lute && typeof lute.VditorIRDOM2Md === "function") {
      try {
        const md = String(lute.VditorIRDOM2Md(temp.innerHTML) || "").trim();
        if (md) return md;
      } catch (_) { /* 退回纯文本 */ }
    }
    return range.toString();
  }

  function deleteCutRange(root, range) {
    const sel = window.getSelection();
    try { root.focus({ preventScroll: true }); } catch (_) {
      try { root.focus(); } catch (__) { /* ignore */ }
    }
    if (sel && range) {
      try {
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (_) { /* 选区可能已经失效 */ }
    }
    let deleted = false;
    try { deleted = document.execCommand("delete"); } catch (_) { deleted = false; }
    if (deleted) return;
    try { range.deleteContents(); } catch (_) { return; }
    if (sel && range) {
      try {
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (_) { /* ignore */ }
    }
    root.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "deleteByCut" }));
  }

  function performHostCut(vditor, isPreviewing, deferDelete) {
    const now = Date.now();
    if (now - cutGuardAt < 80) return "repeat";
    const field = document.activeElement;
    if (cutPlainField(field)) {
      cutGuardAt = now;
      return "cut";
    }
    if (isPreviewing) return "skip";
    const root = irCutRoot(vditor);
    const sel = window.getSelection();
    if (!root || !sel || sel.rangeCount === 0 || sel.isCollapsed) return "skip";
    const range = sel.getRangeAt(0);
    if (!rangeInRoot(root, range)) return "skip";
    const text = markdownFromCutRange(vditor, range);
    if (!text) return "skip";
    writeCutClipboard(text);
    cutGuardAt = now;
    if (deferDelete) window.setTimeout(() => deleteCutRange(root, range), 0);
    else deleteCutRange(root, range);
    return "cut";
  }

  function bindVscodeCut(getVditor, isPreviewing) {
    if (!isVscodeHost() || bindVscodeCut.bound) return;
    bindVscodeCut.bound = true;
    document.addEventListener("cut", (event) => {
      const result = performHostCut(getVditor(), isPreviewing(), true);
      if (result === "skip") return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
  }
