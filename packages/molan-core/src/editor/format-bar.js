  /* --- format-bar: 选区格式条与插入表格拾取 --- */
  function collapseWs(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function spanInFence(source, index) {
    let inFence = false;
    const upto = String(source || "").slice(0, Math.max(0, index));
    for (const line of upto.split("\n")) {
      if (/^ {0,3}(`{3,}|~{3,})/.test(line)) inFence = !inFence;
    }
    return inFence;
  }

  function findCollapsedHits(source, needle) {
    const n = collapseWs(needle);
    const src = String(source || "");
    if (!n || !src) return [];
    const hits = [];
    let i = 0;
    while (i < src.length) {
      while (i < src.length && /\s/.test(src[i])) i += 1;
      if (i >= src.length) break;
      let pi = 0;
      let j = i;
      while (j < src.length && pi < n.length) {
        const sc = src[j];
        if (/\s/.test(sc)) {
          if (n[pi] === " ") {
            pi += 1;
            while (j < src.length && /\s/.test(src[j])) j += 1;
            continue;
          }
          j += 1;
          continue;
        }
        if (sc === n[pi]) {
          pi += 1;
          j += 1;
          continue;
        }
        break;
      }
      if (pi === n.length) hits.push({ start: i, end: j });
      i += 1;
    }
    return hits;
  }

  function pickCollapsedSpan(source, quote, before, after) {
    const hits = findCollapsedHits(source, quote).filter((hit) => !spanInFence(source, hit.start));
    if (!hits.length) return null;
    if (hits.length === 1) return hits[0];
    const preWant = collapseWs(before).slice(-48);
    const postWant = collapseWs(after).slice(0, 48);
    let best = hits[0];
    let bestScore = -1;
    for (const hit of hits) {
      const pre = collapseWs(source.slice(Math.max(0, hit.start - 96), hit.start));
      const post = collapseWs(source.slice(hit.end, hit.end + 96));
      let score = 0;
      if (preWant && pre.endsWith(preWant)) score += 3;
      else if (preWant && pre.includes(preWant.slice(-16))) score += 1;
      if (postWant && post.startsWith(postWant)) score += 3;
      else if (postWant && post.includes(postWant.slice(0, 16))) score += 1;
      if (score > bestScore) {
        bestScore = score;
        best = hit;
      }
    }
    return best;
  }

  function wrapInlineMarkdown(source, start, end, left, right) {
    const src = String(source || "");
    const inner = src.slice(start, end);
    const before = src.slice(Math.max(0, start - left.length), start);
    const after = src.slice(end, end + right.length);
    if (before === left && after === right) {
      return src.slice(0, start - left.length) + inner + src.slice(end + right.length);
    }
    if (inner.startsWith(left) && inner.endsWith(right) && inner.length > left.length + right.length) {
      return src.slice(0, start) + inner.slice(left.length, inner.length - right.length) + src.slice(end);
    }
    return src.slice(0, start) + left + inner + right + src.slice(end);
  }

  function wrapPreviewLink(source, start, end, href) {
    const src = String(source || "");
    const inner = src.slice(start, end);
    const before = src.slice(0, start);
    const after = src.slice(end);
    const wrapped = before.match(/\[$/) && after.match(/^\]\([^)]*\)/);
    if (wrapped) {
      return before.slice(0, -1) + `[${inner}](${href})` + after.replace(/^\]\([^)]*\)/, "");
    }
    if (/^\[[^\]]+\]\([^)]*\)$/.test(inner)) {
      return src.slice(0, start) + `[${inner.replace(/^\[/, "").replace(/\]\([^)]*\)$/, "")}](${href})` + src.slice(end);
    }
    return src.slice(0, start) + `[${inner}](${href})` + src.slice(end);
  }

  function hideFormatBar() {
    const bar = document.getElementById("molanFormatBar");
    if (!bar) return;
    bar.hidden = true;
    bar.classList.remove("is-link", "is-below");
    const form = bar.querySelector(".molan-format-bar__link");
    if (form) form.hidden = true;
    const actions = bar.querySelector(".molan-format-bar__actions");
    if (actions) actions.hidden = false;
  }

  function applyFormatBarI18n() {
    const bar = document.getElementById("molanFormatBar");
    if (!bar) return;
    const map = {
      bold: "formatBold",
      italic: "formatItalic",
      strike: "formatStrike",
      "inline-code": "formatInlineCode",
      link: "formatLink",
    };
    bar.querySelectorAll("[data-format]").forEach((btn) => {
      const key = map[btn.getAttribute("data-format")];
      if (!key) return;
      const label = t(key);
      btn.title = label;
      btn.setAttribute("aria-label", label);
    });
    const input = bar.querySelector(".molan-format-bar__link input");
    if (input) {
      input.placeholder = t("formatLinkPlaceholder");
      input.setAttribute("aria-label", t("formatLink"));
    }
  }

  function bindFormatBar(vditorRoot, getVditor, isPreviewing, extras = {}) {
    if (!vditorRoot || vditorRoot.dataset.molanFormatBar === "1") return;
    vditorRoot.dataset.molanFormatBar = "1";
    const previewFormat = extras.previewFormat === true;
    const getPreviewRoot = extras.getPreviewRoot || (() => document.getElementById("molanPreviewBody"));
    const getMarkdown = extras.getMarkdown || (() => "");
    const applyMarkdown = extras.applyMarkdown;

    let bar = document.getElementById("molanFormatBar");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "molanFormatBar";
      bar.className = "molan-format-bar";
      bar.hidden = true;
      bar.innerHTML = `
        <div class="molan-format-bar__actions">
          <button type="button" class="molan-insert-item" data-format="bold"><span>B</span></button>
          <button type="button" class="molan-insert-item" data-format="italic"><span>I</span></button>
          <button type="button" class="molan-insert-item" data-format="strike"><span>S</span></button>
          <button type="button" class="molan-insert-item" data-format="inline-code"><span>\`</span></button>
          <button type="button" class="molan-insert-item" data-format="link">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6.5 9.5l3-3M5 8.2l-1.2 1.2a2.2 2.2 0 1 0 3.1 3.1L8.2 11M11 7.8l1.2-1.2a2.2 2.2 0 1 0-3.1-3.1L7.8 5"/></svg>
          </button>
        </div>
        <form class="molan-format-bar__link" hidden novalidate>
          <input type="text" inputmode="url" autocomplete="off" spellcheck="false" />
        </form>
      `;
      document.body.appendChild(bar);
    }
    applyFormatBarI18n();

    let savedRange = null;
    let savedText = "";
    let linkOpen = false;
    let raf = 0;

    const clickToolbar = (type) => {
      const btn = vditorRoot.querySelector(`.vditor-toolbar [data-type="${type}"]`);
      if (!btn) return false;
      btn.click();
      return true;
    };

    const restoreRange = () => {
      if (!savedRange) return false;
      const sel = window.getSelection();
      if (!sel) return false;
      sel.removeAllRanges();
      sel.addRange(savedRange);
      return true;
    };

    const captureRange = () => {
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount || sel.isCollapsed) return false;
      savedRange = sel.getRangeAt(0).cloneRange();
      savedText = sel.toString();
      return true;
    };

    const positionBar = (range) => {
      let rect = range.getBoundingClientRect();
      if (!rect || (rect.width === 0 && rect.height === 0)) {
        const rects = range.getClientRects();
        if (!rects.length) {
          hideFormatBar();
          return;
        }
        rect = rects[0];
      }
      bar.hidden = false;
      const pad = 8;
      const w = bar.offsetWidth || 120;
      const h = bar.offsetHeight || 40;
      let left = rect.left + rect.width / 2 - w / 2;
      let top = rect.top - h - pad;
      let below = false;
      if (top < pad) {
        top = rect.bottom + pad;
        below = true;
      }
      left = Math.min(Math.max(pad, left), window.innerWidth - w - pad);
      bar.style.left = `${Math.round(left)}px`;
      bar.style.top = `${Math.round(top)}px`;
      bar.classList.toggle("is-below", below);
    };

    const syncButtons = () => {
      bar.querySelectorAll("[data-format]").forEach((btn) => {
        const type = btn.getAttribute("data-format");
        const native = vditorRoot.querySelector(`.vditor-toolbar [data-type="${type}"]`);
        btn.classList.toggle("is-on", !!(native && native.classList.contains("vditor-menu--current")));
      });
    };

    const closeLink = () => {
      linkOpen = false;
      bar.classList.remove("is-link");
      const form = bar.querySelector(".molan-format-bar__link");
      const actions = bar.querySelector(".molan-format-bar__actions");
      if (form) form.hidden = true;
      if (actions) actions.hidden = false;
    };

    const openLink = () => {
      captureRange();
      linkOpen = true;
      bar.classList.add("is-link");
      const form = bar.querySelector(".molan-format-bar__link");
      const actions = bar.querySelector(".molan-format-bar__actions");
      const input = form?.querySelector("input");
      if (actions) actions.hidden = true;
      if (form) form.hidden = false;
      if (input) {
        const node = savedRange?.commonAncestorContainer;
        const el = node?.nodeType === 1 ? node : node?.parentElement;
        const href = el?.closest("a")?.getAttribute("href") || "";
        input.value = href;
        requestAnimationFrame(() => {
          input.focus();
          input.select();
        });
      }
      if (savedRange) positionBar(savedRange);
    };

    const previewFocusFromSelection = () => {
      const root = getPreviewRoot?.();
      const sel = window.getSelection();
      if (!root || !sel || !sel.rangeCount || sel.isCollapsed) return null;
      const node = sel.anchorNode;
      const el = node?.nodeType === 1 ? node : node?.parentElement;
      if (!el || !root.contains(el)) return null;
      if (el.closest("pre, .language-mermaid, .molan-find-bar, .molan-format-bar")) return null;
      const text = sel.toString();
      if (!text.replace(/\s+/g, "")) return null;
      return { range: sel.getRangeAt(0).cloneRange(), text, root };
    };

    const applyPreviewFormat = (type, href) => {
      if (!applyMarkdown) return false;
      const src = getMarkdown?.() || "";
      const around = typeof surroundingFromRange === "function" && savedRange
        ? surroundingFromRange(getPreviewRoot?.(), savedRange)
        : { before: "", after: "" };
      const span = pickCollapsedSpan(src, savedText, around.before, around.after);
      if (!span) return false;
      let next = src;
      if (type === "bold") next = wrapInlineMarkdown(src, span.start, span.end, "**", "**");
      else if (type === "italic") next = wrapInlineMarkdown(src, span.start, span.end, "*", "*");
      else if (type === "strike") next = wrapInlineMarkdown(src, span.start, span.end, "~~", "~~");
      else if (type === "inline-code") next = wrapInlineMarkdown(src, span.start, span.end, "`", "`");
      else if (type === "link") next = wrapPreviewLink(src, span.start, span.end, href);
      if (next === src) return false;
      applyMarkdown(next);
      return true;
    };

    const applyLink = (raw) => {
      const href = parseInlineHref(raw);
      if (!href) {
        const input = bar.querySelector(".molan-format-bar__link input");
        input?.classList.add("is-invalid");
        input?.focus();
        return false;
      }
      if (isPreviewing?.() && previewFormat) {
        const ok = applyPreviewFormat("link", href);
        closeLink();
        hideFormatBar();
        return ok;
      }
      const vditor = getVditor?.();
      if (!vditor || !savedText) return false;
      restoreRange();
      const md = `[${escapeMdAlt(savedText)}](${href})`;
      try {
        if (typeof vditor.deleteValue === "function") vditor.deleteValue();
        if (typeof vditor.insertMD === "function") vditor.insertMD(md);
        else if (typeof vditor.insertValue === "function") vditor.insertValue(md, true);
      } catch (_) { /* ignore */ }
      closeLink();
      hideFormatBar();
      return true;
    };

    const sync = () => {
      if (linkOpen) return;
      if (isPreviewing?.()) {
        if (!previewFormat) {
          hideFormatBar();
          return;
        }
        const focus = previewFocusFromSelection();
        if (!focus) {
          hideFormatBar();
          return;
        }
        savedRange = focus.range;
        savedText = focus.text;
        positionBar(savedRange);
        bar.querySelectorAll("[data-format]").forEach((btn) => btn.classList.remove("is-on"));
        return;
      }
      const vditor = getVditor?.();
      const mode = currentEditorMode(vditor);
      if (mode !== "ir" && mode !== "wysiwyg") {
        hideFormatBar();
        return;
      }
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        hideFormatBar();
        return;
      }
      const text = sel.toString();
      if (!text.replace(/\s+/g, "")) {
        hideFormatBar();
        return;
      }
      const node = sel.anchorNode;
      const el = node?.nodeType === 1 ? node : node?.parentElement;
      if (!el || !vditorRoot.contains(el)) {
        hideFormatBar();
        return;
      }
      if (!el.closest(".vditor-ir, .vditor-wysiwyg")) {
        hideFormatBar();
        return;
      }
      if (el.closest(".vditor-ir__node[data-type='code-block'], .vditor-ir__preview, .language-mermaid, .molan-find-bar, .molan-format-bar")) {
        hideFormatBar();
        return;
      }
      savedRange = sel.getRangeAt(0).cloneRange();
      savedText = text;
      positionBar(savedRange);
      syncButtons();
    };

    const scheduleSync = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        sync();
      });
    };

    document.addEventListener("selectionchange", scheduleSync);
    document.addEventListener("mouseup", scheduleSync);
    vditorRoot.addEventListener("keyup", scheduleSync);
    vditorRoot.addEventListener("mouseup", scheduleSync);
    window.addEventListener("scroll", () => {
      if (bar.hidden || !savedRange) return;
      try { positionBar(savedRange); } catch (_) { hideFormatBar(); }
    }, true);
    window.addEventListener("resize", () => {
      if (!bar.hidden && savedRange) positionBar(savedRange);
    });

    bar.addEventListener("pointerdown", (e) => {
      if (e.target.closest("input")) return;
      e.preventDefault();
    });
    bar.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-format]");
      if (!btn) return;
      const type = btn.getAttribute("data-format");
      if (type === "link") {
        openLink();
        return;
      }
      if (isPreviewing?.() && previewFormat) {
        applyPreviewFormat(type);
        hideFormatBar();
        return;
      }
      restoreRange();
      if (!clickToolbar(type)) {
        const vditor = getVditor?.();
        const marker = type === "bold" ? "**"
          : type === "strike" ? "~~"
            : type === "inline-code" ? "`"
              : "*";
        if (vditor && savedText) {
          try {
            if (typeof vditor.deleteValue === "function") vditor.deleteValue();
            const md = `${marker}${savedText}${marker}`;
            if (typeof vditor.insertMD === "function") vditor.insertMD(md);
            else vditor.insertValue?.(md, true);
          } catch (_) { /* ignore */ }
        }
      }
      requestAnimationFrame(syncButtons);
    });
    bar.querySelector(".molan-format-bar__link")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = bar.querySelector(".molan-format-bar__link input");
      applyLink(input?.value || "");
    });
    document.addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || bar.hidden) return;
      if (linkOpen) {
        e.preventDefault();
        closeLink();
        if (savedRange) positionBar(savedRange);
        return;
      }
      hideFormatBar();
    });
  }

  function tableToolbarButtonFromEvent(e, root) {
    for (const node of eventPath(e)) {
      if (!node || node.nodeType !== 1) continue;
      if (node.getAttribute?.("data-type") === "table" && node.closest?.(".vditor-toolbar")) {
        return root.contains(node) ? node : null;
      }
      if (node.classList?.contains("vditor-toolbar__item")) {
        const btn = node.querySelector?.("[data-type='table']");
        if (btn && root.contains(btn)) return btn;
      }
    }
    return null;
  }

  function bindTableInsertPicker(root, getVditor) {
    if (!root || root.dataset.molanTablePicker === "1") return;
    root.dataset.molanTablePicker = "1";
    let openedAt = 0;
    const swallow = (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };
    const togglePicker = (btn) => {
      const picker = document.getElementById("molanTablePicker");
      if (picker && !picker.hidden && picker._anchor === btn) {
        hideTablePicker();
        return;
      }
      openedAt = Date.now();
      showTableSizePicker(btn, getVditor?.());
    };
    const onToolbarTable = (e) => {
      const btn = tableToolbarButtonFromEvent(e, root);
      if (!btn) return;
      swallow(e);
      // pointerdown 已打开时，随后的 click 只拦住 Vditor 默认 3×3，不再开关弹层
      if (e.type !== "pointerdown" && Date.now() - openedAt < 500) return;
      togglePicker(btn);
    };
    root.addEventListener("pointerdown", onToolbarTable, true);
    root.addEventListener("click", onToolbarTable, true);
    root.addEventListener("touchend", onToolbarTable, true);

    const picker = ensureTablePicker();
    picker.addEventListener("click", (e) => {
      const cell = e.target.closest("[data-col]");
      if (!cell) return;
      insertPickedTable(picker._vditor || getVditor?.(), Number(cell.getAttribute("data-row")), Number(cell.getAttribute("data-col")));
    });
    document.addEventListener("pointerdown", (e) => {
      const pickerEl = document.getElementById("molanTablePicker");
      if (!pickerEl || pickerEl.hidden) return;
      if (Date.now() - openedAt < 300) return;
      if (eventPath(e).includes(pickerEl) || pickerEl.contains(e.target)) return;
      if (tableToolbarButtonFromEvent(e, root)) return;
      hideTablePicker();
    }, true);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        hideTablePicker();
        return;
      }
      if (!(e.metaKey || e.ctrlKey) || e.shiftKey || e.altKey) return;
      if (e.key !== "m" && e.key !== "M") return;
      if (root.classList.contains("is-preview")) return;
      if (e.target?.closest?.("input, textarea") && !root.contains(e.target)) return;
      const btn = root.querySelector(".vditor-toolbar [data-type='table']");
      if (!btn) return;
      swallow(e);
      togglePicker(btn);
    }, true);
  }
