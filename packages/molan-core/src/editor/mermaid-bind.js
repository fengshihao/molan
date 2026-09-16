  /* --- mermaid-bind: 流程图交互绑定与 i18n 刷新 --- */
  function watchMermaidPreviews(rootId = "vditor") {
    const root = typeof rootId === "string" ? document.getElementById(rootId) : rootId;
    if (!root) return;
    enhanceMermaidPreviews(root);
    if (diagramObserver) return;
    let raf = 0;
    diagramObserver = new MutationObserver((mutations) => {
      let added = false;
      for (const m of mutations) {
        if (!m.addedNodes.length) continue;
        added = true;
        m.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          if (node.matches?.(".language-mermaid")) captureMermaidSource(node);
          node.querySelectorAll?.(".language-mermaid")?.forEach(captureMermaidSource);
        });
      }
      if (!added) return;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        clearTimeout(watchMermaidPreviews._t);
        watchMermaidPreviews._t = setTimeout(() => {
          const ir = root.querySelector?.(".vditor-ir") || null;
          const needsPaint = ir && mermaidDisplayHosts(ir).some(mermaidHostNeedsPaint);
          if (needsPaint) refreshMermaidDiagrams(ir);
          else enhanceMermaidPreviews(root);
          scheduleFitTables(root);
        }, 120);
      });
    });
    diagramObserver.observe(root, { childList: true, subtree: true });
  }

  function bindMermaidInteractions(vditorRoot, getVditor, lightbox, ctx = {}) {
    lightbox.setOnEdit?.((shell) => {
      if (!shell) {
        toast(t("noMermaidSource"));
        return;
      }
      openMermaidEditorFromShell(shell, ctx, lightbox, vditorRoot, getVditor);
    });
    watchMermaidIrExpand(vditorRoot, ctx, lightbox, getVditor);

    const blockMermaidIrExpand = (e) => {
      if (e.target.closest("[data-molan-action]")) return;
      if (document.getElementById("molanMermaidEditor")) return;
      const node = e.target.closest('.vditor-ir__node[data-type="code-block"]');
      if (!node?.querySelector(".language-mermaid")) return;
      if (e.type === "mousedown" || e.type === "pointerdown") {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    vditorRoot.addEventListener("mousedown", blockMermaidIrExpand, true);
    vditorRoot.addEventListener("pointerdown", blockMermaidIrExpand, true);

    const blockMermaidPreviewExpand = (e) => {
      if (e.target.closest("[data-molan-action]")) return;
      if (document.getElementById("molanMermaidEditor")) return;
      const shell = findMermaidPreviewShell(e.target);
      if (!shell) return;
      if (shell.closest(".vditor-ir__node--expand")) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "click" || e.type === "pointerup") {
        if (ctx.getPreviewing?.()) {
          lightbox.openFromSvg(shell.querySelector("svg"));
          return;
        }
        openMermaidEditorFromShell(shell, ctx, lightbox, vditorRoot, getVditor);
      }
    };
    vditorRoot.addEventListener("mousedown", blockMermaidPreviewExpand, true);
    vditorRoot.addEventListener("pointerdown", blockMermaidPreviewExpand, true);
    vditorRoot.addEventListener("click", blockMermaidPreviewExpand, true);

    vditorRoot.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-molan-action]");
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const action = btn.getAttribute("data-molan-action");
      const shell = btn.closest(".vditor-ir__preview, pre, .language-mermaid");
      const svg = shell?.querySelector("svg");
      if (action === "edit") {
        openMermaidEditorFromShell(shell, ctx, lightbox, vditorRoot, getVditor);
        return;
      }
      if (action === "zoom") {
        lightbox.openFromSvg(svg);
        return;
      }
      if (action === "copy-image") {
        await copySvgAsPng(svg);
        return;
      }
      if (action === "copy-code") {
        const text = mermaidCopySource(shell, getVditor);
        if (!text) {
          toast(t("noMermaidSource"));
          return;
        }
        try {
          await copyTextToClipboard(text);
          toast(t("copiedMermaidCode"));
        } catch (err) {
          console.warn(err);
          toast(t("copyFail"));
        }
      }
    }, true);
  }

  function refreshI18n(root = document) {
    const actionKeys = {
      edit: "editSource",
      zoom: "viewDiagram",
      "copy-code": "copyCode",
      "copy-image": "copyImage",
    };
    root.querySelectorAll("[data-molan-action]").forEach((btn) => {
      const key = actionKeys[btn.getAttribute("data-molan-action")];
      if (!key) return;
      const label = t(key);
      btn.title = label;
      btn.setAttribute("aria-label", label);
    });
    const lightboxEdit = document.getElementById("lightboxEdit");
    if (lightboxEdit) {
      const label = t("mermaidEditorTitle");
      lightboxEdit.title = label;
      lightboxEdit.setAttribute("aria-label", label);
    }
    applyFindI18n();
    applyTypeI18n();
    applyThemeI18n();
    applyFormatBarI18n();
    applyEditorChromeI18n();
    applyExportI18n();
    if (activeBlockInsert && typeof activeBlockInsert.refreshI18n === "function") {
      activeBlockInsert.refreshI18n();
    }
    refreshTableToolbarI18n(root);
    const picker = document.getElementById("molanTablePicker");
    if (picker) {
      picker.setAttribute("aria-label", t("insertTable"));
      const on = picker.querySelector(".molan-table-picker__cell.is-on:last-of-type");
      const cols = Number(on?.getAttribute("data-col") || 3);
      const rows = Number(on?.getAttribute("data-row") || 3);
      const label = picker.querySelector(".molan-table-picker__label");
      if (label) label.textContent = t("tableSize", { cols, rows });
    }
  }
