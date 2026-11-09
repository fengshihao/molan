  /* --- preview-dblclick: 预览里双击选中段落；Alt+双击进入编辑 --- */
  function selectPreviewBlock(block) {
    if (!block) return;
    const range = document.createRange();
    try {
      range.selectNodeContents(block);
    } catch (_) {
      return;
    }
    const sel = window.getSelection();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function bindPreviewDblclickEdit(root, handlers) {
    if (!root || root.dataset.molanPreviewDblclick === "1") return;
    root.dataset.molanPreviewDblclick = "1";

    const blocked = [
      "input, textarea, select, button",
      ".molan-block-insert, .molan-insert-menu",
      ".molan-diagram-toolbar",
      ".vditor-copy",
      ".lightbox",
      ".molan-mermaid-editor",
      ".molan-find-bar",
      ".molan-image-url-mask",
      ".molan-feedback",
    ].join(", ");

    root.addEventListener("dblclick", (e) => {
      if (!handlers.isPreviewing?.()) return;
      if (document.body.classList.contains("is-readonly")) return;
      if (e.target?.closest?.(blocked)) return;
      const modeBtn = document.getElementById("modeBtn");
      if (modeBtn && (modeBtn.hidden || modeBtn.disabled)) return;
      const block = closestTopBlock(e.target, root);
      if (!block) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.altKey) {
        const spot = captureReadingSpotFromBlock(block, e.clientY);
        if (!spot) return;
        void handlers.enterEdit?.(spot);
        return;
      }
      selectPreviewBlock(block);
    });
  }
