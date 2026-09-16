  /* --- ir: IR 列表守卫与插入后落位 --- */
  const IR_ZWSP = "\u200b";

  function withMutedIrInput(vditor, fn) {
    const ir = (vditor?.vditor || vditor)?.ir;
    if (ir) ir.preventInput = true;
    try {
      return fn();
    } finally {
      if (ir && ir.preventInput) ir.preventInput = false;
    }
  }

  function sanitizeTaskMarker(marker, fallback = "-") {
    const raw = String(marker == null || marker === "" ? fallback : marker).replace(/"/g, "");
    return raw || fallback;
  }

  function taskMarkerOf(el, fallback = "-") {
    return sanitizeTaskMarker(el?.getAttribute?.("data-marker"), fallback);
  }

  function taskListIrHtml(marker = "-") {
    const m = sanitizeTaskMarker(marker);
    return `<ul data-tight="true" data-marker="${m}" data-block="0">${taskItemIrHtml(m)}</ul>`;
  }

  function taskItemIrHtml(marker = "-") {
    const m = sanitizeTaskMarker(marker);
    return `<li data-marker="${m}" class="vditor-task"><input type="checkbox">${IR_ZWSP}</li>`;
  }

  function normalizeInsertedTaskList(el) {
    if (!el || (el.tagName !== "UL" && el.tagName !== "OL")) return el;
    const marker = taskMarkerOf(el, el.tagName === "OL" ? "1." : "-");
    el.setAttribute("data-tight", el.getAttribute("data-tight") || "true");
    el.setAttribute("data-block", "0");
    el.setAttribute("data-marker", marker);
    let li = el.querySelector(":scope > li");
    if (!li) {
      el.insertAdjacentHTML("beforeend", taskItemIrHtml(marker));
      return el;
    }
    const checked = !!li.querySelector("input[type='checkbox'][checked], input[type='checkbox']:checked");
    const text = String(li.textContent || "")
      .replace(/^\s*\[[ xX]?\]\s*/, "")
      .replace(/[\u200b]/g, "")
      .trim();
    li.className = "vditor-task";
    li.setAttribute("data-marker", marker);
    li.replaceChildren();
    const input = document.createElement("input");
    input.type = "checkbox";
    if (checked) input.setAttribute("checked", "checked");
    li.appendChild(input);
    li.appendChild(document.createTextNode(text || IR_ZWSP));
    return el;
  }

  function listIsHusk(el) {
    if (!el || (el.tagName !== "UL" && el.tagName !== "OL")) return false;
    const items = [...el.children].filter((c) => c.tagName === "LI");
    if (!items.length) return true;
    return items.every((li) => {
      const clone = li.cloneNode(true);
      clone.querySelectorAll("input, .vditor-ir__preview, .vditor-ir__marker").forEach((n) => n.remove());
      return !String(clone.textContent || "").replace(/[\u200b\s]/g, "");
    });
  }

  function irNodeSourceText(el) {
    if (!el) return "";
    const clone = el.cloneNode(true);
    clone.querySelectorAll(".vditor-ir__preview, .molan-diagram-toolbar").forEach((n) => n.remove());
    return String(clone.textContent || "").replace(/[\u200b\s]/g, "");
  }

  function irNodeIsOrphanPreview(el) {
    if (!el?.classList?.contains("vditor-ir__node")) return false;
    if (el.querySelector(".language-mermaid, .language-math, .katex, table, img")) return false;
    const hasSource = !!el.querySelector(
      ":scope > .vditor-ir__marker--pre, :scope > pre.vditor-ir__marker--pre, .vditor-ir__marker--pre code",
    );
    if (hasSource && irNodeSourceText(el)) return false;
    const kids = [...el.children];
    if (!kids.length) return true;
    return kids.every((k) => k.classList.contains("vditor-ir__preview") || k.tagName === "BR");
  }

  function irNodeIsEmptyCode(el) {
    if (!el?.classList?.contains("vditor-ir__node")) return false;
    if (el.querySelector(".language-mermaid, .language-math, .katex")) return false;
    const isCode = el.getAttribute("data-type") === "code-block"
      || !!el.querySelector(":scope > .vditor-ir__preview, :scope > .vditor-ir__marker--pre");
    if (!isCode) return irNodeIsOrphanPreview(el);
    return !irNodeSourceText(el);
  }

  function blockIsHusk(el) {
    return listIsHusk(el) || irNodeIsOrphanPreview(el) || irNodeIsEmptyCode(el);
  }

  function sweepOrphanIrNodes(root) {
    if (!root) return false;
    let removed = false;
    [...root.children].forEach((el) => {
      if (irNodeIsOrphanPreview(el) || (irNodeIsEmptyCode(el) && irNodeIsOrphanPreview(el))) {
        el.remove();
        removed = true;
      }
    });
    return removed;
  }

  function caretAtVisualStart(block, range) {
    if (!range?.collapsed || !block) return false;
    const node = range.startContainer;
    if (node !== block && !block.contains(node)) return false;
    try {
      const pre = document.createRange();
      pre.selectNodeContents(block);
      pre.setEnd(node, range.startOffset);
      return !String(pre.toString() || "").replace(/[\u200b\s]/g, "");
    } catch (_) {
      return range.startOffset === 0;
    }
  }

  function caretAtVisualEnd(block, range) {
    if (!range?.collapsed || !block) return false;
    const node = range.startContainer;
    if (node !== block && !block.contains(node)) return false;
    try {
      const post = document.createRange();
      post.selectNodeContents(block);
      post.setStart(node, range.startOffset);
      return !String(post.toString() || "").replace(/[\u200b\s]/g, "");
    } catch (_) {
      return false;
    }
  }

  function removeBlockHusk(el, vditor) {
    if (!el || !el.isConnected) return;
    const ir = el.parentElement;
    const next = el.nextElementSibling;
    const prev = el.previousElementSibling;
    el.remove();
    if (next) placeCaretAtStart(next);
    else if (prev) setCaretRange(prev, true);
    else if (ir) {
      ir.insertAdjacentHTML("afterbegin", `<p data-block="0">${IR_ZWSP}</p>`);
      placeCaretAtStart(ir.firstElementChild);
    }
    notifyTableEdit(vditor, ir?.closest("#vditor") || ir);
  }

  function closestTaskItem(node, root) {
    const el = node?.nodeType === 1 ? node : node?.parentElement;
    const li = el?.closest?.("li.vditor-task");
    if (!li || (root && !root.contains(li))) return null;
    return li;
  }

  function bindIrListGuards(vditorRoot, getVditor, isPreviewing) {
    if (!vditorRoot || vditorRoot.dataset.molanListGuard === "1") return;
    vditorRoot.dataset.molanListGuard = "1";
    vditorRoot.addEventListener("keydown", (event) => {
      if (isPreviewing?.()) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const vditor = getVditor?.();
      const ir = irRootOf(vditor);
      if (!ir) return;
      const from = event.target?.nodeType === 1 ? event.target : event.target?.parentElement;
      if (from?.closest?.("textarea, input:not([type='checkbox']), .molan-find-bar")) return;
      const inPreview = from?.closest?.(".vditor-ir__preview");
      const sel = window.getSelection();
      const range = sel?.rangeCount ? sel.getRangeAt(0) : null;
      const rangeInIr = range && ir.contains(range.commonAncestorContainer);

      if (event.key === "Enter" && !event.shiftKey) {
        if (inPreview || !rangeInIr) return;
        const li = closestTaskItem(range.startContainer, ir);
        if (!li) return;
        event.preventDefault();
        event.stopPropagation();
        const marker = taskMarkerOf(li, taskMarkerOf(li.parentElement));
        withMutedIrInput(vditor, () => {
          li.insertAdjacentHTML("afterend", taskItemIrHtml(marker));
        });
        setCaretRange(li.nextElementSibling, true);
        notifyTableEdit(vditor, ir.closest("#vditor") || ir);
        return;
      }

      if (event.key !== "Backspace" && event.key !== "Delete") return;
      const hit = inPreview?.closest?.(".vditor-ir__node")
        || (rangeInIr ? closestTopBlock(range.commonAncestorContainer, ir) : null);
      const block = hit && ir.contains(hit)
        ? (hit.parentElement === ir ? hit : closestTopBlock(hit, ir))
        : null;
      if (blockIsHusk(block)) {
        event.preventDefault();
        event.stopPropagation();
        removeBlockHusk(block, vditor);
        return;
      }
      if (!range || !range.collapsed || !block) return;
      if (event.key === "Backspace" && caretAtVisualStart(block, range) && blockIsHusk(block.previousElementSibling)) {
        event.preventDefault();
        event.stopPropagation();
        removeBlockHusk(block.previousElementSibling, vditor);
        return;
      }
      if (event.key === "Delete" && caretAtVisualEnd(block, range) && blockIsHusk(block.nextElementSibling)) {
        event.preventDefault();
        event.stopPropagation();
        removeBlockHusk(block.nextElementSibling, vditor);
      }
    }, true);
    vditorRoot.addEventListener("pointerdown", (event) => {
      if (isPreviewing?.()) return;
      const vditor = getVditor?.();
      const ir = irRootOf(vditor);
      if (!ir) return;
      const node = event.target?.closest?.(".vditor-ir__node");
      if (!node || node.parentElement !== ir || !irNodeIsOrphanPreview(node)) return;
      event.preventDefault();
      event.stopPropagation();
      removeBlockHusk(node, vditor);
    }, true);
  }

  function insertIrSnippet(vditor, snippet, hover) {
    const piece = String(snippet || "").replace(/^\n+/, "").replace(/\n+$/, "");
    if (!piece) return null;
    const ir = irRootOf(vditor);
    const lute = (vditor?.vditor || vditor)?.lute;
    if (!ir) return null;
    const blocks = topLevelBlocks(ir);
    let ref = null;
    let replace = false;
    if (hover?.emptyDoc || hover?.index < 0) {
      ref = null;
    } else if (hover?.empty && Number.isInteger(hover.index)) {
      ref = blocks[hover.index] || null;
      replace = !!ref;
    } else if (hover?.el && ir.contains(hover.el)) {
      ref = hover.el;
    } else if (Number.isInteger(hover?.index) && hover.index >= 0) {
      ref = blocks[hover.index] || null;
    }
    let inserted = null;
    const kind = snippetKind(piece);
    const canInsertHtml = kind === "task" || (lute && typeof lute.Md2VditorIRDOM === "function");
    if (canInsertHtml) {
      // 空任务 `- [ ] ` 经 Lute 常变成普通 li 文本 `[ ]`；再 spin 又会收成没有 li 的 ul。
      // 任务项改走 Vditor IR 结构，并静音这次 input，避免 spin 拆掉刚插入的列表。
      const html = kind === "task" ? taskListIrHtml() : lute.Md2VditorIRDOM(`${piece}\n`);
      withMutedIrInput(vditor, () => {
        if (replace && ref && ir.contains(ref)) {
          ref.insertAdjacentHTML("afterend", html);
          inserted = ref.nextElementSibling;
          if (blockLooksEmpty(ref)) ref.remove();
        } else if (ref && ir.contains(ref)) {
          ref.insertAdjacentHTML("afterend", html);
          inserted = ref.nextElementSibling;
        } else {
          ir.insertAdjacentHTML("afterbegin", html);
          inserted = ir.firstElementChild;
        }
      });
      let node = inserted;
      for (let i = 0; i < 6 && node; i += 1, node = node.nextElementSibling) {
        if (kind !== "block" && blockMatchesKind(node, kind)) {
          inserted = node;
          break;
        }
        if (kind === "block" && !blockLooksEmpty(node)) {
          inserted = node;
          break;
        }
      }
      if (kind === "task") inserted = normalizeInsertedTaskList(inserted);
    } else {
      if (replace && ref) placeCaretAfter(ref);
      else if (ref && ir.contains(ref)) placeCaretAfter(ref);
      else placeCaretAtStart(ir);
      if (typeof vditor.insertMD === "function") vditor.insertMD(piece);
      else if (typeof vditor.insertValue === "function") vditor.insertValue(`\n${piece}\n`, true);
      inserted = locateInsertedBlock(ir, {
        focusIndex: replace ? (hover?.index ?? 0) : (hover?.index ?? -1) + 1,
        focusText: piece.replace(/\s+/g, " ").trim().slice(0, 80),
        snippet: piece,
        kind: snippetKind(piece),
      });
    }
    if (inserted) {
      notifyTableEdit(vditor, ir.closest("#vditor") || ir);
      scheduleFitTables(ir.closest("#vditor") || ir);
    }
    return inserted;
  }

  function settleInsertedBlock(el, viewportY) {
    if (!el || !el.isConnected) return;
    pinBlockToViewport(el, viewportY);
    activateInsertedBlock(el);
  }

  function keepReadingSpot(previewing, spot, opts = {}) {
    if (!spot) return;
    const run = (caret) => restoreReadingSpot(previewing, spot, { ...opts, caret });
    run(Boolean(!previewing && !opts.preferRatio));
    requestAnimationFrame(() => {
      run(false);
      requestAnimationFrame(() => run(false));
    });
    window.setTimeout(() => run(false), 80);
    window.setTimeout(() => run(false), 220);
    window.setTimeout(() => run(false), 480);
  }

  function blockLooksEmpty(el) {
    if (!el) return true;
    const clone = el.cloneNode(true);
    clone.querySelectorAll?.(".vditor-ir__preview, .molan-diagram-toolbar, .vditor-ir__marker").forEach((n) => n.remove());
    return !String(clone.textContent || "").replace(/[\u200b\s]/g, "");
  }

  function placeCaretAfter(el) {
    const editable = el?.closest?.("[contenteditable='true']");
    if (!editable) return false;
    try { editable.focus({ preventScroll: true }); } catch (_) { /* ignore */ }
    const range = document.createRange();
    if (blockLooksEmpty(el)) {
      range.selectNodeContents(el);
      range.collapse(true);
    } else {
      range.setStartAfter(el);
      range.collapse(true);
    }
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    return true;
  }

  function placeCaretAtStart(root) {
    const editable = root?.closest?.("[contenteditable='true']") || root;
    if (!editable) return false;
    try { editable.focus({ preventScroll: true }); } catch (_) { /* ignore */ }
    const range = document.createRange();
    const first = root.firstChild;
    if (first) range.setStart(first, 0);
    else range.selectNodeContents(root);
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    return true;
  }

