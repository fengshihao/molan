  /* --- export: 导出 PDF/PNG 与 window.MolanEditor --- */
  function applyExportI18n() {
    const btn = document.getElementById("pdfBtn");
    const menu = document.getElementById("exportMenu");
    const label = t("exportAria");
    if (btn) {
      btn.title = label;
      btn.setAttribute("aria-label", label);
    }
    if (menu) menu.setAttribute("aria-label", label);
    menu?.querySelectorAll("[data-export]").forEach((el) => {
      const key = el.getAttribute("data-export") === "png" ? "exportPng" : "exportPdf";
      el.textContent = t(key);
    });
  }

  function exportMenuIsOpen() {
    const menu = document.getElementById("exportMenu");
    return !!(menu && !menu.hidden);
  }

  function openExportMenu() {
    closeType();
    closeHeaderPrefs();
    const menu = document.getElementById("exportMenu");
    const btn = document.getElementById("pdfBtn");
    if (!menu || !btn) return;
    menu.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    btn.classList.add("is-on");
  }

  function closeExportMenu() {
    const menu = document.getElementById("exportMenu");
    const btn = document.getElementById("pdfBtn");
    if (menu) menu.hidden = true;
    btn?.setAttribute("aria-expanded", "false");
    btn?.classList.remove("is-on");
  }

  function toggleExportMenu() {
    if (exportMenuIsOpen()) closeExportMenu();
    else openExportMenu();
  }

  function waitFrame() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
  }

  function waitFonts() {
    try {
      if (document.fonts?.ready) {
        return Promise.race([
          document.fonts.ready,
          new Promise((resolve) => setTimeout(resolve, 1500)),
        ]);
      }
    } catch (_) { /* ignore */ }
    return Promise.resolve();
  }

  function printDocumentTitle() {
    const name = (document.getElementById("readerTitle")?.textContent || "").trim();
    if (name && name !== "墨览") return name;
    return document.title || "墨览";
  }

  function isUnsafePrintHost() {
    if (typeof window.acquireVsCodeApi === "function") return true;
    if (isVscodeHost()) return true;
    if (location.protocol === "vscode-webview:") return true;
    const ua = navigator.userAgent || "";
    if (/Cursor\//i.test(ua) || /\bElectron\b/i.test(ua)) return true;
    try {
      const origins = location.ancestorOrigins;
      if (origins) {
        for (let i = 0; i < origins.length; i += 1) {
          if (/vscode|cursor/i.test(origins[i] || "")) return true;
        }
      }
    } catch (_) { /* ignore */ }
    return false;
  }

  /** Mac/iOS 用 ⌘，Windows/Linux 用 Ctrl（与 VS Code / 系统快捷键一致） */
  function isApplePlatform() {
    const platform = navigator.platform || "";
    if (/Mac|iPhone|iPad|iPod/i.test(platform)) return true;
    try {
      if (navigator.userAgentData?.platform === "macOS") return true;
    } catch (_) { /* ignore */ }
    return /Mac OS X|Macintosh/i.test(navigator.userAgent || "");
  }

  function isPrimaryModKey(e, key) {
    if (e.key.toLowerCase() !== key || e.shiftKey || e.altKey) return false;
    if (isApplePlatform()) return e.metaKey && !e.ctrlKey;
    return e.ctrlKey && !e.metaKey;
  }

  function safeFileName(name) {
    return String(name || "document").replace(/[\\/:*?"<>|]+/g, "_").trim() || "document";
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function collectSameOriginCss() {
    const out = [];
    const sheets = document.styleSheets || [];
    for (let i = 0; i < sheets.length; i += 1) {
      try {
        const rules = sheets[i].cssRules;
        if (!rules) continue;
        for (let j = 0; j < rules.length; j += 1) out.push(rules[j].cssText);
      } catch (_) { /* cross-origin */ }
    }
    return out.join("\n");
  }

  function readerCssVars() {
    try {
      const s = getComputedStyle(document.documentElement);
      return [
        "--reader-size",
        "--reader-leading",
        "--reader-gap",
        "--reader-tracking",
        "--reader-font",
        "--reader-heading",
      ].map((key) => `${key}:${s.getPropertyValue(key) || ""};`).join("");
    } catch (_) {
      return "";
    }
  }

  function clonePreviewHtml() {
    const src = document.getElementById("molanPreviewBody") || document.getElementById("molanPreview");
    if (!src) return "";
    const clone = src.cloneNode(true);
    clone.querySelectorAll?.("script, .molan-diagram-toolbar, .molan-block-insert, .molan-insert-menu")
      ?.forEach((el) => el.remove());
    return clone.innerHTML || "";
  }

  function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function downloadPrintableHtml() {
    const title = printDocumentTitle();
    const body = clonePreviewHtml();
    if (!body.trim()) return false;
    const css = collectSameOriginCss();
    const html = `<!DOCTYPE html>
<html class="molan-print-doc" lang="${document.documentElement.lang || "zh-CN"}" data-theme="xuan">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    html { ${readerCssVars()} }
    html, body { background: #f4efe6; color: #1c1914; margin: 0; }
    body { max-width: 42rem; margin: 24px auto; padding: 0 20px 48px; }
    .molan-diagram-toolbar, .molan-block-insert, .molan-insert-menu { display: none !important; }
    ${css}
    html.molan-print-doc, html.molan-print-doc body {
      height: auto !important;
      max-height: none !important;
      overflow: visible !important;
    }
    html.molan-print-doc .molan-preview,
    html.molan-print-doc .vditor-reset {
      display: block !important;
      height: auto !important;
      max-height: none !important;
      overflow: visible !important;
    }
    @media print {
      html.molan-print-doc body {
        max-width: none !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      html.molan-print-doc pre,
      html.molan-print-doc table,
      html.molan-print-doc blockquote {
        break-inside: auto !important;
        page-break-inside: auto !important;
      }
      html.molan-print-doc pre,
      html.molan-print-doc table,
      html.molan-print-doc .vditor-reset {
        overflow: visible !important;
      }
      html.molan-print-doc .vditor-reset table {
        width: 100% !important;
        max-width: 100% !important;
        table-layout: auto !important;
        border-collapse: collapse !important;
      }
      html.molan-print-doc img,
      html.molan-print-doc .molan-mermaid-shell,
      html.molan-print-doc .molan-mermaid-shell svg {
        max-width: 100% !important;
        max-height: 220mm !important;
        height: auto !important;
        break-inside: avoid !important;
      }
    }
  </style>
</head>
<body>
  <div class="molan-preview vditor-preview">
    <div class="vditor-reset">${body}</div>
  </div>
  <script>
    (function () {
      var ua = navigator.userAgent || "";
      if (/Cursor\\/|Electron\\b/i.test(ua) || typeof window.acquireVsCodeApi === "function") return;
      window.addEventListener("load", function () {
        setTimeout(function () { window.print(); }, 280);
      });
    })();
  </script>
</body>
</html>`;
    downloadBlob(`${safeFileName(title)}.html`, new Blob([html], { type: "text/html;charset=utf-8" }));
    return true;
  }

  function isolatePreviewForPrint() {
    const preview = document.getElementById("molanPreview");
    if (!preview || preview.parentElement === document.body) return () => {};
    const parent = preview.parentNode;
    const next = preview.nextSibling;
    preview.classList.add("is-print-root");
    document.body.appendChild(preview);
    return () => {
      preview.classList.remove("is-print-root");
      if (!parent?.isConnected) return;
      if (next && next.parentNode === parent) parent.insertBefore(preview, next);
      else parent.appendChild(preview);
    };
  }

  function closePrintChrome() {
    try { closeFind(); } catch (_) { /* ignore */ }
    try { closeType(); } catch (_) { /* ignore */ }
    try { closeHeaderPrefs(); } catch (_) { /* ignore */ }
    try { closeSourceView(); } catch (_) { /* ignore */ }
    try { closeOutline(true); } catch (_) { /* ignore */ }
    try { hideFormatBar(); } catch (_) { /* ignore */ }
    try { hideTableToolbar(document.getElementById("molanTableToolbar")); } catch (_) { /* ignore */ }
    try { closeExportMenu(); } catch (_) { /* ignore */ }
    document.getElementById("molanMermaidEditor")?.remove();
    document.getElementById("molanImageUrlMask")?.remove();
    const lightbox = document.getElementById("lightbox");
    if (lightbox) {
      lightbox.classList.remove("open");
      lightbox.setAttribute("aria-hidden", "true");
    }
  }

  function hasMermaidToRestyle() {
    const md = lastEditorApi && typeof lastEditorApi.getValue === "function"
      ? lastEditorApi.getValue()
      : "";
    return markdownHasMermaid(md) || !!document.querySelector(".language-mermaid svg, .molan-mermaid-shell svg");
  }

  async function waitForMermaidReady() {
    if (!hasMermaidToRestyle()) return;
    const deadline = Date.now() + 4000;
    while (Date.now() < deadline) {
      if (global.mermaid && typeof mermaid.render === "function") {
        try { await refreshMermaidDiagrams(mermaidRoot()); } catch (_) { /* ignore */ }
        if (document.querySelector(".language-mermaid svg, .molan-mermaid-shell svg")) return;
      }
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
  }

  function waitAfterPrint() {
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        window.removeEventListener("afterprint", finish);
        try { media.removeEventListener("change", onMedia); } catch (_) {
          try { media.removeListener(onMedia); } catch (__) { /* ignore */ }
        }
        resolve();
      };
      const onMedia = (e) => {
        if (!e.matches) finish();
      };
      const media = window.matchMedia("print");
      try { media.addEventListener("change", onMedia); } catch (_) {
        try { media.addListener(onMedia); } catch (__) { /* ignore */ }
      }
      window.addEventListener("afterprint", finish);
      setTimeout(finish, 120000);
    });
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  async function inlineImages(root) {
    const imgs = Array.from(root.querySelectorAll?.("img") || []);
    await Promise.all(imgs.map(async (img) => {
      const src = img.getAttribute("src") || "";
      if (!src || src.startsWith("data:")) return;
      try {
        const res = await fetch(src);
        const blob = await res.blob();
        img.setAttribute("src", await blobToDataUrl(blob));
      } catch (_) { /* leave original src */ }
    }));
    root.querySelectorAll?.("svg")?.forEach((svg) => {
      if (!svg.getAttribute("xmlns")) svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    });
  }

  async function rasterizePreviewPng() {
    const src = document.getElementById("molanPreviewBody") || document.getElementById("molanPreview");
    if (!src) return null;
    const width = Math.max(1, Math.ceil(Math.max(src.scrollWidth, src.clientWidth)));
    const height = Math.max(1, Math.ceil(Math.max(src.scrollHeight, src.clientHeight)));
    const maxEdge = 8192;
    const scale = Math.min(2, maxEdge / width, maxEdge / height);
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));

    const clone = src.cloneNode(true);
    clone.querySelectorAll?.("script, .molan-diagram-toolbar, .molan-block-insert, .molan-insert-menu")
      ?.forEach((el) => el.remove());
    await inlineImages(clone);

    const root = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
    root.setAttribute("data-theme", "xuan");
    root.setAttribute("style", `width:${width}px;background:#f4efe6;color:#1c1914;${readerCssVars()}`);
    const style = document.createElementNS("http://www.w3.org/1999/xhtml", "style");
    style.textContent = `${collectSameOriginCss()}
      .molan-diagram-toolbar,.molan-block-insert,.molan-insert-menu{display:none!important}
      .molan-preview,#molanPreviewBody,.vditor-reset{overflow:visible!important;height:auto!important;max-height:none!important}`;
    root.appendChild(style);
    const preview = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
    preview.setAttribute("class", "molan-preview vditor-preview");
    preview.appendChild(clone);
    root.appendChild(preview);

    const xhtml = new XMLSerializer().serializeToString(root);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject x="0" y="0" width="${width}" height="${height}">${xhtml}</foreignObject></svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    try {
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("raster"));
        img.src = url;
      });
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.fillStyle = "#f4efe6";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(image, 0, 0, w, h);
      return await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function exportPng() {
    if (exportPdfBusy) return;
    const wrap = document.getElementById("editorWrap");
    if (!wrap?.classList.contains("visible")) {
      toast(t("exportPdfEmpty"));
      return;
    }
    exportPdfBusy = true;
    const btn = document.getElementById("pdfBtn");
    if (btn) btn.disabled = true;
    const prevTheme = document.documentElement.getAttribute("data-theme") || readStoredTheme();
    let restoreEdit = false;
    const cleanup = async () => {
      applyTheme(prevTheme, false);
      try { await refreshMermaidDiagrams(mermaidRoot()); } catch (_) { /* ignore */ }
      if (restoreEdit && lastEditorApi?.setPreview) {
        try { await lastEditorApi.setPreview(false); } catch (_) { /* ignore */ }
      }
      exportPdfBusy = false;
      if (btn) btn.disabled = false;
    };
    try {
      closePrintChrome();
      if (lastEditorApi?.isPreview && !lastEditorApi.isPreview()) {
        restoreEdit = true;
        await lastEditorApi.setPreview(true);
      }
      toast(t("exportPngPreparing"));
      if (prevTheme !== "xuan") {
        clearThemeTweakStyles();
        document.documentElement.setAttribute("data-theme", "xuan");
        loadThemeFonts("xuan");
        applyMermaidTheme();
      } else {
        clearThemeTweakStyles();
      }
      await waitForMermaidReady();
      await waitFonts();
      await waitFrame();
      const blob = await rasterizePreviewPng();
      if (!blob) {
        toast(t("exportPngFail"));
        return;
      }
      downloadBlob(`${safeFileName(printDocumentTitle())}.png`, blob);
    } catch (err) {
      console.warn(err);
      toast(t("exportPngFail"));
    } finally {
      await cleanup();
    }
  }

  let exportPdfBusy = false;

  async function exportPdf() {
    if (exportPdfBusy) return;
    const wrap = document.getElementById("editorWrap");
    const hasDoc = !!(wrap && wrap.classList.contains("visible"));
    if (!hasDoc) {
      toast(t("exportPdfEmpty"));
      return;
    }
    const unsafePrint = isUnsafePrintHost();
    if (!unsafePrint && typeof window.print !== "function") {
      toast(t("exportPdfFail"));
      return;
    }

    exportPdfBusy = true;
    const btn = document.getElementById("pdfBtn");
    if (btn) btn.disabled = true;

    const prevTitle = document.title;
    const prevTheme = document.documentElement.getAttribute("data-theme") || readStoredTheme();
    let restoreEdit = false;
    let restorePreview = () => {};

    const cleanup = async () => {
      try { restorePreview(); } catch (_) { /* ignore */ }
      document.documentElement.classList.remove("is-printing");
      document.body.classList.remove("is-printing");
      document.title = prevTitle;
      applyTheme(prevTheme, false);
      try { await refreshMermaidDiagrams(mermaidRoot()); } catch (_) { /* ignore */ }
      if (restoreEdit && lastEditorApi?.setPreview) {
        try { await lastEditorApi.setPreview(false); } catch (_) { /* ignore */ }
      }
      exportPdfBusy = false;
      if (btn) btn.disabled = false;
    };

    try {
      closePrintChrome();
      if (lastEditorApi?.isPreview && !lastEditorApi.isPreview()) {
        restoreEdit = true;
        await lastEditorApi.setPreview(true);
      }

      const needPaper = hasMermaidToRestyle() && prevTheme !== "xuan";
      if (needPaper) toast(t("exportPdfPreparing"));
      clearThemeTweakStyles();
      if (prevTheme !== "xuan") {
        document.documentElement.setAttribute("data-theme", "xuan");
        loadThemeFonts("xuan");
        applyMermaidTheme();
      }
      await waitForMermaidReady();
      await waitFonts();
      await waitFrame();

      if (unsafePrint) {
        if (!downloadPrintableHtml()) {
          toast(t("exportPdfFail"));
          return;
        }
        toast(t("exportPdfUseBrowser"));
        return;
      }

      restorePreview = isolatePreviewForPrint();
      document.title = printDocumentTitle();
      document.documentElement.classList.add("is-printing");
      document.body.classList.add("is-printing");
      await waitFrame();

      const printed = waitAfterPrint();
      window.print();
      await printed;
    } catch (err) {
      console.warn(err);
      toast(t("exportPdfFail"));
    } finally {
      await cleanup();
    }
  }

  global.MolanEditor = {
    DEFAULT_CDN,
    create,
    toast,
    countWords,
    exportPdf,
    exportPng,
    escapeMdAlt,
    applyMermaidTheme,
    refreshMermaidDiagrams,
    refreshI18n,
    enhanceMermaidPreviews,
    watchMermaidPreviews,
    buildTableMarkdown,
    svgToPngBlob,
    copySvgAsPng,
    copyText: copyTextToClipboard,
    mermaidCopySource,
    find: {
      open: openFind,
      close: closeFind,
      next() { moveFind(1); },
      prev() { moveFind(-1); },
    },
    type: {
      open: openType,
      close: closeType,
    },
    prefs: {
      open: openHeaderPrefs,
      close: closeHeaderPrefs,
    },
    outline: {
      close: closeOutline,
    },
    source: {
      open: openSourceView,
      close: closeSourceView,
      toggle: toggleSourceView,
      isOpen: () => sourceOpen,
    },
  };

  applyStoredType();
  document.addEventListener("click", (e) => {
    const item = e.target?.closest?.("[data-export]");
    if (item && item.closest("#exportMenu")) {
      e.preventDefault();
      const kind = item.getAttribute("data-export");
      closeExportMenu();
      if (kind === "png") void exportPng();
      else void exportPdf();
      return;
    }
    if (e.target?.closest?.("#pdfBtn")) {
      e.preventDefault();
      toggleExportMenu();
      return;
    }
    if (!e.target?.closest?.(".export-prefs")) closeExportMenu();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && exportMenuIsOpen()) {
      e.preventDefault();
      closeExportMenu();
      document.getElementById("pdfBtn")?.focus();
      return;
    }
    // VS Code/Cursor：⌘/Ctrl+P 是 Quick Open，绝不能当成打印
    if (isUnsafePrintHost()) return;
    if (!isPrimaryModKey(e, "p")) return;
    if (e.defaultPrevented) return;
    if (!document.getElementById("editorWrap")?.classList.contains("visible")) return;
    e.preventDefault();
    void exportPdf();
  });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initFind();
      initType();
      initTheme();
      initHeaderPrefs();
      applyExportI18n();
    });
  } else {
    initFind();
    initType();
    initTheme();
    initHeaderPrefs();
    applyExportI18n();
  }
