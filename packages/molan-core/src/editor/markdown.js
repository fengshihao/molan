  /* --- markdown: Markdown 块切分与阅读位置 --- */
  function isFenceLine(line) {
    return /^ {0,3}(`{3,}|~{3,})/.test(line);
  }

  function fenceClose(line, mark, len) {
    const m = line.match(/^ {0,3}(`{3,}|~{3,})\s*$/);
    return !!(m && m[1][0] === mark && m[1].length >= len);
  }

  function splitMdBlocks(md) {
    const lines = String(md || "").replace(/\r\n/g, "\n").split("\n");
    const blocks = [];
    let i = 0;
    const push = (start, end) => {
      const text = lines.slice(start, end).join("\n");
      if (text.trim() === "") return;
      blocks.push({ start, end, text });
    };
    while (i < lines.length) {
      if (lines[i].trim() === "") {
        i++;
        continue;
      }
      const trimmed = lines[i].replace(/^ {0,3}/, "");
      if (isFenceLine(lines[i])) {
        const open = trimmed.match(/^(`{3,}|~{3,})/);
        const mark = open[1][0];
        const len = open[1].length;
        const start = i++;
        while (i < lines.length && !fenceClose(lines[i], mark, len)) i++;
        if (i < lines.length) i++;
        push(start, i);
        continue;
      }
      if (/^(#{1,6})(?:\s|$)/.test(trimmed)) {
        push(i, i + 1);
        i++;
        continue;
      }
      if (/^([-*_])\s*\1\s*\1(?:\s*\1)*\s*$/.test(trimmed) && !/^[-*+] /.test(trimmed)) {
        push(i, i + 1);
        i++;
        continue;
      }
      if (/^>/.test(trimmed)) {
        const start = i++;
        while (i < lines.length) {
          const next = lines[i].replace(/^ {0,3}/, "");
          if (lines[i].trim() === "") {
            if (i + 1 < lines.length && /^>/.test(lines[i + 1].replace(/^ {0,3}/, ""))) {
              i++;
              continue;
            }
            break;
          }
          if (!/^>/.test(next)) break;
          i++;
        }
        push(start, i);
        continue;
      }
      if (/^([-*+]|\d+[.)])(?:\s\[.?\])?\s/.test(trimmed) || /^[-*+] \[[ xX]\]\s/.test(trimmed)) {
        const start = i++;
        while (i < lines.length) {
          if (lines[i].trim() === "") {
            const peek = lines[i + 1] || "";
            if (/^\s+/.test(peek) || /^ {0,3}([-*+]|\d+[.)])\s/.test(peek)) {
              i++;
              continue;
            }
            break;
          }
          if (/^ {0,3}([-*+]|\d+[.)])\s/.test(lines[i]) || /^\s+\S/.test(lines[i])) {
            i++;
            continue;
          }
          break;
        }
        push(start, i);
        continue;
      }
      if (/\|/.test(lines[i]) && i + 1 < lines.length && /^\s*\|?[\s:|-]*-{3,}/.test(lines[i + 1])) {
        const start = i;
        i += 2;
        while (i < lines.length && /\|/.test(lines[i]) && lines[i].trim() !== "") i++;
        push(start, i);
        continue;
      }
      const start = i++;
      while (i < lines.length && lines[i].trim() !== "") {
        const next = lines[i].replace(/^ {0,3}/, "");
        if (/^(#{1,6})\s/.test(next) || isFenceLine(lines[i]) || /^>/.test(next)
          || /^([-*+]|\d+[.)])\s/.test(next)) break;
        i++;
      }
      push(start, i);
    }
    return blocks;
  }

  function findSourceLineForSpot(md, spot) {
    if (!spot) return null;
    const blocks = splitMdBlocks(md);
    if (!blocks.length) return estimateLineFromRatio(md, spot.ratio);
    const hintIdx = Number.isInteger(spot.index) && spot.index >= 0
      ? Math.min(spot.index, blocks.length - 1)
      : Math.round((spot.ratio || 0) * Math.max(0, blocks.length - 1));
    const key = String(spot.text || "").trim();
    if (key) {
      const hit = findMdBlockNearIndex(blocks, key, hintIdx);
      if (hit) return hit.start;
      const lineHit = findSourceLineByText(md, key, estimateLineFromRatio(md, spot.ratio));
      if (lineHit != null) return lineHit;
    }
    if (blocks[hintIdx]) return blocks[hintIdx].start;
    return estimateLineFromRatio(md, spot.ratio);
  }

  function isEmptyMdBlock(text) {
    return !String(text || "").replace(/[\u200b\s]/g, "");
  }

  function insertSnippetInMarkdown(md, blockIndex, snippet, replaceEmpty) {
    const piece = String(snippet || "").replace(/^\n+/, "").replace(/\n+$/, "");
    const blocks = splitMdBlocks(md);
    if (!blocks.length) return piece + "\n";
    if (blockIndex < 0) {
      return `${piece}\n\n${blocks.map((b) => b.text).join("\n\n")}`.replace(/\n{3,}/g, "\n\n") + "\n";
    }
    const idx = Math.max(0, Math.min(blockIndex, blocks.length - 1));
    if (replaceEmpty && isEmptyMdBlock(blocks[idx].text)) {
      blocks[idx] = { ...blocks[idx], text: piece };
    } else {
      blocks.splice(idx + 1, 0, { text: piece });
    }
    return blocks.map((b) => b.text).join("\n\n").replace(/\n{3,}/g, "\n\n") + "\n";
  }

  function topLevelBlocks(root) {
    if (!root) return [];
    return [...root.children].filter((el) => {
      if (el.nodeType !== 1) return false;
      if (el.classList.contains("molan-block-insert") || el.classList.contains("molan-insert-menu")) {
        return false;
      }
      const tag = el.tagName;
      if (tag === "BR") return false;
      return true;
    });
  }

  function closestTopBlock(node, root) {
    if (!node || !root) return null;
    let el = node.nodeType === 1 ? node : node.parentElement;
    while (el && el !== root) {
      if (el.parentElement === root) return el;
      el = el.parentElement;
    }
    return null;
  }

  function overflowParent(el) {
    let node = el;
    while (node && node !== document.documentElement) {
      const style = getComputedStyle(node);
      const oy = style.overflowY;
      if ((oy === "auto" || oy === "scroll" || oy === "overlay") && node.scrollHeight > node.clientHeight + 2) {
        return node;
      }
      node = node.parentElement;
    }
    return el;
  }

  function readingContentRoot(previewing) {
    if (previewing) return document.getElementById("molanPreviewBody");
    return document.querySelector(".vditor-ir pre.vditor-reset")
      || document.querySelector(".vditor-wysiwyg > .vditor-reset")
      || document.querySelector(".vditor-wysiwyg pre.vditor-reset")
      || document.querySelector(".vditor-sv .vditor-reset");
  }

  function readingScroller(previewing) {
    const root = readingContentRoot(previewing);
    if (root) {
      const scroller = overflowParent(root);
      if (scroller) return scroller;
    }
    if (previewing) return document.getElementById("molanPreviewBody") || document.getElementById("molanPreview");
    return document.querySelector(".vditor-ir")
      || document.querySelector(".vditor-wysiwyg")
      || document.querySelector(".vditor-sv");
  }

  function blockText(el) {
    if (!el) return "";
    const clone = el.cloneNode(true);
    clone.querySelectorAll?.(".vditor-ir__preview, .molan-diagram-toolbar, .vditor-ir__marker, .molan-block-insert").forEach((n) => n.remove());
    return String(clone.textContent || "").replace(/\s+/g, " ").trim();
  }

  function findBlockByText(blocks, text) {
    const key = String(text || "").trim();
    if (!key) return null;
    const exact = blocks.find((block) => blockText(block) === key);
    if (exact) return exact;
    const needle = key.slice(0, 48);
    return blocks.find((block) => {
      const t = blockText(block);
      return t && (t.includes(needle) || key.includes(t.slice(0, 48)));
    }) || null;
  }

  function captureReadingSpot(previewing) {
    const root = readingContentRoot(previewing);
    const scroller = readingScroller(previewing);
    if (!root || !scroller) return null;
    const box = scroller.getBoundingClientRect();
    if (box.height < 8) return null;
    const x = box.left + Math.min(Math.max(72, box.width * 0.42), Math.max(24, box.width - 16));
    const y = box.top + Math.min(32, Math.max(12, box.height * 0.08));
    const hitEl = document.elementFromPoint(x, y);
    const fromPoint = hitEl && root.contains(hitEl) ? closestTopBlock(hitEl, root) : null;
    const topY = box.top + 16;
    const blocks = topLevelBlocks(root);
    let hit = fromPoint;
    let index = hit ? blocks.indexOf(hit) : -1;
    if (!hit) {
      for (let i = 0; i < blocks.length; i += 1) {
        const rect = blocks[i].getBoundingClientRect();
        if (rect.bottom <= topY) continue;
        hit = blocks[i];
        index = i;
        break;
      }
    }
    const probeOffset = y - box.top;
    return {
      text: blockText(hit),
      index: index < 0 ? undefined : index,
      probeOffset,
      offset: probeOffset,
      scrollerHeight: box.height,
      ratio: readingScrollRatio(scroller),
      scrollTop: scroller.scrollTop,
      scrollHeight: scroller.scrollHeight,
    };
  }

  function restoreReadingSpot(previewing, spot, opts = {}) {
    if (!spot) return;
    const root = readingContentRoot(previewing);
    const scroller = readingScroller(previewing);
    if (!root || !scroller) return;
    if (opts.preferRatio) {
      const top = scrollTopFromSpot(spot, scroller);
      if (top != null) scroller.scrollTop = top;
      return;
    }
    const blocks = topLevelBlocks(root);
    const el = findBlockByText(blocks, spot.text)
      || (Number.isInteger(spot.index) ? blocks[spot.index] : null);
    if (el) {
      const box = scroller.getBoundingClientRect();
      const rect = el.getBoundingClientRect();
      const desired = typeof spot.offset === "number" ? spot.offset : 16;
      const next = scroller.scrollTop + (rect.top - box.top) - desired;
      scroller.scrollTop = Math.max(0, next);
    } else if (typeof spot.scrollTop === "number" && Math.abs((scroller.scrollHeight / Math.max(1, spot.scrollHeight || 0)) - 1) < 0.08) {
      scroller.scrollTop = spot.scrollTop;
    } else {
      const top = scrollTopFromSpot(spot, scroller);
      if (top != null) scroller.scrollTop = top;
    }
    if (!previewing && opts.caret && el) {
      const editable = el.closest("[contenteditable='true']");
      if (!editable) return;
      try { editable.focus({ preventScroll: true }); } catch (_) { /* ignore */ }
      try {
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(true);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      } catch (_) { /* ignore */ }
    }
  }

  function irRootOf(vditor) {
    const iv = vditor?.vditor || vditor;
    return iv?.ir?.element
      || document.querySelector(".vditor-ir pre.vditor-reset")
      || document.querySelector(".vditor-ir .vditor-reset");
  }

  function snippetKind(snippet) {
    const s = String(snippet || "").trim();
    if (/^```mermaid\b/i.test(s)) return "mermaid";
    if (/^```/.test(s)) return "code";
    if (/^\$\$/.test(s)) return "math";
    if (/^\|/.test(s) && s.includes("---")) return "table";
    if (/^- \[[ x]\]/i.test(s)) return "task";
    if (/^!\[[^\]]*\]\(/.test(s)) return "image";
    return "block";
  }

  function blockMatchesKind(el, kind) {
    if (!el || !kind) return false;
    if (kind === "table") return el.tagName === "TABLE" || !!el.querySelector("table");
    if (kind === "task") return !!el.querySelector('input[type="checkbox"]');
    if (kind === "image") return !!el.querySelector("img");
    if (kind === "mermaid") return !!el.querySelector(".language-mermaid, .molan-mermaid-shell");
    if (kind === "math") {
      return el.getAttribute("data-type") === "math-block"
        || !!el.querySelector(".language-math, .katex, [data-type='math-block']");
    }
    if (kind === "code") {
      return el.getAttribute("data-type") === "code-block"
        || (!!el.querySelector("pre, code") && !el.querySelector(".language-mermaid"));
    }
    return false;
  }

  function locateInsertedBlock(root, opts = {}) {
    const blocks = topLevelBlocks(root);
    if (!blocks.length) return null;
    const expected = Number.isInteger(opts.focusIndex) ? opts.focusIndex : -1;
    const kind = opts.kind || snippetKind(opts.focusText || opts.snippet);
    const pickClosest = (indices) => {
      if (!indices.length) return null;
      indices.sort((a, b) => {
        const da = expected >= 0 ? Math.abs(a - expected) : a;
        const db = expected >= 0 ? Math.abs(b - expected) : b;
        return da - db;
      });
      return blocks[indices[0]];
    };
    if (kind && kind !== "block") {
      const hits = [];
      blocks.forEach((el, i) => {
        if (blockMatchesKind(el, kind)) hits.push(i);
      });
      const matched = pickClosest(hits);
      if (matched) return matched;
    }
    const byText = findBlockByText(blocks, opts.focusText);
    if (byText) return byText;
    if (expected >= 0 && blocks[expected]) return blocks[expected];
    return null;
  }

  function pinBlockToViewport(el, viewportY) {
    const scroller = readingScroller(false);
    if (!el || !scroller) return;
    const pageX = window.scrollX;
    const pageY = window.scrollY;
    const box = scroller.getBoundingClientRect();
    if (box.height < 8) return;
    const rect = el.getBoundingClientRect();
    const desired = typeof viewportY === "number"
      ? viewportY - box.top
      : Math.min(Math.max(56, box.height * 0.28), box.height * 0.42);
    scroller.scrollTop = Math.max(0, scroller.scrollTop + (rect.top - box.top) - desired);
    if (window.scrollX !== pageX || window.scrollY !== pageY) {
      window.scrollTo(pageX, pageY);
    }
  }

  function setCaretRange(node, atEnd = false) {
    if (!node) return;
    const range = document.createRange();
    range.selectNodeContents(node);
    range.collapse(!atEnd);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function expandInsertedIr(el) {
    if (!el || el.querySelector?.(".language-mermaid")) return;
    const nodes = [];
    if (el.classList?.contains("vditor-ir__node")) nodes.push(el);
    el.querySelectorAll?.(".vditor-ir__node").forEach((n) => {
      if (!n.querySelector(".language-mermaid")) nodes.push(n);
    });
    nodes.forEach((n) => n.classList.add("vditor-ir__node--expand"));
  }

  function activateInsertedBlock(el) {
    if (!el) return;
    const isTask = !!el.querySelector?.('input[type="checkbox"]');
    if (!isTask) expandInsertedIr(el);
    const editable = el.closest("[contenteditable='true']") || el;
    try { editable.focus({ preventScroll: true }); } catch (_) { /* ignore */ }
    const table = el.tagName === "TABLE" ? el : el.querySelector("table");
    if (table) {
      const cells = [...table.querySelectorAll("tbody td, td")];
      const cell = cells.find((c) => !String(c.textContent || "").replace(/\s|\u200b/g, "")) || cells[0];
      if (cell) {
        focusTableCell(cell);
        return;
      }
    }
    if (el.querySelector('input[type="checkbox"]')) {
      const li = el.matches("li") ? el : el.querySelector("li");
      if (li) {
        setCaretRange(li, true);
        return;
      }
    }
    if (!el.querySelector(".language-mermaid")) {
      const code = el.querySelector(":scope > .vditor-ir__marker--pre code")
        || el.querySelector(".vditor-ir__marker--pre code")
        || [...el.querySelectorAll("pre, code")].find((n) => !n.closest(".vditor-ir__preview"));
      if (code) {
        setCaretRange(code, false);
        return;
      }
    }
    const img = el.querySelector("img");
    if (img) {
      const range = document.createRange();
      range.setStartAfter(img);
      range.collapse(true);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }
    try {
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          if (parent.closest(".vditor-ir__preview, .molan-diagram-toolbar, [contenteditable='false']")) {
            return NodeFilter.FILTER_REJECT;
          }
          return String(node.nodeValue || "").replace(/[\u200b\s]/g, "")
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_SKIP;
        },
      });
      const text = walker.nextNode();
      if (text) {
        const range = document.createRange();
        range.setStart(text, 0);
        range.collapse(true);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        return;
      }
      setCaretRange(el, false);
    } catch (_) { /* ignore */ }
  }
