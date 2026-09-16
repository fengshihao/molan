  /* --- selection: 预览态拖选上报章节路径 + 引文 + 前后文 --- */
  const FOCUS_CONTEXT = 240;

  function headingPathFromMarks(marks) {
    const stack = [];
    for (const mark of marks) {
      if (!mark.text || mark.level < 1 || mark.level > 6) continue;
      while (stack.length && stack[stack.length - 1].level >= mark.level) stack.pop();
      stack.push(mark);
    }
    return stack.map((m) => m.text);
  }

  function headingPlainText(heading) {
    if (!heading) return "";
    const bits = [];
    heading.childNodes.forEach((node) => {
      if (node.nodeType === 1 && node.classList?.contains("molan-ask-section")) return;
      bits.push(node.textContent || "");
    });
    return bits.join("").replace(/\s+/g, " ").trim();
  }

  function headingPathFromPreviewNode(root, node) {
    if (!root || !node) return [];
    const headings = [...root.querySelectorAll("h1, h2, h3, h4, h5, h6")];
    const marks = [];
    for (const heading of headings) {
      if (heading.contains(node) || heading === node) {
        marks.push({
          level: Number(heading.tagName[1]),
          text: headingPlainText(heading),
        });
        break;
      }
      const pos = heading.compareDocumentPosition(node);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) {
        marks.push({
          level: Number(heading.tagName[1]),
          text: headingPlainText(heading),
        });
      }
    }
    return headingPathFromMarks(marks);
  }

  function emptyFocus() {
    return { headingPath: [], quote: "", before: "", after: "", rect: null };
  }

  function flattenText(value) {
    return String(value || "").replace(/\s+/g, " ").trim();
  }

  function rangeTouchesRoot(root, range) {
    if (!root || !range) return false;
    try {
      if (typeof range.intersectsNode === "function" && range.intersectsNode(root)) return true;
    } catch (_) { /* ignore */ }
    try {
      return root.contains(range.commonAncestorContainer);
    } catch (_) {
      return false;
    }
  }

  function clipRangeToRoot(root, range) {
    const clipped = range.cloneRange();
    const bound = document.createRange();
    bound.selectNodeContents(root);
    try {
      if (clipped.compareBoundaryPoints(Range.START_TO_START, bound) < 0) {
        clipped.setStart(bound.startContainer, bound.startOffset);
      }
      if (clipped.compareBoundaryPoints(Range.END_TO_END, bound) > 0) {
        clipped.setEnd(bound.endContainer, bound.endOffset);
      }
    } catch (_) {
      clipped.selectNodeContents(root);
    }
    return clipped;
  }

  function surroundingFromRange(root, range) {
    const beforeRange = document.createRange();
    beforeRange.selectNodeContents(root);
    const afterRange = document.createRange();
    afterRange.selectNodeContents(root);
    try {
      beforeRange.setEnd(range.startContainer, range.startOffset);
      afterRange.setStart(range.endContainer, range.endOffset);
    } catch (_) {
      return { before: "", after: "" };
    }
    return {
      before: flattenText(beforeRange.toString()).slice(-FOCUS_CONTEXT),
      after: flattenText(afterRange.toString()).slice(0, FOCUS_CONTEXT),
    };
  }

  function focusRect(range) {
    let box = null;
    try {
      const rects = typeof range.getClientRects === "function" ? [...range.getClientRects()] : [];
      const visible = rects.filter((r) => r.width > 0 || r.height > 0);
      box = visible[visible.length - 1] || range.getBoundingClientRect();
    } catch (_) {
      return null;
    }
    if (!box) return null;
    if (!box.width && !box.height && !box.top && !box.left) return null;
    return { top: box.top, left: box.left, bottom: box.bottom, right: box.right };
  }

  function focusFromRange(root, range, node) {
    const clipped = clipRangeToRoot(root, range);
    const quote = flattenText(clipped.toString());
    if (!quote) return emptyFocus();
    return {
      headingPath: headingPathFromPreviewNode(root, node || clipped.startContainer),
      quote,
      ...surroundingFromRange(root, clipped),
      rect: focusRect(clipped),
    };
  }

  function readPreviewFocus(root, sel) {
    if (!root || !sel || sel.rangeCount === 0 || sel.isCollapsed) return emptyFocus();
    let range;
    try {
      range = sel.getRangeAt(0);
    } catch (_) {
      return emptyFocus();
    }
    if (!rangeTouchesRoot(root, range)) return emptyFocus();
    return focusFromRange(root, range, sel.anchorNode);
  }

  function sameFocus(a, b) {
    if (!a || !b) return false;
    if (a.quote !== b.quote) return false;
    if ((a.before || "") !== (b.before || "")) return false;
    if ((a.after || "") !== (b.after || "")) return false;
    if (a.headingPath.length !== b.headingPath.length) return false;
    return a.headingPath.every((part, i) => part === b.headingPath[i]);
  }

  function isHeadingEl(node) {
    return Boolean(node && node.nodeType === 1 && /^H[1-6]$/.test(node.tagName));
  }

  function nextTreeNode(node, root) {
    if (!node || node === root) return null;
    if (node.firstChild) return node.firstChild;
    while (node && node !== root) {
      if (node.nextSibling) return node.nextSibling;
      node = node.parentNode;
    }
    return null;
  }

  function closestPreviewHeading(root, node) {
    if (!root || !node) return null;
    const el = node.nodeType === 1 ? node : node.parentElement;
    const heading = el && el.closest ? el.closest("h1, h2, h3, h4, h5, h6") : null;
    if (!heading || !root.contains(heading)) return null;
    return heading;
  }

  function nodeInsideRoot(root, node) {
    if (!root || !node) return false;
    try {
      if (root === node || root.contains(node)) return true;
      const el = node.nodeType === 1 ? node : node.parentNode;
      return Boolean(el && root.contains(el));
    } catch (_) {
      return false;
    }
  }

  function headingBeforeNode(root, node) {
    if (!nodeInsideRoot(root, node)) return null;
    const inside = closestPreviewHeading(root, node);
    if (inside) return inside;
    const headings = [...root.querySelectorAll("h1, h2, h3, h4, h5, h6")];
    let found = null;
    for (const heading of headings) {
      if (heading === node || heading.contains(node)) return heading;
      const pos = heading.compareDocumentPosition(node);
      if (pos & Node.DOCUMENT_POSITION_FOLLOWING) found = heading;
      else break;
    }
    return found;
  }

  /** 用记下的章节路径找回标题。输入框抢焦点后选区已经不在纸面上。 */
  function headingFromPath(root, path) {
    if (!root || !path || !path.length) return null;
    const want = path.map((p) => String(p || "").replace(/\s+/g, " ").trim()).filter(Boolean);
    if (!want.length) return null;
    const headings = [...root.querySelectorAll("h1, h2, h3, h4, h5, h6")];
    let byTitle = null;
    for (const heading of headings) {
      const full = headingPathFromPreviewNode(root, heading);
      if (full.length === want.length && full.every((part, i) => part === want[i])) return heading;
      if (headingPlainText(heading) === want[want.length - 1]) byTitle = heading;
    }
    return byTitle;
  }

  /** 按文档树走到下一同级/更高级标题之前，避免 Vditor 包一层就截错。 */
  function sectionRange(root, heading) {
    const startLevel = Number(heading.tagName[1]);
    const range = document.createRange();
    range.setStartBefore(heading);
    let node = nextTreeNode(heading, root);
    while (node) {
      if (isHeadingEl(node) && Number(node.tagName[1]) <= startLevel) {
        range.setEndBefore(node);
        return range;
      }
      node = nextTreeNode(node, root);
    }
    range.setEnd(root, root.childNodes.length);
    return range;
  }

  function markLayer(root) {
    let layer = root.querySelector(":scope > .molan-ask-mark");
    if (layer) return layer;
    layer = document.createElement("div");
    layer.className = "molan-ask-mark";
    layer.setAttribute("aria-hidden", "true");
    root.appendChild(layer);
    return layer;
  }

  function clearRangeMark(root) {
    const layer = root && root.querySelector(":scope > .molan-ask-mark");
    if (layer) layer.replaceChildren();
  }

  function paintRangeMark(root, range) {
    if (!root || !range) return;
    const layer = markLayer(root);
    layer.replaceChildren();
    const rootBox = root.getBoundingClientRect();
    let rects = [];
    try {
      rects = [...range.getClientRects()];
    } catch (_) {
      return;
    }
    for (const box of rects) {
      if (!box.width && !box.height) continue;
      const bit = document.createElement("i");
      bit.style.top = `${box.top - rootBox.top + root.scrollTop}px`;
      bit.style.left = `${box.left - rootBox.left + root.scrollLeft}px`;
      bit.style.width = `${box.width}px`;
      bit.style.height = `${box.height}px`;
      layer.appendChild(bit);
    }
  }

  function selectHeadingSection(root, heading, mute) {
    const range = sectionRange(root, heading);
    const sel = window.getSelection();
    if (!sel) return null;
    mute();
    sel.removeAllRanges();
    sel.addRange(range);
    const focus = focusFromRange(root, range, heading);
    if (focus.quote) paintRangeMark(root, range);
    return focus.quote ? focus : null;
  }

  function decorateSectionAsks(root, onAsk) {
    if (!root) return;
    root.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((heading) => {
      if (heading.querySelector(":scope > .molan-ask-section")) return;
      heading.classList.add("has-ask-section");
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "molan-ask-section";
      btn.title = "问这一节";
      btn.setAttribute("aria-label", "问这一节");
      btn.addEventListener("mousedown", (e) => {
        e.preventDefault();
        e.stopPropagation();
      });
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        onAsk(heading);
      });
      heading.appendChild(btn);
    });
  }

  function targetIsTyping(node) {
    const el = node && node.nodeType === 1 ? node : node && node.parentElement;
    if (!el || typeof el.closest !== "function") return false;
    return Boolean(el.closest("textarea, input, [contenteditable='true']"));
  }

  function bindPreviewSelection(opts) {
    const listeners = [];
    const empty = emptyFocus();
    let last = empty;
    let lastHeadingEl = null;
    let press = null;
    let pointerDown = false;
    let muteCollapsed = false;
    let settleTimer = 0;

    const rememberSectionHeading = (root, hint) => {
      if (isHeadingEl(hint) && root.contains(hint)) {
        lastHeadingEl = hint;
        return;
      }
      lastHeadingEl = headingBeforeNode(root, hint);
    };

    const emit = (next) => {
      if (sameFocus(last, next)) return;
      last = next;
      if (!next.quote) lastHeadingEl = null;
      listeners.forEach((cb) => {
        try { cb(next); } catch (_) { /* ignore */ }
      });
    };

    const muteSoon = () => {
      muteCollapsed = true;
      queueMicrotask(() => {
        muteCollapsed = false;
      });
    };

    const commitSelection = (allowClear) => {
      const root = opts.getRoot();
      if (!root || !opts.isPreviewing()) {
        emit(empty);
        return;
      }
      const next = readPreviewFocus(root, window.getSelection());
      if (next.quote) {
        const sel = window.getSelection();
        try {
          if (sel && sel.rangeCount) paintRangeMark(root, clipRangeToRoot(root, sel.getRangeAt(0)));
        } catch (_) { /* ignore */ }
        rememberSectionHeading(root, sel && sel.anchorNode);
        emit(next);
        return;
      }
      if (allowClear) {
        clearRangeMark(root);
        emit(empty);
      }
    };

    const onMouseDown = (e) => {
      if (e.button !== 0 || !opts.isPreviewing()) {
        press = null;
        pointerDown = false;
        return;
      }
      if (settleTimer) {
        window.clearTimeout(settleTimer);
        settleTimer = 0;
      }
      const root = opts.getRoot();
      if (!root || !root.contains(e.target)) {
        press = null;
        pointerDown = false;
        return;
      }
      pointerDown = true;
      press = { x: e.clientX, y: e.clientY };
    };

    const onMouseUp = (e) => {
      const start = press;
      press = null;
      pointerDown = false;
      if (!start) return;
      const root = opts.getRoot();
      if (!root || !opts.isPreviewing()) return;
      const clicked = Math.hypot(e.clientX - start.x, e.clientY - start.y) <= 6;
      // 等浏览器把拖选 / 双击选词收完，再读选区。按下过程中不上报。
      window.requestAnimationFrame(() => {
        const now = readPreviewFocus(root, window.getSelection());
        if (now.quote) {
          commitSelection(false);
          return;
        }
        if (!clicked) return;
        settleTimer = window.setTimeout(() => {
          settleTimer = 0;
          commitSelection(true);
        }, 220);
      });
    };

    const onKeyDown = (e) => {
      const key = String(e.key || "").toLowerCase();
      if (!(e.metaKey || e.ctrlKey) || key !== "a") return;
      if (!opts.isPreviewing() || targetIsTyping(e.target)) return;
      const root = opts.getRoot();
      if (!root) return;
      e.preventDefault();
      const range = document.createRange();
      range.selectNodeContents(root);
      const sel = window.getSelection();
      if (!sel) return;
      muteSoon();
      sel.removeAllRanges();
      sel.addRange(range);
      const focus = focusFromRange(root, range, root.firstChild || root);
      if (focus.quote) {
        paintRangeMark(root, range);
        rememberSectionHeading(root, root.querySelector("h1, h2, h3, h4, h5, h6"));
        emit(focus);
      }
    };

    const askHeading = (heading) => {
      const root = opts.getRoot();
      if (!root || !opts.isPreviewing() || !root.contains(heading)) return;
      const focus = selectHeadingSection(root, heading, muteSoon);
      if (focus) {
        rememberSectionHeading(root, heading);
        emit(focus);
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("mouseup", onMouseUp);
    document.addEventListener("keydown", onKeyDown);

    return {
      onSelection(cb) {
        if (typeof cb !== "function") return () => {};
        listeners.push(cb);
        return () => {
          const i = listeners.indexOf(cb);
          if (i >= 0) listeners.splice(i, 1);
        };
      },
      decorate() {
        if (opts.sectionAsk !== true) return;
        decorateSectionAsks(opts.getRoot(), askHeading);
      },
      expandToSection() {
        const root = opts.getRoot();
        if (!root || !opts.isPreviewing()) return;
        // 弹出框一聚焦，浏览器选区就跑到输入框。不能再用 getSelection 猜标题，
        // 否则会把纸面外的节点和所有标题比顺序，扩成整篇或最后一节。
        const heading = (lastHeadingEl && root.contains(lastHeadingEl) && lastHeadingEl)
          || headingFromPath(root, last.headingPath);
        if (!heading) return;
        const focus = selectHeadingSection(root, heading, muteSoon);
        if (focus) {
          rememberSectionHeading(root, heading);
          emit(focus);
        }
      },
      clear() {
        if (settleTimer) {
          window.clearTimeout(settleTimer);
          settleTimer = 0;
        }
        try {
          const sel = window.getSelection();
          if (sel && sel.rangeCount) sel.removeAllRanges();
        } catch (_) { /* ignore */ }
        const root = opts.getRoot();
        if (root) clearRangeMark(root);
        emit(empty);
      },
      report() {
        commitSelection(false);
      },
      dispose() {
        if (settleTimer) window.clearTimeout(settleTimer);
        document.removeEventListener("mousedown", onMouseDown);
        document.removeEventListener("mouseup", onMouseUp);
        document.removeEventListener("keydown", onKeyDown);
        listeners.length = 0;
      },
    };
  }
