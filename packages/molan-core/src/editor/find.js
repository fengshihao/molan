  /* --- find: 文中查找 --- */
  const findState = {
    open: false,
    query: "",
    caseSensitive: false,
    matches: [],
    index: 0,
    composing: false,
    refreshTimer: 0,
    observer: null,
    animToken: 0,
  };

  function hasHighlightApi() {
    return typeof global.Highlight === "function" && global.CSS && CSS.highlights;
  }

  function getSearchRoot() {
    const wrap = document.getElementById("editorWrap");
    if (wrap && !wrap.classList.contains("visible")) return null;
    if (wrap?.classList.contains("is-lite-preview")) {
      return document.getElementById("molanPreviewBody")
        || document.getElementById("molanPreview")
        || wrap;
    }
    const previewBtn = document.querySelector('.vditor-toolbar [data-type="preview"]');
    const previewOn = previewBtn?.classList.contains("vditor-menu--current");
    if (previewOn) {
      return document.querySelector(".vditor-preview") || document.getElementById("vditor");
    }
    return document.querySelector(".vditor-ir")
      || document.querySelector(".vditor-wysiwyg")
      || document.querySelector(".vditor-sv")
      || document.getElementById("vditor");
  }

  function shouldSkipFindNode(el) {
    while (el && el.nodeType === 1) {
      const tag = el.tagName;
      if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") return true;
      if (el.classList.contains("molan-diagram-toolbar")) return true;
      if (el.classList.contains("molan-find-bar")) return true;
      if (el.classList.contains("vditor-ir__marker")) {
        const node = el.closest(".vditor-ir__node");
        if (!node || !node.classList.contains("vditor-ir__node--expand")) return true;
      }
      el = el.parentElement;
    }
    return false;
  }

  function collectFindTextNodes(root) {
    if (!root) return [];
    const nodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
        if (shouldSkipFindNode(node.parentElement)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let current = walker.nextNode();
    while (current) {
      nodes.push(current);
      current = walker.nextNode();
    }
    return nodes;
  }

  function buildFindRanges(nodes, query, caseSensitive) {
    if (!query || !nodes.length) return [];
    const parts = nodes.map((node) => node.nodeValue || "");
    const hay = caseSensitive ? parts.join("") : parts.join("").toLowerCase();
    const needle = caseSensitive ? query : query.toLowerCase();
    const starts = [];
    let acc = 0;
    for (let i = 0; i < parts.length; i += 1) {
      starts.push(acc);
      acc += parts[i].length;
    }
    const posAt = (index) => {
      let lo = 0;
      let hi = starts.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (starts[mid] <= index) lo = mid;
        else hi = mid - 1;
      }
      return { node: nodes[lo], offset: index - starts[lo] };
    };
    const ranges = [];
    let from = 0;
    while (from <= hay.length - needle.length) {
      const at = hay.indexOf(needle, from);
      if (at < 0) break;
      const start = posAt(at);
      const end = posAt(at + needle.length - 1);
      try {
        const range = document.createRange();
        range.setStart(start.node, start.offset);
        range.setEnd(end.node, end.offset + 1);
        ranges.push(range);
      } catch (_) { /* DOM 在搜索中途变了 */ }
      from = at + needle.length;
    }
    return ranges;
  }

  function clearFindHighlights() {
    try {
      CSS.highlights?.delete("molan-find");
      CSS.highlights?.delete("molan-find-current");
    } catch (_) { /* ignore */ }
  }

  function paintFindMatches() {
    const { matches, index } = findState;
    clearFindHighlights();
    if (!matches.length) return;
    if (hasHighlightApi()) {
      const rest = new Highlight();
      const current = new Highlight();
      matches.forEach((range, i) => {
        if (i === index) current.add(range);
        else rest.add(range);
      });
      CSS.highlights.set("molan-find", rest);
      CSS.highlights.set("molan-find-current", current);
      return;
    }
    try {
      const sel = global.getSelection();
      sel.removeAllRanges();
      sel.addRange(matches[index]);
    } catch (_) { /* ignore */ }
  }

  function scrollMatchIntoView(range) {
    if (!range) return;
    let el = range.startContainer;
    if (el.nodeType !== 1) el = el.parentElement;
    let scroller = el;
    while (scroller && scroller !== document.body) {
      const style = getComputedStyle(scroller);
      const oy = style.overflowY;
      if ((oy === "auto" || oy === "scroll" || oy === "overlay") && scroller.scrollHeight > scroller.clientHeight + 4) {
        break;
      }
      scroller = scroller.parentElement;
    }
    if (!scroller || scroller === document.body) {
      scroller = document.querySelector(".vditor-ir")
        || document.querySelector(".vditor-preview")
        || document.querySelector(".vditor-content");
    }
    if (!scroller) {
      try { range.startContainer.parentElement?.scrollIntoView({ block: "center" }); } catch (_) { /* ignore */ }
      return;
    }
    const rect = range.getBoundingClientRect();
    const box = scroller.getBoundingClientRect();
    if (rect.top < box.top + 48 || rect.bottom > box.bottom - 48) {
      scroller.scrollTo({
        top: scroller.scrollTop + (rect.top - box.top) - box.height * 0.28,
        behavior: "smooth",
      });
    }
  }

  function updateFindCount() {
    const countEl = document.getElementById("molanFindCount");
    const input = document.getElementById("molanFindInput");
    if (!countEl) return;
    const total = findState.matches.length;
    if (!findState.query) {
      countEl.textContent = "";
      input?.classList.remove("is-empty");
      return;
    }
    if (!total) {
      countEl.textContent = t("findNoMatch");
      input?.classList.add("is-empty");
      return;
    }
    countEl.textContent = t("findMatchCount", { current: findState.index + 1, total });
    input?.classList.remove("is-empty");
  }

  function runFind({ keepIndex = false, reveal = true } = {}) {
    const input = document.getElementById("molanFindInput");
    const query = (input?.value || "").trim();
    findState.query = query;
    const prevIndex = findState.index;
    findState.matches = query
      ? buildFindRanges(collectFindTextNodes(getSearchRoot()), query, findState.caseSensitive)
      : [];
    if (!findState.matches.length) {
      findState.index = 0;
    } else if (keepIndex) {
      findState.index = Math.min(prevIndex, findState.matches.length - 1);
    } else {
      findState.index = 0;
    }
    paintFindMatches();
    updateFindCount();
    if (reveal && findState.matches[findState.index]) {
      scrollMatchIntoView(findState.matches[findState.index]);
    }
  }

  function moveFind(delta) {
    if (!findState.open) {
      openFind();
      return;
    }
    if (!findState.matches.length) {
      runFind({ reveal: true });
      return;
    }
    const total = findState.matches.length;
    findState.index = (findState.index + delta + total) % total;
    paintFindMatches();
    updateFindCount();
    scrollMatchIntoView(findState.matches[findState.index]);
  }

  function selectedTextForFind() {
    const sel = global.getSelection();
    if (!sel || sel.isCollapsed) return "";
    const text = String(sel).replace(/\s+/g, " ").trim();
    if (!text || text.length > 180) return "";
    return text;
  }

  function applyFindI18n() {
    const input = document.getElementById("molanFindInput");
    const prev = document.getElementById("molanFindPrev");
    const next = document.getElementById("molanFindNext");
    const close = document.getElementById("molanFindClose");
    const caseBtn = document.getElementById("molanFindCase");
    const bar = document.getElementById("molanFindBar");
    const btn = document.getElementById("molanFindBtn");
    if (input) {
      input.placeholder = t("findPlaceholder");
      input.setAttribute("aria-label", t("findAria"));
    }
    if (bar) bar.setAttribute("aria-label", t("findAria"));
    if (prev) {
      prev.title = t("findPrev");
      prev.setAttribute("aria-label", t("findPrev"));
    }
    if (next) {
      next.title = t("findNext");
      next.setAttribute("aria-label", t("findNext"));
    }
    if (close) {
      close.title = t("findClose");
      close.setAttribute("aria-label", t("findClose"));
    }
    if (caseBtn) {
      caseBtn.title = t("findCase");
      caseBtn.setAttribute("aria-label", t("findCase"));
    }
    if (btn) {
      btn.title = t("findAria");
      btn.setAttribute("aria-label", t("findAria"));
    }
    updateFindCount();
  }

  const FIND_ICON = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/><path d="M20 20l-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  function paintFindButton(btn) {
    if (!btn) return;
    btn.id = "molanFindBtn";
    btn.className = "icon-btn molan-find-btn";
    btn.type = "button";
    if (!btn.querySelector("svg") || btn.classList.contains("chip") || btn.textContent.trim()) {
      btn.innerHTML = FIND_ICON;
    }
  }

  function ensureFindButton() {
    const actions = document.querySelector(".reader-actions");
    let btn = document.getElementById("molanFindBtn");
    if (!btn && actions) {
      btn = document.createElement("button");
      actions.insertBefore(btn, actions.firstChild);
    }
    paintFindButton(btn);
    if (btn && !btn.dataset.bound) {
      btn.dataset.bound = "1";
      btn.addEventListener("click", () => openFind());
    }
  }

  function observeFindTarget(root) {
    if (findState.observer) {
      findState.observer.disconnect();
      findState.observer = null;
    }
    if (!root || typeof MutationObserver !== "function") return;
    findState.observer = new MutationObserver(() => {
      if (!findState.open || !findState.query || findState.composing) return;
      clearTimeout(findState.refreshTimer);
      findState.refreshTimer = setTimeout(() => runFind({ keepIndex: true, reveal: false }), 180);
    });
    findState.observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
    });
  }

  function prefersReducedMotion() {
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (_) {
      return false;
    }
  }

  function openFind() {
    closeType();
    closeSourceView();
    initFind();
    const bar = document.getElementById("molanFindBar");
    const input = document.getElementById("molanFindInput");
    const header = document.querySelector(".reader-header");
    if (!bar || !input) return;
    const picked = selectedTextForFind();
    if (picked) input.value = picked;
    findState.animToken += 1;
    const already = findState.open && bar.classList.contains("is-open");
    findState.open = true;
    bar.hidden = false;
    header?.classList.add("is-finding");
    document.querySelector(".main")?.classList.add("is-finding");
    if (!already) {
      bar.classList.remove("is-out", "is-open");
      void bar.offsetWidth;
      bar.classList.add("is-open");
    }
    applyFindI18n();
    runFind({ keepIndex: false, reveal: true });
    input.focus();
    input.select();
  }

  function closeFind() {
    const bar = document.getElementById("molanFindBar");
    const header = document.querySelector(".reader-header");
    if (!findState.open) return;
    const current = findState.matches[findState.index];
    findState.open = false;
    const token = ++findState.animToken;
    bar?.classList.remove("is-open");
    bar?.classList.add("is-out");

    const finish = () => {
      if (token !== findState.animToken) return;
      if (bar) {
        bar.hidden = true;
        bar.classList.remove("is-out");
      }
      header?.classList.remove("is-finding");
      document.querySelector(".main")?.classList.remove("is-finding");
      clearFindHighlights();
      if (current) {
        try {
          const sel = global.getSelection();
          const caret = current.cloneRange();
          caret.collapse(true);
          sel.removeAllRanges();
          sel.addRange(caret);
        } catch (_) { /* ignore */ }
      }
      findState.matches = [];
      findState.index = 0;
    };

    if (!bar || prefersReducedMotion()) {
      finish();
      return;
    }
    bar.addEventListener("animationend", (e) => {
      if (e.target === bar) finish();
    }, { once: true });
    window.setTimeout(finish, 280);
  }

  function handleFindKey(e) {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const mod = e.metaKey || e.ctrlKey;
    const inFind = e.target && e.target.id === "molanFindInput";

    if (mod && key === "f" && !e.shiftKey && !e.altKey) {
      e.preventDefault();
      e.stopPropagation();
      openFind();
      return;
    }
    if ((mod && key === "g" && !e.altKey) || e.key === "F3") {
      e.preventDefault();
      e.stopPropagation();
      moveFind(e.shiftKey ? -1 : 1);
      return;
    }
    if (e.key === "Escape" && findState.open) {
      e.preventDefault();
      e.stopPropagation();
      closeFind();
      return;
    }
    if (!inFind) return;
    if (e.key === "Enter") {
      e.preventDefault();
      moveFind(e.shiftKey ? -1 : 1);
    }
  }

  function initFind() {
    if (initFind.done) {
      ensureFindButton();
      applyFindI18n();
      return;
    }
    initFind.done = true;
    ensureFindButton();
    if (!document.getElementById("molanFindBar")) {
      const host = document.querySelector(".main") || document.body;
      const bar = document.createElement("div");
      bar.id = "molanFindBar";
      bar.className = "molan-find-bar";
      bar.hidden = true;
      bar.setAttribute("role", "search");
      bar.innerHTML = `
        <input class="molan-find-input" id="molanFindInput" type="search" autocomplete="off" spellcheck="false" enterkeyhint="search" />
        <span class="molan-find-count" id="molanFindCount" aria-live="polite"></span>
        <button type="button" class="molan-find-case" id="molanFindCase" aria-pressed="false">Aa</button>
        <button type="button" class="icon-btn" id="molanFindPrev">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 14l6-6 6 6"/></svg>
        </button>
        <button type="button" class="icon-btn" id="molanFindNext">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 10l6 6 6-6"/></svg>
        </button>
        <button type="button" class="icon-btn" id="molanFindClose">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
      `;
      host.appendChild(bar);

      const input = bar.querySelector("#molanFindInput");
      const caseBtn = bar.querySelector("#molanFindCase");
      input.addEventListener("compositionstart", () => { findState.composing = true; });
      input.addEventListener("compositionend", () => {
        findState.composing = false;
        runFind({ keepIndex: false, reveal: true });
      });
      input.addEventListener("input", () => {
        if (findState.composing) return;
        runFind({ keepIndex: false, reveal: true });
      });
      caseBtn.addEventListener("click", () => {
        findState.caseSensitive = !findState.caseSensitive;
        caseBtn.classList.toggle("is-on", findState.caseSensitive);
        caseBtn.setAttribute("aria-pressed", findState.caseSensitive ? "true" : "false");
        runFind({ keepIndex: false, reveal: true });
      });
      bar.querySelector("#molanFindPrev").addEventListener("click", () => moveFind(-1));
      bar.querySelector("#molanFindNext").addEventListener("click", () => moveFind(1));
      bar.querySelector("#molanFindClose").addEventListener("click", () => closeFind());
    }
    applyFindI18n();
    document.addEventListener("keydown", handleFindKey, true);
  }
