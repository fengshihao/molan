  /* --- copy: 预览态复制保留 Markdown（加粗 / 列表 / 链接等） --- */
  let previewCopyLute = null;
  let copyGuardAt = 0;

  function getPreviewCopyLute() {
    if (previewCopyLute) return previewCopyLute;
    if (typeof global.Lute?.New === "function") {
      try {
        previewCopyLute = global.Lute.New();
      } catch (_) {
        previewCopyLute = null;
      }
    }
    return previewCopyLute;
  }

  function scrubPreviewCopyClone(host) {
    if (!host) return;
    host.querySelectorAll([
      ".molan-diagram-toolbar",
      ".molan-ask-section",
      ".molan-block-insert",
      ".molan-insert-menu",
      ".molan-feedback",
      ".vditor-copy",
      ".vditor-speech",
      "button",
      "audio",
      "video",
    ].join(", ")).forEach((el) => el.remove());
  }

  function markdownFromPreviewHtml(html) {
    const raw = String(html || "").trim();
    if (!raw) return "";
    const lute = getPreviewCopyLute();
    if (!lute || typeof lute.HTML2Md !== "function") return "";
    try {
      return String(lute.HTML2Md(raw) || "").replace(/^\n+/, "").replace(/\n+$/, "");
    } catch (_) {
      return "";
    }
  }

  function expandMarkdownSpan(source, start, end) {
    const src = String(source || "");
    let s = Math.max(0, start);
    let e = Math.min(src.length, end);
    if (s >= e) return null;

    let changed = true;
    while (changed) {
      changed = false;
      const link = src.slice(e).match(/^\]\([^)]*\)/);
      if (link && src.slice(s - 1, s) === "[") {
        s -= 1;
        e += link[0].length;
        if (src.slice(s - 1, s) === "!") s -= 1;
        changed = true;
        continue;
      }
      for (const mark of ["**", "~~", "__"]) {
        if (src.slice(s - mark.length, s) === mark && src.slice(e, e + mark.length) === mark) {
          s -= mark.length;
          e += mark.length;
          changed = true;
        }
      }
      if (changed) continue;
      for (const mark of ["*", "_", "`"]) {
        if (src.slice(s - 1, s) !== mark || src.slice(e, e + 1) !== mark) continue;
        if (mark === "*" && (src.slice(s - 2, s) === "**" || src.slice(e, e + 2) === "**")) continue;
        if (mark === "_" && (src.slice(s - 2, s) === "__" || src.slice(e, e + 2) === "__")) continue;
        s -= 1;
        e += 1;
        changed = true;
      }
    }

    const lineStart = src.lastIndexOf("\n", s - 1) + 1;
    const prefix = src.slice(lineStart, s);
    const lineEndIdx = src.indexOf("\n", e);
    const lineEnd = lineEndIdx < 0 ? src.length : lineEndIdx;
    const tail = src.slice(e, lineEnd);
    if (tail.trim() === "") {
      if (/^ {0,3}([-*+]|\d+[.)])(?: \[[ xX]\])? $/.test(prefix) || /^#{1,6} $/.test(prefix) || /^ {0,3}> ?/.test(prefix)) {
        s = lineStart;
        e = lineEnd;
      }
    }
    return { start: s, end: e };
  }

  function markdownFromPreviewSource(source, root, range) {
    const quote = range.toString();
    if (!String(quote || "").replace(/\s+/g, "")) return "";
    if (typeof pickCollapsedSpan !== "function") return "";
    const around = typeof surroundingFromRange === "function"
      ? surroundingFromRange(root, range)
      : { before: "", after: "" };
    const hit = pickCollapsedSpan(source, quote, around.before, around.after);
    if (!hit) return "";
    const span = expandMarkdownSpan(source, hit.start, hit.end) || hit;
    return String(source).slice(span.start, span.end);
  }

  function isPipeTableMarkdown(text) {
    const lines = String(text || "").split("\n");
    if (lines.length < 2) return false;
    return /\|/.test(lines[0]) && /^\s*\|?[\s:|-]*-{3,}/.test(lines[1]);
  }

  function tableElementFromRange(root, range) {
    if (!root || !range) return null;
    let node = range.commonAncestorContainer;
    if (node?.nodeType === 3) node = node.parentElement;
    const table = node?.closest?.("table");
    if (!table || !root.contains(table)) return null;
    return table;
  }

  function markdownFromPreviewTable(source, root, range) {
    if (!root || !range || typeof topLevelBlocks !== "function" || typeof splitMdBlocks !== "function") {
      return "";
    }
    const tableEl = tableElementFromRange(root, range);
    if (!tableEl) return "";
    const mdBlocks = splitMdBlocks(source);
    const blocks = topLevelBlocks(root);
    const host = typeof closestTopBlock === "function" ? closestTopBlock(tableEl, root) : null;
    if (host && blocks.length && mdBlocks.length === blocks.length) {
      const idx = blocks.indexOf(host);
      if (idx >= 0) {
        const md = mdBlocks[idx]?.text;
        if (isPipeTableMarkdown(md)) return md;
      }
    }
    const anchor = flattenTableCopyAnchor(tableEl);
    if (!anchor) return "";
    const hit = mdBlocks.find((b) => isPipeTableMarkdown(b.text) && tableMarkdownMatchesAnchor(b.text, anchor));
    return hit?.text || "";
  }

  function flattenTableCopyAnchor(table) {
    if (!table) return "";
    return [...table.querySelectorAll("th, td")]
      .map((cell) => String(cell.textContent || "").replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join("\t");
  }

  function tableMarkdownMatchesAnchor(md, anchor) {
    const cells = String(anchor || "").split("\t").filter(Boolean);
    if (!cells.length) return false;
    const compact = String(md || "").replace(/\s+/g, " ");
    return cells.every((cell) => compact.includes(cell.replace(/\s+/g, " ")));
  }

  function markdownFromPreviewBlocks(source, root, range) {
    if (typeof topLevelBlocks !== "function" || typeof splitMdBlocks !== "function") return "";
    const blocks = topLevelBlocks(root);
    const mdBlocks = splitMdBlocks(source);
    if (!blocks.length || mdBlocks.length !== blocks.length) return "";
    let first = -1;
    let last = -1;
    for (let i = 0; i < blocks.length; i += 1) {
      try {
        if (!range.intersectsNode(blocks[i])) continue;
      } catch (_) {
        continue;
      }
      if (first < 0) first = i;
      last = i;
    }
    if (first < 0) return "";
    const firstBlock = blocks[first];
    const lastBlock = blocks[last];
    try {
      const startCmp = range.compareBoundaryPoints(Range.START_TO_START, (() => {
        const r = document.createRange();
        r.selectNodeContents(firstBlock);
        return r;
      })());
      const endCmp = range.compareBoundaryPoints(Range.END_TO_END, (() => {
        const r = document.createRange();
        r.selectNodeContents(lastBlock);
        return r;
      })());
      // 只在几乎整块选中时走块级回退，避免半段选中却整段复制
      if (startCmp > 0 || endCmp < 0) {
        const selected = collapseWs(range.toString());
        const covered = collapseWs(mdBlocks.slice(first, last + 1).map((b) => b.text).join("\n"));
        if (!selected || !covered || selected.length < covered.length * 0.85) return "";
      }
    } catch (_) {
      return "";
    }
    return mdBlocks.slice(first, last + 1).map((b) => b.text).join("\n\n");
  }

  function normalizeCodeText(text) {
    return String(text || "").replace(/\u200b/g, "").replace(/\r\n/g, "\n").replace(/\n+$/, "");
  }

  function codeTextKey(text) {
    return normalizeCodeText(text).replace(/^\n/, "");
  }

  function parseFenceBlock(text) {
    const lines = String(text || "").replace(/\r\n/g, "\n").split("\n");
    if (lines.length < 2) return null;
    const open = lines[0].match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (!open) return null;
    const mark = open[1][0];
    const len = open[1].length;
    let closeAt = lines.length;
    for (let i = 1; i < lines.length; i += 1) {
      const found = lines[i].match(/^ {0,3}(`{3,}|~{3,})\s*$/);
      if (found && found[1][0] === mark && found[1].length >= len) {
        closeAt = i;
        break;
      }
    }
    if (closeAt >= lines.length) return null;
    const info = String(open[2] || "").trim();
    const token = info.split(/\s+/)[0] || "";
    const lang = token.split(String.fromCharCode(123))[0].replace(/,$/, "");
    return {
      lang,
      body: lines.slice(1, closeAt).join("\n"),
      raw: lines.slice(0, closeAt + 1).join("\n"),
    };
  }

  function canonicalCodeLang(lang) {
    const key = String(lang || "").trim().toLowerCase();
    const alias = {
      js: "javascript",
      javascript: "javascript",
      jsx: "javascript",
      ts: "typescript",
      typescript: "typescript",
      tsx: "typescript",
      py: "python",
      python: "python",
      sh: "bash",
      shell: "bash",
      bash: "bash",
      zsh: "bash",
      yml: "yaml",
      yaml: "yaml",
      md: "markdown",
      markdown: "markdown",
      html: "xml",
      svg: "xml",
      xml: "xml",
    };
    return alias[key] || key;
  }

  function fenceMarkdown(lang, body) {
    const info = String(lang || "").trim().split(/\s+/)[0] || "";
    const safe = /^[A-Za-z0-9_+#.-]*$/.test(info) ? info : "";
    const text = codeTextKey(body);
    let fence = "```";
    while (text.includes(fence) || safe.includes(fence)) fence += "`";
    return `${fence}${safe}\n${text}\n${fence}`;
  }

  function findSourceFence(source, codeNorm, langHint) {
    if (!codeNorm || typeof splitMdBlocks !== "function") return null;
    const hits = [];
    for (const block of splitMdBlocks(source)) {
      const fence = parseFenceBlock(block.text);
      if (!fence || codeTextKey(fence.body) !== codeNorm) continue;
      hits.push(fence);
    }
    if (!hits.length) return null;
    if (hits.length === 1) return hits[0];
    const hint = canonicalCodeLang(langHint);
    return hits.find((fence) => canonicalCodeLang(fence.lang) === hint) || hits[0];
  }

  function fencedMarkdownForCodeSelection(source, selected, codeText, langHint) {
    const selectedKey = codeTextKey(selected);
    if (!selectedKey) return "";
    const fence = findSourceFence(source, codeTextKey(codeText), langHint);
    if (fence && selectedKey === codeTextKey(fence.body)) return fence.raw;
    const domLang = String(langHint || "").trim().toLowerCase();
    const lang = fence
      ? fence.lang
      : (domLang === "plaintext" || domLang === "undefined" ? "" : langHint);
    return fenceMarkdown(lang, selectedKey);
  }

  function closestPre(node) {
    const el = node?.nodeType === 1 ? node : node?.parentElement;
    if (!el) return null;
    if (el.tagName === "PRE") return el;
    return el.closest?.("pre") || null;
  }

  function preFromBoundary(container, offset, isStart) {
    if (!container) return null;
    if (container.nodeType === 3) return closestPre(container);
    if (container.nodeType !== 1) return null;
    const index = isStart ? offset : offset - 1;
    const child = index >= 0 ? container.childNodes[index] : null;
    if (child) {
      const fromChild = closestPre(child);
      if (fromChild) return fromChild;
    }
    return closestPre(container);
  }

  function clipRangeToElement(el, range) {
    if (!el || !range) return null;
    const clipped = range.cloneRange();
    const bound = document.createRange();
    bound.selectNodeContents(el);
    try {
      if (clipped.compareBoundaryPoints(Range.START_TO_START, bound) < 0) {
        clipped.setStart(bound.startContainer, bound.startOffset);
      }
      if (clipped.compareBoundaryPoints(Range.END_TO_END, bound) > 0) {
        clipped.setEnd(bound.endContainer, bound.endOffset);
      }
    } catch (_) {
      return null;
    }
    if (clipped.collapsed) return null;
    return clipped;
  }

  function codeLanguage(pre, code) {
    const names = `${code?.className || ""} ${pre?.className || ""}`.split(/\s+/);
    for (const name of names) {
      const found = /^(?:language|lang)-([A-Za-z0-9_+-]+)$/.exec(name);
      if (!found) continue;
      const lang = found[1].toLowerCase();
      if (!lang || lang === "undefined" || lang === "plaintext" || lang === "hljs") continue;
      return found[1];
    }
    return "";
  }

  function skipPreviewCodePre(pre) {
    if (!pre || !pre.querySelector?.("code")) return true;
    if (pre.classList?.contains("vditor-ir__marker--pre")) return true;
    if (pre.closest?.(".vditor-ir__marker--pre, .language-mermaid, .molan-mermaid-shell")) return true;
    const lang = codeLanguage(pre, pre.querySelector("code")).toLowerCase();
    if (lang === "mermaid" || lang === "math" || lang === "katex") return true;
    return !!pre.querySelector(".language-mermaid, .language-math, .katex, .katex-display");
  }

  function codeBodyText(code) {
    if (!code) return "";
    const clone = code.cloneNode(true);
    clone.querySelectorAll(".vditor-copy, button, .hljs-ln-numbers").forEach((el) => el.remove());
    return clone.textContent || "";
  }

  function markdownFromPreviewCode(source, root, range) {
    if (!root || !range || range.collapsed) return "";
    const startPre = preFromBoundary(range.startContainer, range.startOffset, true);
    const endPre = preFromBoundary(range.endContainer, range.endOffset, false);
    if (!startPre || startPre !== endPre || !root.contains(startPre) || skipPreviewCodePre(startPre)) return "";
    const code = startPre.querySelector(":scope > code") || startPre.querySelector("code");
    if (!code) return "";
    const clipped = clipRangeToElement(code, range);
    if (!clipped) return "";
    return fencedMarkdownForCodeSelection(
      source,
      clipped.toString(),
      codeBodyText(code),
      codeLanguage(startPre, code),
    );
  }

  function normalizeTex(value) {
    return String(value || "")
      .replace(/^\s*\\displaystyle\s*/, "")
      .replace(/\s+/g, "")
      .trim();
  }

  function findMathSpansInSource(source) {
    const src = String(source || "");
    const hits = [];
    let i = 0;
    const atLineStart = (index) => index === 0 || src[index - 1] === "\n";
    while (i < src.length) {
      if (atLineStart(i)) {
        const indent = src.slice(i).match(/^ {0,3}(`{3,}|~{3,})/);
        if (indent) {
          const fence = indent[1];
          const nl = src.indexOf("\n", i + indent[0].length);
          if (nl < 0) break;
          const close = src.indexOf(`\n${fence}`, nl);
          if (close < 0) break;
          i = close + 1 + fence.length;
          continue;
        }
      }
      if (src[i] === "`") {
        let ticks = 1;
        while (src[i + ticks] === "`") ticks += 1;
        const close = src.indexOf("`".repeat(ticks), i + ticks);
        i = close < 0 ? src.length : close + ticks;
        continue;
      }
      if (src.startsWith("$$", i) && src[i - 1] !== "\\") {
        const close = src.indexOf("$$", i + 2);
        if (close < 0) break;
        hits.push({
          start: i,
          end: close + 2,
          display: true,
          tex: src.slice(i + 2, close),
          raw: src.slice(i, close + 2),
        });
        i = close + 2;
        continue;
      }
      if (src[i] === "$" && src[i - 1] !== "\\") {
        let close = i + 1;
        let found = -1;
        while (close < src.length) {
          if (src[close] === "\n") break;
          if (src[close] === "$" && src[close - 1] !== "\\") {
            found = close;
            break;
          }
          close += 1;
        }
        if (found < 0) {
          i += 1;
          continue;
        }
        const tex = src.slice(i + 1, found);
        if (tex) {
          hits.push({
            start: i,
            end: found + 1,
            display: false,
            tex,
            raw: src.slice(i, found + 1),
          });
        }
        i = found + 1;
        continue;
      }
      i += 1;
    }
    return hits;
  }

  function pickMathRawFromSource(source, texHint, displayHint, blockRaw) {
    const hits = findMathSpansInSource(source);
    if (!hits.length) return "";
    const want = normalizeTex(texHint);
    let pool = want ? hits.filter((hit) => normalizeTex(hit.tex) === want) : hits;
    if (!pool.length) return "";
    if (displayHint === true) {
      const display = pool.filter((hit) => hit.display);
      if (display.length) pool = display;
    } else if (displayHint === false) {
      const inline = pool.filter((hit) => !hit.display);
      if (inline.length) pool = inline;
    }
    const block = String(blockRaw || "");
    if (pool.length > 1 && block) {
      const inBlock = pool.filter((hit) => block.includes(hit.raw));
      if (inBlock.length) pool = inBlock;
    }
    if (pool.length === 1) return pool[0].raw;
    if (block) {
      const blockHits = findMathSpansInSource(block);
      const matched = want
        ? blockHits.filter((hit) => normalizeTex(hit.tex) === want)
        : blockHits;
      if (matched.length === 1) return matched[0].raw;
      const trimmed = block.trim();
      if (/^\$\$[\s\S]*\$\$$/.test(trimmed)) return trimmed;
    }
    return "";
  }

  function isDisplayMathEl(el) {
    if (!el) return false;
    if (el.classList?.contains("katex-display")) return true;
    if (el.getAttribute?.("data-type") === "math-block") return true;
    if (el.classList?.contains("language-math") && el.tagName !== "SPAN") return true;
    return !!el.closest?.(".katex-display, [data-type='math-block'], div.language-math, pre.language-math");
  }

  function mathHostsInRange(root, range) {
    if (!root || !range) return [];
    const selector = ".katex-display, [data-type='math-block'], .language-math, [data-type='math-inline'], .katex";
    const seen = [];
    root.querySelectorAll(selector).forEach((el) => {
      try {
        if (!range.intersectsNode(el)) return;
      } catch (_) {
        return;
      }
      seen.push(el);
    });
    return seen.filter((el) => !seen.some((other) => other !== el && other.contains(el)));
  }

  function texFromMathEl(el) {
    const dataEl = el?.hasAttribute?.("data-math") ? el : el?.closest?.("[data-math]");
    const dataMath = dataEl?.getAttribute?.("data-math");
    if (dataMath) return String(dataMath).trim();
    const ann = el?.querySelector?.('annotation[encoding="application/x-tex"]');
    if (ann) return String(ann.textContent || "").trim();
    const code = el?.matches?.("code") ? el : el?.querySelector?.("code");
    if (code && !code.querySelector(".katex")) return String(code.textContent || "").trim();
    return "";
  }

  function selectionIsMostlyMath(range, mathEl) {
    let node = range.commonAncestorContainer;
    if (node?.nodeType === 3) node = node.parentElement;
    if (mathEl.contains(node) || node === mathEl) return true;
    try {
      const wrap = document.createElement("div");
      wrap.appendChild(range.cloneContents());
      wrap.querySelectorAll(".katex, .katex-display, .language-math, [data-type='math-inline'], [data-type='math-block']").forEach((el) => el.remove());
      wrap.querySelectorAll("annotation").forEach((el) => el.remove());
      return collapseWs(wrap.textContent).length <= 2;
    } catch (_) {
      return false;
    }
  }

  function mathBlockRawFromMap(source, root, mathEl) {
    if (typeof topLevelBlocks !== "function" || typeof splitMdBlocks !== "function") return "";
    const host = typeof closestTopBlock === "function" ? closestTopBlock(mathEl, root) : null;
    const blocks = topLevelBlocks(root);
    const mdBlocks = splitMdBlocks(source);
    if (!host || mdBlocks.length !== blocks.length) return "";
    const idx = blocks.indexOf(host);
    if (idx < 0) return "";
    return mdBlocks[idx]?.text || "";
  }

  function markdownFromPreviewMath(source, root, range) {
    if (!root || !range || range.collapsed) return "";
    const hosts = mathHostsInRange(root, range);
    if (hosts.length !== 1) return "";
    const mathEl = hosts[0];
    if (!selectionIsMostlyMath(range, mathEl)) return "";
    const blockRaw = mathBlockRawFromMap(source, root, mathEl);
    return pickMathRawFromSource(
      source,
      texFromMathEl(mathEl),
      isDisplayMathEl(mathEl),
      blockRaw,
    );
  }

  function markdownFromPreviewSelection(root, range, source) {
    if (!root || !range) return "";
    const clipped = typeof clipRangeToRoot === "function" ? clipRangeToRoot(root, range) : range;
    const fromCode = markdownFromPreviewCode(source, root, clipped);
    if (fromCode) return fromCode;
    const fromMath = markdownFromPreviewMath(source, root, clipped);
    if (fromMath) return fromMath;
    const fromTable = markdownFromPreviewTable(source, root, clipped);
    if (fromTable) return fromTable;

    const fromSource = markdownFromPreviewSource(source, root, clipped);
    const temp = document.createElement("div");
    try {
      temp.appendChild(clipped.cloneContents());
    } catch (_) {
      return fromSource || String(clipped.toString() || "");
    }
    scrubPreviewCopyClone(temp);
    const fromHtml = markdownFromPreviewHtml(temp.innerHTML);
    const fromBlocks = markdownFromPreviewBlocks(source, root, clipped);
    const plain = String(clipped.toString() || "");

    // 优先保留原文切片（含 ** / 链接 / 列表符）；HTML2Md 处理跨格式混选；整块作回退
    const ranked = [fromSource, fromHtml, fromBlocks]
      .map((v) => String(v || "").replace(/\s+$/g, "").replace(/^\n+/, ""))
      .filter(Boolean);
    if (!ranked.length) return plain;
    const rich = ranked.find((v) => /(?:\*\*|__|~~|`|\[[^\]]+\]\([^)]+\)|^ {0,3}([-*+]|\d+[.)])\s|^#{1,6}\s)/m.test(v));
    return rich || ranked[0] || plain;
  }

  function writePreviewCopy(text, event) {
    const value = String(text ?? "");
    if (!value) return;
    try {
      event?.clipboardData?.setData("text/plain", value);
    } catch (_) { /* ignore */ }
    writeCutClipboard(value);
  }

  function performPreviewCopy(getRoot, isPreviewing, getMarkdown, event) {
    const now = Date.now();
    if (now - copyGuardAt < 80) return "repeat";
    if (!isPreviewing?.()) return "skip";
    const field = document.activeElement;
    if (field) {
      const tag = field.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || field.isContentEditable) return "skip";
    }
    const root = getRoot?.();
    const sel = window.getSelection();
    if (!root || !sel || !sel.rangeCount || sel.isCollapsed) return "skip";
    const range = sel.getRangeAt(0);
    if (typeof rangeTouchesRoot === "function" && !rangeTouchesRoot(root, range)) return "skip";
    const md = markdownFromPreviewSelection(root, range, getMarkdown?.() || "");
    if (!md) return "skip";
    // 与浏览器默认纯文本相同则不必拦截（避免多余 host 写剪贴板）
    if (md === range.toString()) return "skip";
    writePreviewCopy(md, event);
    copyGuardAt = now;
    return "copy";
  }

  function bindPreviewCopy(getRoot, isPreviewing, getMarkdown) {
    if (bindPreviewCopy.bound) return;
    bindPreviewCopy.bound = true;
    document.addEventListener("copy", (event) => {
      const result = performPreviewCopy(getRoot, isPreviewing, getMarkdown, event);
      if (result === "skip") return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }, true);
  }
