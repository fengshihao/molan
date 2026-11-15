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
    if (!root) return;
    if (root.dataset.molanPreviewDblclick === "1") {
      ensureGestureHint();
      return;
    }
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
    ensureGestureHint();
  }

  const GESTURE_HINT_KEY = "molan-gesture-hint";

  function gestureHintDismissed() {
    try { return localStorage.getItem(GESTURE_HINT_KEY) === "off"; }
    catch (_) { return false; }
  }

  function dismissGestureHint() {
    try { localStorage.setItem(GESTURE_HINT_KEY, "off"); }
    catch (_) { /* ignore */ }
    document.getElementById("molanGestureHint")?.remove();
  }

  function ensureGestureHint() {
    const preview = document.getElementById("molanPreview") || document.querySelector(".molan-preview");
    if (!preview) return;
    const modeBtn = document.getElementById("modeBtn");
    const canEdit = !document.body.classList.contains("is-readonly")
      && !(modeBtn && (modeBtn.hidden || modeBtn.disabled));
    if (!canEdit || gestureHintDismissed()) {
      document.getElementById("molanGestureHint")?.remove();
      return;
    }
    let bar = document.getElementById("molanGestureHint");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "molanGestureHint";
      bar.className = "molan-gesture-hint";
      bar.setAttribute("role", "note");
      bar.innerHTML = `<p></p><button type="button" class="molan-gesture-hint__close"></button>`;
      bar.querySelector("button").addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        dismissGestureHint();
      });
      preview.insertBefore(bar, preview.firstChild);
    }
    const alt = isApplePlatform() ? "Option" : "Alt";
    bar.querySelector("p").textContent = t("gestureHint", { alt, mod: primaryModPrefix() });
    const closeBtn = bar.querySelector("button");
    closeBtn.textContent = t("gestureHintClose");
    closeBtn.setAttribute("aria-label", t("gestureHintClose"));
  }
