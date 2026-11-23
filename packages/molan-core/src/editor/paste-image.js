  /* --- paste-image: 粘贴剪贴板截图，交给宿主落盘并插入相对路径 --- */
  const PASTE_IMAGE_SKIP =
    ".molan-find-bar input, .molan-find-bar textarea, .molan-image-url-input, .molan-source-view textarea, .molan-mermaid-editor textarea, #molanFeedback input, #molanFeedback textarea";

  function imageFileFromClipboard(dataTransfer) {
    const items = dataTransfer?.items;
    if (!items) return null;
    for (const item of items) {
      if (item.kind !== "file") continue;
      const type = String(item.type || "");
      if (!/^image\//i.test(type)) continue;
      const file = item.getAsFile();
      if (file) return file;
    }
    return null;
  }

  function pasteTargetSkipsImageInsert(target) {
    if (!target || typeof target.closest !== "function") return false;
    return !!target.closest(PASTE_IMAGE_SKIP);
  }

  function editingSurfaceOf(node) {
    const el = node?.nodeType === 1 ? node : node?.parentElement;
    return el?.closest?.(".vditor-ir, .vditor-wysiwyg, .vditor-sv") || null;
  }

  // 选区还在时，VS Code 用 execCommand("paste") 唤起粘贴，里面再 execCommand("delete") 是嵌套调用，会被忽略。
  // 结果是新文字插进选区中间，原来的字还在。先删掉选区，后面的插入才是替换。
  function clearExpandedEditorSelection(e) {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount) return;
    let range;
    try { range = sel.getRangeAt(0); } catch (_) { return; }
    const host = editingSurfaceOf(range.commonAncestorContainer);
    if (!host || host.getAttribute("contenteditable") === "false") return;
    if (e.target !== host && !host.contains(e.target)) return;
    try { range.deleteContents(); } catch (_) { return; }
    try {
      sel.removeAllRanges();
      sel.addRange(range);
    } catch (_) { /* 选区已经收成光标 */ }
  }

  function bindClipboardImagePaste(root, ctx) {
    if (!root) return () => {};
    const onPaste = async (e) => {
      if (pasteTargetSkipsImageInsert(e.target)) return;
      const file = imageFileFromClipboard(e.clipboardData);
      if (!file) {
        const data = e.clipboardData;
        const plain = data?.getData?.("text/plain") || "";
        const html = data?.getData?.("text/html") || "";
        if (plain || html) clearExpandedEditorSelection(e);
        return;
      }
      if (typeof ctx?.saveClipboardImage !== "function") return;
      e.preventDefault();
      e.stopPropagation();
      try {
        if (ctx.getPreviewing?.()) await ctx.enterEdit?.();
        const md = await ctx.saveClipboardImage(file);
        if (!md) return;
        const vd = ctx.getVditor?.();
        const piece = String(md).trim();
        if (!piece) return;
        if (vd && typeof vd.insertValue === "function") {
          vd.insertValue(`\n${piece}\n`, true);
        } else if (typeof ctx.insertMarkdown === "function") {
          await ctx.insertMarkdown(piece);
        }
        try {
          ctx.onInserted?.();
        } catch (_) {
          /* ignore */
        }
      } catch (_) {
        toast(t("pasteImageFail"));
      }
    };
    root.addEventListener("paste", onPaste, true);
    return () => root.removeEventListener("paste", onPaste, true);
  }
