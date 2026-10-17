  /* --- mermaid-preview: 预览区流程图工具条与源码回填 --- */
  function bindPreviewCodeCopy() {
    if (document.documentElement.dataset.molanCodeCopy === "1") return;
    document.documentElement.dataset.molanCodeCopy = "1";
    document.addEventListener("click", async (e) => {
      const hit = e.target.closest?.(".vditor-copy");
      if (!hit) return;
      if (hit.closest(".language-mermaid, .molan-mermaid-shell, .molan-diagram-toolbar")) return;
      const pre = hit.closest("pre");
      const code = pre?.querySelector("code");
      const text = (code?.textContent || "").replace(/\n$/, "");
      if (!text) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      try {
        await copyTextToClipboard(text);
        toast(t("copiedCode"));
      } catch (err) {
        console.warn(err);
        toast(t("copyFail"));
      }
    }, true);
  }

  function mermaidCopySource(shell, getVditor) {
    let text = getMermaidSourceNear(shell);
    if (text) return text;
    const vditor = typeof getVditor === "function" ? getVditor() : null;
    if (vditor && typeof vditor.getValue === "function") {
      try {
        const sources = extractMermaidSources(vditor.getValue());
        if (sources.length) {
          const idx = getMermaidShellIndex(shell);
          return sources[idx] || sources[0] || "";
        }
      } catch (_) { /* ignore */ }
    }
    const fromMd = mermaidSourcesFromMarkdown();
    if (fromMd.length) {
      const idx = getMermaidShellIndex(shell);
      return fromMd[idx] || fromMd[0] || "";
    }
    return "";
  }

  function getMermaidSourceNear(previewEl) {
    const node = previewEl?.closest?.(".vditor-ir__node");
    const marker = node?.querySelector?.(".vditor-ir__marker--pre code.language-mermaid");
    const markerText = marker?.textContent?.trim();
    if (markerText && isValidMermaidSource(markerText)) return markerText;
    const host = previewEl?.matches?.(".language-mermaid")
      ? previewEl
      : (previewEl?.querySelector?.(".language-mermaid") || previewEl);
    const saved = host?.getAttribute?.("data-molan-source")
      || previewEl?.getAttribute?.("data-molan-source");
    if (saved && isValidMermaidSource(saved)) return saved;
    const code = previewEl?.querySelector?.("code.language-mermaid, .language-mermaid") || host;
    if (!code) return "";
    if (code.getAttribute?.("data-processed")) return "";
    const text = (code.textContent || "").trim();
    return isValidMermaidSource(text) ? text : "";
  }

  function getMermaidShellIndex(shell, root = document) {
    const host = shell?.matches?.(".language-mermaid")
      ? shell
      : (shell?.querySelector?.(".language-mermaid") || shell);
    if (!host) return -1;
    const scope = host.closest("#molanPreviewBody, .molan-preview, .vditor-ir") || root;
    const hosts = mermaidDisplayHosts(scope);
    const idx = hosts.indexOf(host);
    if (idx >= 0) return idx;
    const source = getMermaidSourceNear(shell);
    if (!source) return -1;
    const sources = mermaidSourcesFromMarkdown();
    if (!sources.length) return -1;
    return sources.findIndex((item) => item === source);
  }

  let mermaidRenderSeq = 0;
  let mermaidRefreshing = false;
  let mermaidRefreshQueued = null;

  function mermaidHostSourceTextNodes(host) {
    const leftover = [];
    if (!host) return leftover;
    const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (node.parentElement?.closest("svg, .molan-diagram-toolbar")) return NodeFilter.FILTER_REJECT;
        return String(node.textContent || "").trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      },
    });
    let n = walker.nextNode();
    while (n) {
      leftover.push(n);
      n = walker.nextNode();
    }
    return leftover;
  }

  function mermaidHostLeftoverNodes(host) {
    const leftover = mermaidHostSourceTextNodes(host);
    if (!host) return leftover;
    host.childNodes.forEach((n) => {
      if (n.nodeType !== 1) return;
      if (n.matches?.("svg, .molan-diagram-toolbar")) return;
      if (n.querySelector("svg")) return;
      leftover.push(n);
    });
    return leftover;
  }

  function stripMermaidHostSource(host) {
    if (!host?.querySelector?.("svg")) return false;
    const leftover = mermaidHostLeftoverNodes(host);
    leftover.forEach((n) => n.remove());
    return leftover.length > 0;
  }

  function applyMermaidSvg(host, svgEl) {
    const toolbar = host.querySelector(":scope > .molan-diagram-toolbar");
    host.replaceChildren(svgEl, ...(toolbar ? [toolbar] : []));
    host.setAttribute("data-processed", "true");
  }

  function mermaidHostNeedsPaint(host) {
    if (!host) return false;
    if (!host.querySelector("svg")) return true;
    return mermaidHostSourceTextNodes(host).length > 0;
  }

  function scheduleMermaidReadyRefresh() {
    if (!mermaidRefreshQueued || mermaidRefreshing) return;
    const root = mermaidRefreshQueued;
    mermaidRefreshQueued = null;
    refreshMermaidDiagrams(root);
  }

  function mermaidSandbox() {
    let box = document.getElementById("molanMermaidSandbox");
    if (!box) {
      box = document.createElement("div");
      box.id = "molanMermaidSandbox";
      box.setAttribute("aria-hidden", "true");
      document.body.appendChild(box);
    }
    return box;
  }

  function mermaidRenderOrphan(el) {
    if (!el || el.nodeType !== 1 || el.id === "molanMermaidSandbox") return false;
    if (el.closest("#molanMermaidSandbox")) return true;
    if (!/^(d)?molan-mmd-\d+$/.test(el.id || "")) return false;
    return !el.closest(".language-mermaid, .molan-mermaid-shell, .molan-mermaid-editor, .vditor-ir__preview");
  }

  function sweepMermaidRenderOrphans() {
    document.getElementById("molanMermaidSandbox")?.replaceChildren();
    document.querySelectorAll("[id^='molan-mmd-'], [id^='dmolan-mmd-']").forEach((el) => {
      if (mermaidRenderOrphan(el)) el.remove();
    });
  }

  function cleanupMermaidTemp(id) {
    if (id) {
      document.getElementById(id)?.remove();
      document.getElementById("d" + id)?.remove();
    }
    sweepMermaidRenderOrphans();
  }

  function renderMermaidSvg(source) {
    const id = "molan-mmd-" + (++mermaidRenderSeq);
    const api = global.mermaid;
    if (!api || typeof api.render !== "function") {
      return Promise.reject(new Error("mermaid.render 不可用"));
    }
    const sandbox = mermaidSandbox();
    const finish = (svg) => {
      cleanupMermaidTemp(id);
      return svg;
    };
    const fail = (err) => {
      cleanupMermaidTemp(id);
      queueMicrotask(() => cleanupMermaidTemp(id));
      if (typeof requestAnimationFrame === "function") {
        requestAnimationFrame(() => cleanupMermaidTemp(id));
      }
      throw err;
    };
    try {
      const out = api.render(id, source, sandbox);
      if (out && typeof out.then === "function") {
        return out.then((result) => finish(typeof result === "string" ? result : result.svg), fail);
      }
      if (typeof out === "string") return Promise.resolve(finish(out));
      if (out && out.svg) return Promise.resolve(finish(out.svg));
    } catch (_) { /* mermaid 9 走回调 */ }
    return new Promise((resolve, reject) => {
      try {
        api.render(id, source, (svg) => resolve(finish(svg)));
      } catch (err) {
        try { fail(err); } catch (next) { reject(next); }
      }
    });
  }

  function flowPathPoints(d) {
    const nums = String(d || "").match(/-?\d*\.?\d+/g);
    if (!nums) return [];
    const pts = [];
    for (let i = 0; i + 1 < nums.length; i += 2) pts.push({ x: +nums[i], y: +nums[i + 1] });
    return pts;
  }

  function flowNum(v) {
    return Math.round(v * 10) / 10;
  }

  function flowBoxIn(path, el) {
    const svg = path.ownerSVGElement;
    const from = el.getCTM();
    const to = path.getCTM();
    if (!svg || !from || !to) return null;
    const b = el.getBBox();
    const m = to.inverse().multiply(from);
    const corners = [[b.x, b.y], [b.x + b.width, b.y], [b.x, b.y + b.height], [b.x + b.width, b.y + b.height]];
    const pts = corners.map(([x, y]) => {
      const p = svg.createSVGPoint();
      p.x = x;
      p.y = y;
      return p.matrixTransform(m);
    });
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    const left = Math.min(...xs);
    const right = Math.max(...xs);
    const top = Math.min(...ys);
    const bottom = Math.max(...ys);
    return { left, right, top, bottom, cx: (left + right) / 2, cy: (top + bottom) / 2 };
  }

  function flowDistToBox(p, box) {
    const dx = Math.max(box.left - p.x, 0, p.x - box.right);
    const dy = Math.max(box.top - p.y, 0, p.y - box.bottom);
    return Math.hypot(dx, dy);
  }

  function flowNearestNode(nodes, p) {
    let best = null;
    for (const node of nodes) {
      const dist = flowDistToBox(p, node.box);
      if (!best || dist < best.dist) best = { ...node, dist };
    }
    return best;
  }

  function flowRoute(source, target) {
    if (target.cy >= source.bottom - 4) {
      const s = { x: source.cx, y: source.bottom };
      const t = { x: target.cx, y: target.top };
      const room = t.y - s.y;
      if (room < 4) return null;
      return { dir: "v", sign: 1, s, t, room };
    }
    if (target.cy <= source.top + 4) {
      const s = { x: source.cx, y: source.top };
      const t = { x: target.cx, y: target.bottom };
      const room = s.y - t.y;
      if (room < 4) return null;
      return { dir: "v", sign: -1, s, t, room };
    }
    const sign = target.cx >= source.cx ? 1 : -1;
    const s = { x: sign > 0 ? source.right : source.left, y: source.cy };
    const t = { x: sign > 0 ? target.left : target.right, y: target.cy };
    const room = (t.x - s.x) * sign;
    if (room < 4) return null;
    return { dir: "h", sign, s, t, room };
  }

  function flowOrthoD(route, bend) {
    const { s, t } = route;
    if (route.dir === "v") {
      if (Math.abs(s.x - t.x) < 1) return `M${flowNum(s.x)},${flowNum(s.y)}L${flowNum(t.x)},${flowNum(t.y)}`;
      const lo = Math.min(s.y, t.y);
      const hi = Math.max(s.y, t.y);
      const y = Math.min(hi - 2, Math.max(lo + 2, bend));
      return `M${flowNum(s.x)},${flowNum(s.y)}L${flowNum(s.x)},${flowNum(y)}L${flowNum(t.x)},${flowNum(y)}L${flowNum(t.x)},${flowNum(t.y)}`;
    }
    if (Math.abs(s.y - t.y) < 1) return `M${flowNum(s.x)},${flowNum(s.y)}L${flowNum(t.x)},${flowNum(t.y)}`;
    const lo = Math.min(s.x, t.x);
    const hi = Math.max(s.x, t.x);
    const x = Math.min(hi - 2, Math.max(lo + 2, bend));
    return `M${flowNum(s.x)},${flowNum(s.y)}L${flowNum(x)},${flowNum(s.y)}L${flowNum(x)},${flowNum(t.y)}L${flowNum(t.x)},${flowNum(t.y)}`;
  }

  function flowLongestMid(pts) {
    let best = -1;
    let mid = pts[0];
    for (let i = 1; i < pts.length; i += 1) {
      const a = pts[i - 1];
      const b = pts[i];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      if (len < best) continue;
      best = len;
      mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    }
    return mid;
  }

  function flowPointSegDist(p, a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len2 = dx * dx + dy * dy;
    if (len2 < 0.01) return Math.hypot(p.x - a.x, p.y - a.y);
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2));
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
  }

  function orthogonalizeFlowEdges(svg, retry) {
    if (!svg || flowCurve() !== "step") return;
    const paths = [...svg.querySelectorAll("path.flowchart-link")];
    const nodeEls = [...svg.querySelectorAll("g.node")];
    if (!paths.length || !nodeEls.length) return;
    try {
      const b = nodeEls[0].getBBox();
      if ((b.width < 2 || b.height < 2) && !retry) {
        requestAnimationFrame(() => orthogonalizeFlowEdges(svg, true));
        return;
      }
    } catch (_) { return; }
    const jobs = [];
    for (const path of paths) {
      const oldPts = flowPathPoints(path.getAttribute("d"));
      if (oldPts.length < 2) continue;
      let nodes;
      try {
        nodes = nodeEls.map((el) => ({ el, box: flowBoxIn(path, el) })).filter((n) => n.box);
      } catch (_) { continue; }
      const source = flowNearestNode(nodes, oldPts[0]);
      const target = flowNearestNode(nodes, oldPts[oldPts.length - 1]);
      if (!source || !target || source.el === target.el) continue;
      if (source.dist > 48 || target.dist > 48) continue;
      const route = flowRoute(source.box, target.box);
      if (!route) continue;
      jobs.push({ path, oldPts, route, source: source.el });
    }
    const groups = new Map();
    for (const job of jobs) {
      const key = `${job.source.id}|${job.route.dir}|${job.route.sign}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(job);
    }
    for (const group of groups.values()) {
      const room = Math.min(...group.map((job) => job.route.room));
      const pad = Math.max(8, Math.min(22, room * 0.28));
      for (const job of group) {
        const along = job.route.dir === "v" ? job.route.s.y : job.route.s.x;
        const bend = job.route.sign > 0 ? along + pad : along - pad;
        const d = flowOrthoD(job.route, bend);
        job.path.setAttribute("d", d);
        job.mid = flowLongestMid(flowPathPoints(d));
      }
    }
    const labels = [...svg.querySelectorAll("g.edgeLabels > g.edgeLabel")];
    for (const label of labels) {
      const text = (label.textContent || "").trim();
      const m = /translate\(\s*([-\d.]+)(?:[,\s]+|\s+)([-\d.]+)/.exec(label.getAttribute("transform") || "");
      if (!text || !m) continue;
      const at = { x: +m[1], y: +m[2] };
      let best = null;
      for (const job of jobs) {
        if (!job.mid) continue;
        let dist = Infinity;
        for (let i = 1; i < job.oldPts.length; i += 1) {
          dist = Math.min(dist, flowPointSegDist(at, job.oldPts[i - 1], job.oldPts[i]));
        }
        if (!best || dist < best.dist) best = { job, dist };
      }
      if (!best || best.dist > 80) continue;
      label.setAttribute("transform", `translate(${flowNum(best.job.mid.x)}, ${flowNum(best.job.mid.y)})`);
    }
  }

  async function refreshMermaidDiagrams(root = document) {
    if (!global.mermaid || typeof mermaid.render !== "function") {
      mermaidRefreshQueued = root;
      return;
    }
    if (mermaidRefreshing) {
      mermaidRefreshQueued = root;
      return;
    }
    mermaidRefreshing = true;
    try {
      applyMermaidTheme();
      captureMermaidSources(root);
      const fromMd = mermaidSourcesFromMarkdown();
      const hosts = mermaidDisplayHosts(root);
      let sourceIndex = 0;
      for (let i = 0; i < hosts.length; i += 1) {
        const host = hosts[i];
        const preview = host.closest(".vditor-ir__preview") || host;
        const source = getMermaidSourceNear(preview)
          || host.getAttribute("data-molan-source")
          || fromMd[sourceIndex]
          || fromMd[i]
          || "";
        sourceIndex += 1;
        if (!isValidMermaidSource(source)) continue;
        host.setAttribute("data-molan-source", source);
        try {
          const svg = await renderMermaidSvg(source);
          const wrap = document.createElement("div");
          wrap.innerHTML = svg;
          const next = wrap.querySelector("svg");
          if (!next) continue;
          applyMermaidSvg(host, next);
          // Windows 上 foreignObject HTML 标签与 SVG 框缩放不一致；灯箱/编辑器已 vectorize，内联预览对齐同一路径。
          void host.offsetHeight;
          vectorizeSvgForeignObjects(next);
          orthogonalizeFlowEdges(next);
        } catch (err) {
          console.warn(err);
        }
      }
      enhanceMermaidPreviews(root);
      sweepMermaidRenderOrphans();
    } finally {
      mermaidRefreshing = false;
      if (mermaidRefreshQueued) {
        const nextRoot = mermaidRefreshQueued;
        mermaidRefreshQueued = null;
        refreshMermaidDiagrams(nextRoot);
      }
    }
  }

  function findMermaidPreviewShell(fromEl) {
    if (!fromEl || !fromEl.closest) return null;
    const preview = fromEl.closest(".vditor-ir__preview");
    if (preview && preview.querySelector(".language-mermaid")) return preview;
    const lang = fromEl.closest(".language-mermaid");
    if (lang) return lang.closest("pre") || lang;
    return null;
  }

  function collapseMermaidIrNodes(root = document) {
    root.querySelectorAll?.(".vditor-ir__node--expand")?.forEach((node) => {
      if (!node.querySelector?.(".language-mermaid")) return;
      node.classList.remove("vditor-ir__node--expand");
      node.classList.remove("vditor-ir__node--hidden");
    });
  }

  function watchMermaidIrExpand(vditorRoot, ctx, lightbox, getVditor) {
    const ir = vditorRoot?.querySelector?.(".vditor-ir");
    if (!ir || ir.dataset.molanMermaidExpandGuard) return;
    ir.dataset.molanMermaidExpandGuard = "1";
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type !== "attributes" || m.attributeName !== "class") continue;
        const node = m.target;
        if (!node.classList?.contains("vditor-ir__node--expand")) continue;
        if (!node.querySelector?.(".language-mermaid")) continue;
        node.classList.remove("vditor-ir__node--expand");
        node.classList.remove("vditor-ir__node--hidden");
        if (document.getElementById("molanMermaidEditor")) continue;
        const shell = node.querySelector(".vditor-ir__preview") || node;
        openMermaidEditorFromShell(shell, ctx, lightbox, vditorRoot, getVditor);
      }
    });
    observer.observe(ir, { attributes: true, subtree: true, attributeFilter: ["class"] });
  }

  function openMermaidEditorFromShell(shell, ctx, lightbox, vditorRoot, getVditor) {
    const source = mermaidCopySource(shell, getVditor);
    if (!source) {
      toast(t("noMermaidSource"));
      return;
    }
    collapseMermaidIrNodes(vditorRoot || document);
    const scope = shell.closest("#molanPreviewBody, .molan-preview, .vditor-ir") || vditorRoot || document;
    const index = getMermaidShellIndex(shell, scope);
    openMermaidEditorDialog({
      source,
      onApply: (newSource) => ctx.onApplyMermaidEdit?.(index, newSource),
    });
  }

  function placeDiagramToolbar(shell) {
    const bar = shell.querySelector(":scope > .molan-diagram-toolbar");
    const svg = shell.querySelector("svg");
    if (!bar || !svg) return;
    const shellRect = shell.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();
    if (svgRect.width < 2 || shellRect.width < 2) return;
    const top = svgRect.top - shellRect.top + 8;
    const right = shellRect.right - svgRect.right + 8;
    bar.style.top = `${Math.max(4, Math.round(top))}px`;
    bar.style.right = `${Math.max(4, Math.round(right))}px`;
  }

  function watchDiagramToolbar(shell) {
    placeDiagramToolbar(shell);
    if (typeof ResizeObserver === "undefined") return;
    const svg = shell.querySelector("svg");
    if (!shell._molanToolbarRO) {
      shell._molanToolbarRO = new ResizeObserver(() => placeDiagramToolbar(shell));
      shell._molanToolbarRO.observe(shell);
    }
    if (svg && svg !== shell._molanToolbarSvg) {
      if (shell._molanToolbarSvg) shell._molanToolbarRO.unobserve(shell._molanToolbarSvg);
      shell._molanToolbarRO.observe(svg);
      shell._molanToolbarSvg = svg;
    }
  }

  function mermaidSourceIsFlow(source) {
    const text = String(source || "")
      .replace(/^\uFEFF/, "")
      .replace(/^(?:%%[\s\S]*?%%\s*|---[\s\S]*?---\s*)+/, "")
      .trim();
    return !text || /^(?:flowchart|graph)\b/i.test(text);
  }

  function enhanceMermaidPreviews(root = document) {
    captureMermaidSources(root);
    const codes = root.querySelectorAll(".language-mermaid");
    codes.forEach((code) => {
      stripMermaidHostSource(code);
      const shell = code.closest(".vditor-ir__preview") || code.closest("pre") || code;
      const source = getMermaidSourceNear(shell);
      if (source) code.setAttribute("data-molan-source", source);
      if (!shell) return;
      if (shell.querySelector(":scope > .molan-diagram-toolbar")) {
        watchDiagramToolbar(shell);
        return;
      }
      if (!shell.querySelector("svg")) return;
      if (getComputedStyle(shell).position === "static") shell.style.position = "relative";
      shell.classList.add("molan-mermaid-shell");
      const bar = document.createElement("div");
      bar.className = "molan-diagram-toolbar";
      const curve = mermaidSourceIsFlow(source || code.getAttribute("data-molan-source"))
        ? `<div class="flow-curve"><div class="flow-curve__switch" role="radiogroup" aria-label="${t("flowCurve")}"><button type="button" role="radio" data-flow-curve="basis">${t("flowCurveBasis")}</button><button type="button" role="radio" data-flow-curve="step">${t("flowCurveStep")}</button></div></div>`
        : "";
      bar.innerHTML = `
        <div class="molan-diagram-toolbar__icons">
        <button type="button" class="icon-btn" data-molan-action="edit" title="${t("editSource")}" aria-label="${t("editSource")}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>
        </button>
        <button type="button" class="icon-btn" data-molan-action="zoom" title="${t("viewDiagram")}" aria-label="${t("viewDiagram")}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3H5a2 2 0 0 0-2 2v4"/><path d="M15 3h4a2 2 0 0 1 2 2v4"/><path d="M9 21H5a2 2 0 0 1-2-2v-4"/><path d="M15 21h4a2 2 0 0 0 2-2v-4"/></svg>
        </button>
        <button type="button" class="icon-btn" data-molan-action="copy-code" title="${t("copyCode")}" aria-label="${t("copyCode")}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2"/><rect x="4" y="8" width="12" height="12" rx="2"/></svg>
        </button>
        <button type="button" class="icon-btn" data-molan-action="copy-image" title="${t("copyImage")}" aria-label="${t("copyImage")}">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M3 16l5-4 4 3 3-2 6 5"/></svg>
        </button>
        </div>
        ${curve}
      `;
      shell.appendChild(bar);
      watchDiagramToolbar(shell);
    });
    root.querySelectorAll?.(".language-mermaid svg").forEach((svg) => orthogonalizeFlowEdges(svg));
    ensureFlowCurveDom();
  }
