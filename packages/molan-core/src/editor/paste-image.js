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

  function bindClipboardImagePaste(root, ctx) {
    if (!root || typeof ctx?.saveClipboardImage !== "function") return () => {};
    const onPaste = async (e) => {
      if (pasteTargetSkipsImageInsert(e.target)) return;
      const file = imageFileFromClipboard(e.clipboardData);
      if (!file) return;
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
