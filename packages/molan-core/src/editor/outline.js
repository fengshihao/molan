  /* --- outline: 大纲与顶栏 --- */
  const OUTLINE_ICON = '<svg class="icon-outline" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 6h16M8 12h12M8 18h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="4" cy="12" r="1.15" fill="currentColor"/><circle cx="4" cy="18" r="1.15" fill="currentColor"/></svg>';
  const OUTLINE_CLOSE_ICON = '<svg class="icon-outline-close" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  let outlineAnimToken = 0;
  let outlineCtx = null;

  function innerVditor(vditor) {
    return vditor?.vditor || vditor || null;
  }

  function vditorOutlineEl() {
    return document.querySelector(".vditor-outline");
  }

  function outlineIsOpen() {
    const el = vditorOutlineEl();
    if (!el) return false;
    return el.style.display === "block" && !el.classList.contains("is-out");
  }

  const UNDO_ICON = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 8H4V4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.4 13A8 8 0 1 0 6 6.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
  const REDO_ICON = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M16 8h4V4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M19.6 13A8 8 0 1 1 18 6.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';

  function applyEditorChromeI18n() {
    applySourceViewI18n();
    const outlineBtn = document.getElementById("outlineBtn");
    if (outlineBtn) {
      const label = t(outlineBtn.classList.contains("is-on") ? "outlineCloseAria" : "outlineAria");
      outlineBtn.title = label;
      outlineBtn.setAttribute("aria-label", label);
    }
    const undoBtn = document.getElementById("undoBtn");
    if (undoBtn) {
      const label = t("undo");
      undoBtn.title = label;
      undoBtn.setAttribute("aria-label", label);
    }
    const redoBtn = document.getElementById("redoBtn");
    if (redoBtn) {
      const label = t("redo");
      redoBtn.title = label;
      redoBtn.setAttribute("aria-label", label);
    }
  }

  function nativeHistoryEnabled(type) {
    const root = outlineCtx?.getVditorRoot?.();
    const native = root?.querySelector(`.vditor-toolbar [data-type="${type}"]`);
    if (!native) return false;
    return !native.classList.contains("vditor-menu--disabled");
  }

  function syncHistoryChrome() {
    const undoBtn = document.getElementById("undoBtn");
    const redoBtn = document.getElementById("redoBtn");
    if (!undoBtn && !redoBtn) return;
    const previewing = outlineCtx?.getPreviewing?.() ?? true;
    const vditor = outlineCtx?.getVditor?.();
    const docUndo = !!outlineCtx?.canUndoDoc?.();
    const docRedo = !!outlineCtx?.canRedoDoc?.();
    const editUndo = !previewing && !sourceOpen && !!vditor && nativeHistoryEnabled("undo");
    const editRedo = !previewing && !sourceOpen && !!vditor && nativeHistoryEnabled("redo");
    if (undoBtn) undoBtn.disabled = !(docUndo || editUndo);
    if (redoBtn) redoBtn.disabled = !(docRedo || editRedo);
  }

  function runHistory(type) {
    const previewing = outlineCtx?.getPreviewing?.() ?? true;
    const vditor = outlineCtx?.getVditor?.();
    if (previewing || sourceOpen || !vditor) {
      if (type === "undo") outlineCtx?.undoDoc?.();
      else outlineCtx?.redoDoc?.();
      return;
    }
    if (nativeHistoryEnabled(type)) {
      const root = outlineCtx?.getVditorRoot?.();
      const native = root?.querySelector(`.vditor-toolbar [data-type="${type}"]`);
      native?.click();
      window.setTimeout(syncHistoryChrome, 80);
      return;
    }
    if (type === "undo") outlineCtx?.undoDoc?.();
    else outlineCtx?.redoDoc?.();
  }

  const OUTLINE_BTN_HTML = `<button type="button" class="icon-btn" id="outlineBtn" aria-haspopup="true" aria-expanded="false">${OUTLINE_ICON}${OUTLINE_CLOSE_ICON}</button>`;

  function mountOutlinePrefs(outlineWrap) {
    outlineWrap.className = "molan-outline-prefs";
    outlineWrap.removeAttribute("style");
    const btn = outlineWrap.querySelector("#outlineBtn");
    if (btn) {
      btn.className = "icon-btn";
      btn.removeAttribute("style");
    }
    const header = document.querySelector(".reader-header");
    const title = header?.querySelector(".reader-title");
    const actions = document.querySelector(".reader-actions");
    // 跟标题同一行，不要浮在纸面上：否则会和行首「+」重叠。
    if (header) {
      header.insertBefore(outlineWrap, title || actions || null);
      return;
    }
    if (actions) actions.insertBefore(outlineWrap, actions.firstChild);
  }

  function ensureOutlinePanel() {
    let panel = vditorOutlineEl();
    if (panel) return panel;
    const wrap = document.getElementById("editorWrap") || document.querySelector(".editor-wrap");
    if (!wrap) return null;
    panel = document.createElement("div");
    panel.className = "vditor-outline";
    panel.style.display = "none";
    panel.innerHTML = '<div class="vditor-outline__title">大纲</div><ul></ul>';
    wrap.insertBefore(panel, wrap.firstChild);
    return panel;
  }

  function escapeOutlineText(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** 预览态用 lite DOM 抽标题，避免 hydrate 拉满血 IR 编辑器 */
  function renderLiteOutline() {
    const panel = ensureOutlinePanel();
    if (!panel) return panel;
    const preview =
      document.getElementById("molanPreviewBody") ||
      document.querySelector(".molan-preview");
    const heads = preview
      ? [...preview.querySelectorAll("h1, h2, h3, h4, h5, h6")]
      : [];
    let ul = panel.querySelector(":scope > ul");
    if (!ul) {
      ul = document.createElement("ul");
      panel.appendChild(ul);
    }
    if (!panel.querySelector(".vditor-outline__title")) {
      const title = document.createElement("div");
      title.className = "vditor-outline__title";
      title.textContent = "大纲";
      panel.insertBefore(title, ul);
    }
    ul.innerHTML = heads
      .map((h, i) => {
        const level = Number(h.tagName.slice(1)) || 1;
        return `<li data-level="${level}"><span data-target-id="lite-${i}">${escapeOutlineText(h.textContent)}</span></li>`;
      })
      .join("");
    return panel;
  }

  let outlineRefreshTimer = 0;

  function scheduleOutlineRefresh() {
    if (!outlineIsOpen()) return;
    clearTimeout(outlineRefreshTimer);
    outlineRefreshTimer = window.setTimeout(() => {
      refreshOutline();
    }, 200);
  }

  async function refreshOutline() {
    if (!outlineIsOpen()) return;
    if (outlineCtx?.getPreviewing?.()) {
      renderLiteOutline();
      relocateVditorOutline();
      return;
    }
    const inner = innerVditor(outlineCtx?.getVditor?.());
    relocateVditorOutline();
    try { inner?.outline?.render?.(inner); } catch (_) { /* ignore */ }
  }

  function setOutlineFab(open) {
    const btn = document.getElementById("outlineBtn");
    const dock = document.getElementById("outlinePrefs");
    dock?.classList.toggle("is-open", !!open);
    btn?.classList.toggle("is-on", !!open);
    btn?.setAttribute("aria-expanded", open ? "true" : "false");
    applyEditorChromeI18n();
  }

  function relocateVditorOutline() {
    const wrap = document.getElementById("editorWrap") || document.querySelector(".editor-wrap");
    const panel = vditorOutlineEl();
    if (!wrap || !panel) return panel;
    if (panel.parentElement !== wrap) wrap.insertBefore(panel, wrap.firstChild);
    wrap.classList.toggle("is-outline-open", outlineIsOpen());
    return panel;
  }

  function setVditorOutline(show) {
    const inner = innerVditor(outlineCtx?.getVditor?.());
    let panel = inner?.outline?.element || vditorOutlineEl();
    if (!panel && show && outlineCtx?.getPreviewing?.()) {
      panel = renderLiteOutline();
    }
    if (!panel) return;
    relocateVditorOutline();
    const wrap = document.getElementById("editorWrap") || document.querySelector(".editor-wrap");
    panel.classList.remove("is-in", "is-out");
    if (show) {
      panel.style.display = "block";
      wrap?.classList.add("is-outline-open");
      if (!outlineCtx?.getPreviewing?.()) {
        try { inner?.outline?.render?.(inner); } catch (_) { /* ignore */ }
        inner?.toolbar?.elements?.outline?.firstElementChild?.classList.add("vditor-menu--current");
      }
    } else {
      panel.style.display = "none";
      wrap?.classList.remove("is-outline-open");
      inner?.toolbar?.elements?.outline?.firstElementChild?.classList.remove("vditor-menu--current");
    }
    setOutlineFab(show);
  }

  function closeOutline(instant) {
    const panel = vditorOutlineEl();
    if (!outlineIsOpen()) {
      setOutlineFab(false);
      return;
    }
    const finish = () => {
      setVditorOutline(false);
    };
    if (instant || prefersReducedMotion() || !panel) {
      outlineAnimToken += 1;
      finish();
      return;
    }
    const token = ++outlineAnimToken;
    panel.classList.remove("is-in");
    panel.classList.add("is-out");
    setOutlineFab(false);
    const done = () => {
      if (token !== outlineAnimToken) return;
      finish();
    };
    panel.addEventListener("animationend", (e) => {
      if (e.target === panel) done();
    }, { once: true });
    window.setTimeout(done, 400);
  }

  async function openOutline() {
    if (outlineCtx?.getPreviewing?.()) {
      renderLiteOutline();
    } else {
      await outlineCtx?.hydrateVditor?.();
    }
    relocateVditorOutline();
    outlineAnimToken += 1;
    const wrap = document.getElementById("editorWrap") || document.querySelector(".editor-wrap");
    const wasOpen = wrap?.classList.contains("is-outline-open");
    const closing = vditorOutlineEl()?.classList.contains("is-out");
    setVditorOutline(true);
    const shown = vditorOutlineEl();
    if (shown && !wasOpen && !closing) {
      shown.classList.remove("is-in");
      void shown.offsetWidth;
      shown.classList.add("is-in");
    } else if (shown) {
      shown.classList.add("is-in");
    }
  }

  function ensureEditorChrome(ctx) {
    const actions = document.querySelector(".reader-actions");
    const editorWrap = document.getElementById("editorWrap") || document.querySelector(".editor-wrap");
    const modeBtn = document.getElementById("modeBtn");
    const anchor = actions && modeBtn && modeBtn.parentElement === actions
      ? modeBtn.nextSibling
      : (document.getElementById("typePrefs") || document.getElementById("headerPrefs") || null);

    document.getElementById("editModePrefs")?.remove();

    if (actions) {
      let historyWrap = document.getElementById("historyPrefs");
      if (!historyWrap) {
        historyWrap = document.createElement("div");
        historyWrap.id = "historyPrefs";
        historyWrap.className = "molan-chrome-prefs";
        historyWrap.innerHTML = `
          <button type="button" class="icon-btn" id="undoBtn" disabled>${UNDO_ICON}</button>
          <button type="button" class="icon-btn" id="redoBtn" disabled>${REDO_ICON}</button>
        `;
      }
      const findBtn = document.getElementById("molanFindBtn");
      const copyBtn = document.getElementById("copyBtn");
      if (historyWrap.parentElement !== actions) {
        if (findBtn && findBtn.parentElement === actions) findBtn.after(historyWrap);
        else if (copyBtn && copyBtn.parentElement === actions) actions.insertBefore(historyWrap, copyBtn);
        else actions.insertBefore(historyWrap, actions.firstChild);
      }

      let sourceWrap = document.getElementById("sourceViewPrefs");
      if (!sourceWrap) {
        sourceWrap = document.createElement("div");
        sourceWrap.id = "sourceViewPrefs";
        sourceWrap.className = "molan-chrome-prefs";
        sourceWrap.innerHTML = `
          <button type="button" class="icon-btn" id="sourceViewBtn" aria-pressed="false">${SOURCE_ICON}</button>
        `;
      }
      const afterCopy = copyBtn && copyBtn.parentElement === actions ? copyBtn.nextSibling : null;
      if (sourceWrap.parentElement !== actions) {
        if (afterCopy) actions.insertBefore(sourceWrap, afterCopy);
        else if (anchor) actions.insertBefore(sourceWrap, anchor);
        else actions.appendChild(sourceWrap);
      }
    }

    {
      let outlineWrap = document.getElementById("outlinePrefs");
      if (!outlineWrap) {
        outlineWrap = document.createElement("div");
        outlineWrap.id = "outlinePrefs";
        outlineWrap.innerHTML = OUTLINE_BTN_HTML;
      } else if (!outlineWrap.querySelector("#outlineBtn") || !outlineWrap.querySelector(".icon-outline-close")) {
        outlineWrap.innerHTML = OUTLINE_BTN_HTML;
      }
      outlineWrap.querySelector("#outlineMenu")?.remove();
      mountOutlinePrefs(outlineWrap);
    }

    outlineCtx = ctx;
    sourceCtx = ctx;
    ensureSourcePanel();
    const sourceBtn = document.getElementById("sourceViewBtn");
    const outlineBtn = document.getElementById("outlineBtn");
    applyEditorChromeI18n();
    syncHistoryChrome();
    if (sourceOpen) fillSourceText();

    const undoBtn = document.getElementById("undoBtn");
    const redoBtn = document.getElementById("redoBtn");
    if (undoBtn && !undoBtn.dataset.bound) {
      undoBtn.dataset.bound = "1";
      undoBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        runHistory("undo");
      });
    }
    if (redoBtn && !redoBtn.dataset.bound) {
      redoBtn.dataset.bound = "1";
      redoBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        runHistory("redo");
      });
    }

    if (sourceBtn && !sourceBtn.dataset.bound) {
      sourceBtn.dataset.bound = "1";
      sourceBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleSourceView();
      });
    }

    if (outlineBtn && !outlineBtn.dataset.bound) {
      outlineBtn.dataset.bound = "1";
      outlineBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const panel = vditorOutlineEl();
        if (panel?.classList.contains("is-out")) closeOutline(true);
        if (outlineIsOpen()) closeOutline();
        else openOutline();
      });
    }

    if (editorWrap && !editorWrap.dataset.previewJump) {
      editorWrap.dataset.previewJump = "1";
      editorWrap.addEventListener("click", (e) => {
        const span = e.target.closest(".vditor-outline [data-target-id]");
        if (!span) return;
        const items = [...(span.closest(".vditor-outline")?.querySelectorAll("[data-target-id]") || [])];
        const index = items.indexOf(span);
        if (sourceOpen) {
          e.preventDefault();
          e.stopPropagation();
          scrollSourceToHeading(index, span.textContent);
          return;
        }
        if (!outlineCtx?.getPreviewing?.()) return;
        e.preventDefault();
        e.stopPropagation();
        scrollToHeading(index);
      }, true);
    }

    if (!ensureEditorChrome._bound) {
      ensureEditorChrome._bound = true;
      document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        if (sourceOpen) {
          e.preventDefault();
          closeSourceView();
          return;
        }
        closeOutline();
      });
      document.addEventListener("keydown", (e) => {
        if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
        if (String(e.key).toLowerCase() !== "z") return;
        if (e.target?.closest?.("input, textarea")) return;
        if (!outlineCtx?.getPreviewing?.() && !sourceOpen) return;
        const wantRedo = !!e.shiftKey;
        if (wantRedo ? !outlineCtx?.canRedoDoc?.() : !outlineCtx?.canUndoDoc?.()) return;
        e.preventDefault();
        runHistory(wantRedo ? "redo" : "undo");
      });
      // Cmd/Ctrl+E：点顶栏阅读/编辑按钮；VS Code / Cursor 由扩展命令注入，避免双次切换
      document.addEventListener("keydown", (e) => {
        if (e.shiftKey || e.altKey) return;
        if (String(e.key || "").toLowerCase() !== "e") return;
        if (!(e.metaKey || e.ctrlKey)) return;
        if (document.documentElement.classList.contains("molan-host-vscode")
          || document.body.classList.contains("molan-host-vscode")) {
          return;
        }
        if (typeof isPrimaryModKey === "function" && !isPrimaryModKey(e, "e")) return;
        if (e.target?.closest?.("input, textarea, select")) return;
        const blocked = e.target?.closest?.(
          ".molan-find-bar, .molan-image-url-mask, .molan-feedback, .molan-mermaid-editor, .lightbox",
        );
        if (blocked) return;
        const modeBtn = document.getElementById("modeBtn");
        if (!modeBtn || modeBtn.hidden || modeBtn.disabled) return;
        e.preventDefault();
        e.stopPropagation();
        modeBtn.click();
      }, true);
    }
  }
