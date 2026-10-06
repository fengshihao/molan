  /* --- preview-dblclick: 预览里双击段落进入编辑 --- */
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
      const spot = captureReadingSpotFromBlock(block, e.clientY);
      if (!spot) return;
      e.preventDefault();
      e.stopPropagation();
      void handlers.enterEdit?.(spot);
    });
  }
