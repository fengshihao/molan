  /* --- source: 原文面板 --- */
  const SOURCE_ICON = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 7.5 4.5 12 9 16.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 7.5 19.5 12 15 16.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function scrollToHeading(index) {
    const wrap = document.getElementById("editorWrap") || document.querySelector(".editor-wrap");
    if (!wrap || index == null || index < 0) return;
    const el = wrap.querySelector(".molan-preview h1, .molan-preview h2, .molan-preview h3, .molan-preview h4, .molan-preview h5, .molan-preview h6")
      ?.parentElement?.closest(".molan-preview")
      ? [...wrap.querySelectorAll(".molan-preview h1, .molan-preview h2, .molan-preview h3, .molan-preview h4, .molan-preview h5, .molan-preview h6")][index]
      : null;
    el?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  function markdownHeadings(md) {
    const lines = String(md || "").split("\n");
    const heads = [];
    let fence = "";
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (fence) {
        if (line.startsWith(fence)) fence = "";
        continue;
      }
      const open = line.match(/^(`{3,}|~{3,})/);
      if (open) {
        fence = open[1][0].repeat(open[1].length);
        continue;
      }
      const atx = line.match(/^(#{1,6})\s+(.+?)\s*$/);
      if (atx) heads.push({ line: i, text: atx[2].replace(/\s+#+\s*$/, "").trim() });
    }
    return heads;
  }

  function headingKey(text) {
    return String(text || "").replace(/[`*_~]/g, "").replace(/\s+/g, " ").trim();
  }

  function textareaLineMetrics(textarea) {
    const cs = getComputedStyle(textarea);
    const lh = parseFloat(cs.lineHeight);
    const lineHeight = Number.isFinite(lh) && lh > 0 ? lh : (parseFloat(cs.fontSize) || 14) * 1.65;
    const pad = parseFloat(cs.paddingTop) || 0;
    return { lineHeight, pad };
  }

  function jumpTextareaToLine(textarea, lineIndex, viewportOffset) {
    if (!textarea || lineIndex == null || lineIndex < 0) return;
    const value = textarea.value;
    const lines = value.split("\n");
    let pos = 0;
    for (let i = 0; i < lineIndex && i < lines.length; i++) pos += lines[i].length + 1;
    const end = pos + (lines[lineIndex]?.length ?? 0);
    const { lineHeight, pad } = textareaLineMetrics(textarea);
    const offset = typeof viewportOffset === "number"
      ? viewportOffset
      : textarea.clientHeight * 0.28;
    textarea.focus({ preventScroll: true });
    textarea.setSelectionRange(pos, end);
    textarea.scrollTop = Math.max(0, pad + lineIndex * lineHeight - offset);
  }

  function scrollTextareaToRatio(textarea, ratio) {
    if (!textarea || typeof ratio !== "number") return;
    const max = Math.max(0, textarea.scrollHeight - textarea.clientHeight);
    textarea.focus({ preventScroll: true });
    textarea.scrollTop = Math.max(0, Math.min(max, max * ratio));
  }

  function scrollSourceToHeading(index, title) {
    const { text } = sourceEls();
    if (!text) return;
    const heads = markdownHeadings(text.value);
    const want = headingKey(title);
    let hit = index >= 0 ? heads[index] : null;
    if (want) {
      const named = heads.find((h) => headingKey(h.text) === want);
      if (named) hit = named;
    }
    if (!hit) return;
    jumpTextareaToLine(text, hit.line);
  }

  function mdBlockPlainText(text) {
    return String(text || "")
      .split("\n")
      .map((line) => line
        .replace(/^ {0,3}#{1,6}\s+/, "")
        .replace(/^ {0,3}([-*+]|\d+[.)])\s+(\[[ xX]\]\s+)?/, "")
        .replace(/^ {0,3}>\s?/, "")
        .replace(/[`*_~]/g, "")
        .trim())
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function estimateLineFromRatio(md, ratio) {
    const lines = String(md || "").split("\n");
    if (!lines.length) return 0;
    return Math.round((ratio || 0) * Math.max(0, lines.length - 1));
  }

  function findMdBlockNearIndex(blocks, key, hintIdx) {
    if (!blocks.length || !key) return null;
    const needle = key.slice(0, 48);
    const order = [];
    for (let d = 0; d < blocks.length; d += 1) {
      if (hintIdx - d >= 0) order.push(hintIdx - d);
      if (d > 0 && hintIdx + d < blocks.length) order.push(hintIdx + d);
    }
    for (const i of order) {
      const plain = mdBlockPlainText(blocks[i].text);
      if (plain === key) return blocks[i];
      if (plain && (plain.includes(needle) || key.includes(plain.slice(0, 48)))) return blocks[i];
    }
    return null;
  }

  function findSourceLineByText(md, anchorText, hintLine = 0) {
    const key = String(anchorText || "").trim();
    if (!key) return null;
    const lines = String(md || "").split("\n");
    const needle = key.slice(0, 48);
    const order = [];
    for (let d = 0; d < lines.length; d += 1) {
      if (hintLine - d >= 0) order.push(hintLine - d);
      if (d > 0 && hintLine + d < lines.length) order.push(hintLine + d);
    }
    for (const i of order) {
      const plain = mdBlockPlainText(lines[i]);
      if (plain === key) return i;
    }
    for (const i of order) {
      const plain = mdBlockPlainText(lines[i]);
      if (plain && (plain.includes(needle) || key.includes(plain.slice(0, 48)))) return i;
    }
    return null;
  }

  function captureSourceReadingSpot() {
    const { text } = sourceEls();
    if (!text) return null;
    const max = Math.max(0, text.scrollHeight - text.clientHeight);
    const ratio = readingScrollRatio(text);
    const viewOffset = text.clientHeight * 0.08;
    const { lineHeight, pad } = textareaLineMetrics(text);
    const lineIdx = Math.max(0, Math.floor((text.scrollTop - pad + viewOffset) / lineHeight));
    const md = text.value;
    const blocks = splitMdBlocks(md);
    let anchorText = "";
    let index;
    for (let i = 0; i < blocks.length; i += 1) {
      if (lineIdx >= blocks[i].start && lineIdx < blocks[i].end) {
        anchorText = mdBlockPlainText(blocks[i].text);
        index = i;
        break;
      }
    }
    if (!anchorText) {
      const lines = md.split("\n");
      anchorText = mdBlockPlainText(lines[lineIdx] || "");
    }
    return {
      text: anchorText,
      index,
      probeOffset: viewOffset,
      offset: viewOffset,
      scrollerHeight: text.clientHeight,
      ratio,
      scrollTop: text.scrollTop,
      scrollHeight: text.scrollHeight,
    };
  }

  function scaledReadingProbeOffset(spot, viewportHeight) {
    const fallback = viewportHeight * 0.08;
    if (!spot) return fallback;
    const raw = typeof spot.probeOffset === "number"
      ? spot.probeOffset
      : (typeof spot.offset === "number" ? spot.offset : fallback);
    if (raw < 0 || raw > viewportHeight * 0.45) return fallback;
    const fromHeight = spot.scrollerHeight || viewportHeight;
    return fromHeight > 0 ? raw * (viewportHeight / fromHeight) : fallback;
  }

  function readingScrollRatio(scroller) {
    if (!scroller) return 0;
    const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    if (max <= 0) return 0;
    return scroller.scrollTop / max;
  }

  function scrollTopFromSpot(spot, scroller) {
    if (!spot || !scroller) return null;
    const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    const ratio = typeof spot.ratio === "number" ? spot.ratio : 0;
    if (max <= 0) return ratio > 0.005 ? null : 0;
    if (ratio >= 0 && ratio <= 1) {
      return Math.max(0, Math.min(max, max * ratio));
    }
    if (typeof spot.scrollTop === "number" && spot.scrollHeight > 0) {
      const scale = scroller.scrollHeight / spot.scrollHeight;
      return Math.max(0, Math.min(max, spot.scrollTop * scale));
    }
    return 0;
  }

  function keepPreviewFromSourceSpot(spot) {
    if (!spot) return;
    const apply = () => {
      const scroller = readingScroller(true);
      if (!scroller) return false;
      const top = scrollTopFromSpot(spot, scroller);
      if (top == null) return false;
      scroller.scrollTop = top;
      return true;
    };
    apply();
    requestAnimationFrame(() => {
      apply();
      requestAnimationFrame(apply);
    });
    [0, 50, 120, 240, 480, 720].forEach((ms) => window.setTimeout(apply, ms));
  }

  function scrollSourceToSpot(spot) {
    const { text } = sourceEls();
    if (!text || !spot) return;
    const max = Math.max(0, text.scrollHeight - text.clientHeight);
    const ratioScroll = max * (spot.ratio || 0);
    const probeOffset = scaledReadingProbeOffset(spot, text.clientHeight);
    const md = text.value;
    const line = estimateLineFromRatio(md, spot.ratio);
    const { lineHeight, pad } = textareaLineMetrics(text);
    const lineScroll = Math.max(0, pad + line * lineHeight - probeOffset);
    let target = Math.abs(lineScroll - ratioScroll) <= text.clientHeight * 0.18
      ? lineScroll
      : ratioScroll;
    const drift = (spot.ratio || 0) * text.clientHeight * 0.028;
    target = Math.max(0, target - drift);
    text.focus({ preventScroll: true });
    text.scrollTop = Math.max(0, Math.min(max, target));
    const lines = md.split("\n");
    let pos = 0;
    for (let i = 0; i < line && i < lines.length; i += 1) pos += lines[i].length + 1;
    const end = pos + (lines[line]?.length ?? 0);
    try { text.setSelectionRange(pos, end); } catch (_) { /* ignore */ }
  }

  function keepSourceReadingSpot(spot) {
    if (!spot) {
      const { text } = sourceEls();
      requestAnimationFrame(() => {
        try { text?.focus({ preventScroll: true }); } catch (_) { /* ignore */ }
      });
      return;
    }
    const run = () => scrollSourceToSpot(spot);
    requestAnimationFrame(() => {
      run();
      window.setTimeout(run, 120);
    });
  }

  let sourceCtx = null;
  let sourceOpen = false;
  let sourceInputTimer = 0;

  function sourceIsEditable() {
    return !document.body.classList.contains("is-readonly");
  }

  function paintSourceEditability() {
    const { text, hint } = sourceEls();
    const editable = sourceIsEditable();
    if (text) {
      if (editable) text.removeAttribute("readonly");
      else text.setAttribute("readonly", "");
    }
    if (hint) hint.textContent = t(editable ? "sourceEditable" : "sourceReadonly");
  }

  function commitSourceFromTextarea() {
    if (!sourceOpen) return;
    const { text } = sourceEls();
    if (!text) return;
    try { sourceCtx?.applyMarkdown?.(text.value, { live: false }); } catch (_) { /* ignore */ }
  }

  function handleSourceInput() {
    if (!sourceOpen || !sourceIsEditable()) return;
    const { text } = sourceEls();
    if (!text) return;
    window.clearTimeout(sourceInputTimer);
    sourceInputTimer = window.setTimeout(() => {
      if (!sourceOpen) return;
      try {
        sourceCtx?.applyMarkdown?.(text.value, { live: true });
        sourceCtx?.notifyInput?.();
      } catch (_) { /* ignore */ }
    }, 220);
  }

  function sourceEls() {
    return {
      wrap: document.getElementById("sourceViewPrefs"),
      btn: document.getElementById("sourceViewBtn"),
      panel: document.getElementById("molanSourceView"),
      text: document.getElementById("molanSourceText"),
      title: document.getElementById("molanSourceTitle"),
      hint: document.getElementById("molanSourceHint"),
      close: document.getElementById("molanSourceClose"),
    };
  }

  function applySourceViewI18n() {
    const { btn, title, close, panel } = sourceEls();
    const label = t("viewSource");
    if (btn) {
      btn.title = label;
      btn.setAttribute("aria-label", label);
    }
    if (title) title.textContent = t("sourceTitle");
    if (close) {
      close.title = t("sourceClose");
      close.setAttribute("aria-label", t("sourceClose"));
    }
    if (panel) panel.setAttribute("aria-label", t("sourceTitle"));
    paintSourceEditability();
  }

  function paintSourceBtn(open) {
    const { btn } = sourceEls();
    btn?.classList.toggle("is-on", !!open);
    btn?.setAttribute("aria-pressed", open ? "true" : "false");
  }

  function fillSourceText() {
    const { text } = sourceEls();
    if (!text) return;
    const md = sourceCtx?.getMarkdown?.() ?? "";
    if (text.value !== md) text.value = md;
    paintSourceEditability();
  }

  function ensureSourcePanel() {
    const editorWrap = document.getElementById("editorWrap") || document.querySelector(".editor-wrap");
    if (!editorWrap) return null;
    let panel = document.getElementById("molanSourceView");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "molanSourceView";
      panel.className = "molan-source-view";
      panel.hidden = true;
      panel.setAttribute("role", "region");
      panel.innerHTML = `
        <div class="molan-source-view__bar">
          <span class="molan-source-view__title" id="molanSourceTitle"></span>
          <span class="molan-source-view__hint" id="molanSourceHint"></span>
          <button type="button" class="icon-btn" id="molanSourceClose">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </div>
        <textarea id="molanSourceText" spellcheck="false" autocomplete="off"></textarea>
      `;
      editorWrap.appendChild(panel);
      panel.querySelector("#molanSourceClose")?.addEventListener("click", () => closeSourceView());
    }
    const sourceText = panel.querySelector("#molanSourceText");
    if (sourceText && !sourceText.dataset.bound) {
      sourceText.dataset.bound = "1";
      sourceText.addEventListener("input", handleSourceInput);
    }
    return panel;
  }

  function openSourceView() {
    closeFind();
    hideFormatBar();
    hideTableToolbar(document.getElementById("molanTableToolbar"));
    const panel = ensureSourcePanel();
    const editorWrap = document.getElementById("editorWrap") || document.querySelector(".editor-wrap");
    if (!panel) return;
    const previewing = sourceCtx?.getPreviewing?.() ?? false;
    const spot = captureReadingSpot(previewing);
    fillSourceText();
    applySourceViewI18n();
    panel.hidden = false;
    sourceOpen = true;
    editorWrap?.classList.add("is-source-open");
    paintSourceBtn(true);
    keepSourceReadingSpot(spot);
    syncHistoryChrome();
  }

  function closeSourceView(opts = {}) {
    const restorePreview = opts.restorePreview !== false;
    const previewing = sourceCtx?.getPreviewing?.() ?? false;
    let spot = null;
    if (sourceOpen) commitSourceFromTextarea();
    if (sourceOpen && previewing && restorePreview) {
      spot = captureSourceReadingSpot();
    }
    const { panel } = sourceEls();
    const editorWrap = document.getElementById("editorWrap") || document.querySelector(".editor-wrap");
    sourceOpen = false;
    window.clearTimeout(sourceInputTimer);
    if (panel) panel.hidden = true;
    editorWrap?.classList.remove("is-source-open");
    paintSourceBtn(false);
    if (spot) keepPreviewFromSourceSpot(spot);
    syncHistoryChrome();
  }

  function toggleSourceView() {
    if (sourceOpen) closeSourceView();
    else openSourceView();
  }

