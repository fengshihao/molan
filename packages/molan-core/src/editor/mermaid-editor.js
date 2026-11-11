  /* --- mermaid-editor: 流程图源码编辑对话框 --- */
  function openMermaidEditorDialog({ source, onApply }) {
    const MERMAID_SNIPPETS = [
      { key: "mermaidSnippetFlowchart", body: "flowchart TD\n  A[开始] --> B[结束]" },
      { key: "mermaidSnippetSequence", body: "sequenceDiagram\n  participant A as 参与者 A\n  participant B as 参与者 B\n  A->>B: 消息" },
      { key: "mermaidSnippetClass", body: "classDiagram\n  class Animal\n  class Dog\n  Animal <|-- Dog" },
    ];
    return new Promise((resolve) => {
      document.getElementById("molanMermaidEditor")?.remove();
      const mask = document.createElement("div");
      mask.id = "molanMermaidEditor";
      mask.className = "molan-mermaid-editor-mask";
      mask.innerHTML = `
        <div class="molan-mermaid-editor" role="dialog" aria-modal="true" aria-labelledby="molanMermaidEditorTitle">
          <div class="molan-mermaid-editor-head">
            <div>
              <div class="molan-mermaid-editor-title" id="molanMermaidEditorTitle"></div>
              <p class="molan-mermaid-editor-hint"></p>
            </div>
            <button type="button" class="icon-btn molan-mermaid-editor-close" aria-label="">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
          <div class="molan-mermaid-editor-body">
            <label class="molan-mermaid-editor-pane">
              <span class="molan-mermaid-editor-pane-label"></span>
              <textarea class="molan-mermaid-editor-source" spellcheck="false"></textarea>
              <div class="molan-mermaid-editor-snippets">
                <span class="molan-mermaid-editor-snippets-label"></span>
                <div class="molan-mermaid-editor-snippet-list"></div>
              </div>
            </label>
            <div class="molan-mermaid-editor-pane molan-mermaid-editor-preview-pane">
              <div class="molan-mermaid-editor-pane-head">
                <span class="molan-mermaid-editor-pane-label molan-mermaid-editor-preview-label"></span>
                <div class="molan-mermaid-editor-zoom">
                  <button type="button" class="icon-btn molan-mermaid-editor-zoom-out" title="" aria-label="">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M8 11h6M21 21l-4.3-4.3"/></svg>
                  </button>
                  <button type="button" class="icon-btn molan-mermaid-editor-zoom-in" title="" aria-label="">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M11 8v6M8 11h6M21 21l-4.3-4.3"/></svg>
                  </button>
                </div>
              </div>
              <div class="molan-mermaid-editor-preview" aria-live="polite"></div>
            </div>
          </div>
          <div class="molan-mermaid-editor-actions">
            <button type="button" class="molan-mermaid-editor-cancel"></button>
            <button type="button" class="molan-mermaid-editor-apply"></button>
          </div>
        </div>
      `;
      const dialog = mask.querySelector(".molan-mermaid-editor");
      const textarea = mask.querySelector(".molan-mermaid-editor-source");
      const preview = mask.querySelector(".molan-mermaid-editor-preview");
      const cancelBtn = mask.querySelector(".molan-mermaid-editor-cancel");
      const applyBtn = mask.querySelector(".molan-mermaid-editor-apply");
      const closeBtn = mask.querySelector(".molan-mermaid-editor-close");
      const zoomInBtn = mask.querySelector(".molan-mermaid-editor-zoom-in");
      const zoomOutBtn = mask.querySelector(".molan-mermaid-editor-zoom-out");
      mask.querySelector(".molan-mermaid-editor-title").textContent = t("mermaidEditorTitle");
      mask.querySelector(".molan-mermaid-editor-hint").textContent = t("mermaidEditorHint");
      mask.querySelector(".molan-mermaid-editor-pane-label").textContent = t("editSource");
      mask.querySelector(".molan-mermaid-editor-preview-label").textContent = t("viewDiagram");
      cancelBtn.textContent = t("mermaidEditorCancel");
      applyBtn.textContent = t("mermaidEditorApply");
      closeBtn.setAttribute("aria-label", t("mermaidEditorCancel"));
      zoomInBtn.title = t("zoomIn");
      zoomInBtn.setAttribute("aria-label", t("zoomIn"));
      zoomOutBtn.title = t("zoomOut");
      zoomOutBtn.setAttribute("aria-label", t("zoomOut"));
      const snippetList = mask.querySelector(".molan-mermaid-editor-snippet-list");
      mask.querySelector(".molan-mermaid-editor-snippets-label").textContent = t("mermaidSnippetsLabel");
      MERMAID_SNIPPETS.forEach((item) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "molan-mermaid-editor-snippet";
        chip.textContent = t(item.key);
        chip.addEventListener("click", () => {
          const body = item.body;
          if (!textarea.value.trim()) {
            textarea.value = body;
          } else {
            const start = textarea.selectionStart ?? textarea.value.length;
            const end = textarea.selectionEnd ?? textarea.value.length;
            const prefix = textarea.value.slice(0, start);
            const suffix = textarea.value.slice(end);
            const glue = prefix && !prefix.endsWith("\n") ? "\n\n" : "";
            textarea.value = `${prefix}${glue}${body}${suffix}`;
            const pos = (prefix + glue + body).length;
            textarea.setSelectionRange(pos, pos);
          }
          schedulePreview();
          textarea.focus();
        });
        snippetList.appendChild(chip);
      });
      textarea.value = String(source || "").trim();

      let settled = false;
      let previewTimer = 0;
      let previewSeq = 0;
      let previewScale = 1;
      let previewFitW = 1;
      let previewFitH = 1;
      let previewPanX = 0;
      let previewPanY = 0;
      let previewDragging = false;
      let previewDragOrigin = null;
      let previewViewEstablished = false;
      let lastPreviewSource = "";

      const finish = (applied) => {
        if (settled) return;
        settled = true;
        clearTimeout(previewTimer);
        window.removeEventListener("keydown", onKey, true);
        mask.remove();
        resolve(Boolean(applied));
      };

      const applyPreviewTransform = () => {
        const canvas = preview.querySelector(".molan-mermaid-editor-preview-canvas");
        if (!canvas) return;
        const svg = canvas.querySelector("svg");
        const rect = preview.getBoundingClientRect();
        const width = Math.max(1, previewFitW * previewScale);
        const height = Math.max(1, previewFitH * previewScale);
        if (svg) setSvgDisplaySize(svg, width, height);
        placeSvgCanvas(canvas, rect, width, height, previewPanX, previewPanY);
      };

      const readSvgFrame = (svg) => {
        const vb = svg?.viewBox?.baseVal;
        if (vb && vb.width > 0 && vb.height > 0) {
          return { x: vb.x, y: vb.y, width: vb.width, height: vb.height };
        }
        const natural = svgNaturalSize(svg);
        return { x: 0, y: 0, width: Math.max(1, natural.width), height: Math.max(1, natural.height) };
      };

      const mermaidEditIsLocal = (prev, next) => {
        const a = String(prev || "").trim();
        const b = String(next || "").trim();
        if (!a || !b) return false;
        if (a === b) return true;
        const longer = Math.max(a.length, b.length, 1);
        if (Math.abs(a.length - b.length) / longer > 0.18) return false;
        const lineDelta = Math.abs(a.split("\n").length - b.split("\n").length);
        return lineDelta <= 2;
      };

      const textAffinity = (a, b) => {
        if (!a || !b) return 0;
        if (a === b) return 1;
        const short = a.length <= b.length ? a : b;
        const long = a.length <= b.length ? b : a;
        if (long.includes(short)) return 0.75 + 0.2 * (short.length / long.length);
        return 0;
      };

      const previewNodeMetrics = () => {
        const root = preview.getBoundingClientRect();
        const cx = root.left + root.width / 2;
        const cy = root.top + root.height / 2;
        const nodes = [];
        preview.querySelectorAll("g.node, g.actor").forEach((el) => {
          const text = (el.textContent || "").replace(/\s+/g, " ").trim();
          if (!text) return;
          const box = el.getBoundingClientRect();
          if (box.width < 1 || box.height < 1) return;
          nodes.push({
            text,
            dx: box.left + box.width / 2 - cx,
            dy: box.top + box.height / 2 - cy,
            h: box.height,
          });
        });
        return nodes;
      };

      const capturePreviewCamera = () => {
        const svg = preview.querySelector(".molan-mermaid-editor-preview-canvas svg");
        if (!previewViewEstablished || !svg || preview.classList.contains("is-error")) return null;
        const frame = readSvgFrame(svg);
        const nodes = previewNodeMetrics();
        let focus = null;
        for (const node of nodes) {
          const dist = node.dx * node.dx + node.dy * node.dy;
          if (!focus || dist < focus.dist) focus = { ...node, dist };
        }
        return {
          frame,
          px: (previewFitW * previewScale) / frame.width,
          scale: previewScale,
          panX: previewPanX,
          panY: previewPanY,
          nodes,
          focus,
        };
      };

      const holdPreviewCamera = (svg, snap) => {
        if (!svg) {
          previewFitW = 1;
          previewFitH = 1;
          applyPreviewTransform();
          return;
        }
        if (!snap) {
          const rect = preview.getBoundingClientRect();
          const display = fitSvgToBox(svg, rect.width, rect.height, 24);
          previewFitW = display.width;
          previewFitH = display.height;
          applyPreviewTransform();
          return;
        }
        const frame = readSvgFrame(svg);
        ensureSvgViewBox(svg, { width: frame.width, height: frame.height });
        storeSvgNaturalSize(svg, { width: frame.width, height: frame.height });
        let px = snap.px > 0 ? snap.px : (snap.frame.width > 0 ? 1 / snap.frame.width : 1);
        const place = () => {
          previewScale = snap.scale;
          previewFitW = Math.max(1, (frame.width * px) / previewScale);
          previewFitH = Math.max(1, (frame.height * px) / previewScale);
          applyPreviewTransform();
        };
        previewPanX = snap.panX;
        previewPanY = snap.panY;
        place();
        void preview.offsetHeight;
        const now = previewNodeMetrics();
        const ratios = [];
        for (const prev of snap.nodes) {
          const next = now.find((node) => node.text === prev.text);
          if (!next || prev.h < 4) continue;
          ratios.push(prev.h / next.h);
        }
        if (ratios.length >= 2) {
          ratios.sort((a, b) => a - b);
          const mid = ratios[Math.floor(ratios.length / 2)];
          const spread = ratios[ratios.length - 1] - ratios[0];
          if (spread < 0.12 && Math.abs(mid - 1) > 0.08) {
            px *= mid;
            place();
            void preview.offsetHeight;
          }
        }
        const fresh = previewNodeMetrics();
        let target = null;
        if (snap.focus) {
          for (const node of fresh) {
            const score = textAffinity(snap.focus.text, node.text);
            if (score < 0.72) continue;
            const dist = Math.hypot(node.dx - snap.focus.dx, node.dy - snap.focus.dy);
            const rank = score * 10000 - dist;
            if (!target || rank > target.rank) target = { node, rank };
          }
        }
        if (target) {
          previewPanX += snap.focus.dx - target.node.dx;
          previewPanY += snap.focus.dy - target.node.dy;
          applyPreviewTransform();
        }
      };

      const resetPreviewView = () => {
        previewScale = 1;
        previewPanX = 0;
        previewPanY = 0;
        previewDragging = false;
        previewDragOrigin = null;
        preview.classList.remove("is-dragging");
        const svg = preview.querySelector(".molan-mermaid-editor-preview-canvas svg");
        holdPreviewCamera(svg, null);
      };

      const setPreviewScale = (next, origin) => {
        const clamped = Math.min(5, Math.max(0.35, next));
        if (origin && previewScale > 0) {
          const rect = preview.getBoundingClientRect();
          const cx = origin.x - rect.left - rect.width / 2;
          const cy = origin.y - rect.top - rect.height / 2;
          const ratio = clamped / previewScale;
          previewPanX = cx - (cx - previewPanX) * ratio;
          previewPanY = cy - (cy - previewPanY) * ratio;
        }
        previewScale = clamped;
        applyPreviewTransform();
      };

      const showPreviewError = (err) => {
        const msg = err?.message || err?.str || String(err || t("mermaidSyntaxError"));
        preview.classList.add("is-error");
        preview.classList.remove("is-dragging");
        preview.innerHTML = `<pre class="molan-mermaid-editor-error">${msg.replace(/[<>&]/g, (c) => ({
          "<": "&lt;",
          ">": "&gt;",
          "&": "&amp;",
        }[c]))}</pre>`;
      };

      const extractBracketLabels = (src) => {
        const labels = [];
        const re = /\[([^\]\n]*)\]|\{([^}\n]*)\}|\(([^)\n]*)\)|\|([^|\n]*)\|/g;
        let match = re.exec(src);
        while (match) {
          labels.push(String(match[1] ?? match[2] ?? match[3] ?? match[4] ?? "").trim());
          match = re.exec(src);
        }
        return labels;
      };

      const labelSkeleton = (src) => String(src || "")
        .replace(/\[[^\]\n]*\]/g, "[]")
        .replace(/\{[^}\n]*\}/g, "{}")
        .replace(/\([^)\n]*\)/g, "()")
        .replace(/\|[^|\n]*\|/g, "||");

      const tryPatchPreviewLabels = (next) => {
        const prev = lastPreviewSource;
        if (!prev || !previewViewEstablished || preview.classList.contains("is-error")) return false;
        if (labelSkeleton(prev) !== labelSkeleton(next)) return false;
        const oldLabels = extractBracketLabels(prev);
        const newLabels = extractBracketLabels(next);
        if (!oldLabels.length || oldLabels.length !== newLabels.length) return false;
        const svg = preview.querySelector(".molan-mermaid-editor-preview-canvas svg");
        if (!svg) return false;
        const changes = [];
        for (let i = 0; i < oldLabels.length; i += 1) {
          if (oldLabels[i] !== newLabels[i]) changes.push([oldLabels[i], newLabels[i]]);
        }
        if (!changes.length) {
          lastPreviewSource = next;
          return true;
        }
        const used = new Set();
        for (const [from, to] of changes) {
          let hit = false;
          svg.querySelectorAll("g.node, g.edgeLabel").forEach((el) => {
            if (hit || used.has(el)) return;
            const text = (el.textContent || "").replace(/\s+/g, " ").trim();
            if (text !== from) return;
            const textEl = el.querySelector("text");
            if (!textEl) return;
            const tspans = [...textEl.querySelectorAll("tspan")];
            if (tspans.length > 1) return;
            if (tspans.length === 1) tspans[0].textContent = to;
            else textEl.textContent = to;
            used.add(el);
            hit = true;
          });
          if (!hit) return false;
        }
        lastPreviewSource = next;
        return true;
      };

      const renderPreview = async () => {
        const seq = ++previewSeq;
        const text = textarea.value.trim();
        if (!text) {
          preview.classList.remove("is-error");
          preview.innerHTML = "";
          previewViewEstablished = false;
          resetPreviewView();
          return;
        }
        if (!global.mermaid || typeof global.mermaid.render !== "function") {
          showPreviewError(t("diagramNotReady"));
          return;
        }
        if (tryPatchPreviewLabels(text)) return;
        const hold = mermaidEditIsLocal(lastPreviewSource, text);
        const camera = hold ? capturePreviewCamera() : null;
        if (!camera) {
          previewScale = 1;
          previewPanX = 0;
          previewPanY = 0;
        }
        try {
          applyMermaidTheme();
          const svg = await renderMermaidSvg(text);
          if (seq !== previewSeq) return;
          preview.classList.remove("is-error");
          preview.innerHTML = `<div class="molan-mermaid-editor-preview-canvas">${svg}</div>`;
          void preview.offsetHeight;
          const liveSvg = preview.querySelector("svg");
          uniquifySvgIds(liveSvg);
          vectorizeSvgForeignObjects(liveSvg);
          orthogonalizeFlowEdges(liveSvg);
          holdPreviewCamera(liveSvg, camera);
          previewViewEstablished = true;
          lastPreviewSource = text;
        } catch (err) {
          if (seq !== previewSeq) return;
          showPreviewError(err);
        }
      };

      const schedulePreview = () => {
        clearTimeout(previewTimer);
        previewTimer = window.setTimeout(renderPreview, 320);
      };

      const tryApply = () => {
        const next = textarea.value.trim();
        if (!next) {
          toast(t("noMermaidSource"));
          textarea.focus();
          return;
        }
        if (typeof onApply === "function") {
          const ok = onApply(next);
          if (ok === false) return;
        }
        finish(true);
      };

      const onKey = (e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          finish(false);
          return;
        }
        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          tryApply();
        }
      };

      zoomInBtn.addEventListener("click", () => setPreviewScale(previewScale + 0.25));
      zoomOutBtn.addEventListener("click", () => setPreviewScale(previewScale - 0.25));
      preview.addEventListener("pointerdown", (e) => {
        if (e.button !== 0 || preview.classList.contains("is-error")) return;
        if (!preview.querySelector("svg")) return;
        previewDragging = true;
        previewDragOrigin = {
          x: e.clientX,
          y: e.clientY,
          panX: previewPanX,
          panY: previewPanY,
        };
        preview.classList.add("is-dragging");
        preview.setPointerCapture?.(e.pointerId);
      });
      preview.addEventListener("pointermove", (e) => {
        if (!previewDragging || !previewDragOrigin) return;
        previewPanX = previewDragOrigin.panX + (e.clientX - previewDragOrigin.x);
        previewPanY = previewDragOrigin.panY + (e.clientY - previewDragOrigin.y);
        applyPreviewTransform();
      });
      const endPreviewDrag = (e) => {
        if (!previewDragging) return;
        previewDragging = false;
        previewDragOrigin = null;
        preview.classList.remove("is-dragging");
        try { preview.releasePointerCapture?.(e.pointerId); } catch (_) { /* ignore */ }
      };
      preview.addEventListener("pointerup", endPreviewDrag);
      preview.addEventListener("pointercancel", endPreviewDrag);
      preview.addEventListener("wheel", (e) => {
        if (!preview.querySelector("svg") || preview.classList.contains("is-error")) return;
        e.preventDefault();
        e.stopPropagation();
        const delta = e.deltaY > 0 ? -0.12 : 0.12;
        setPreviewScale(previewScale + delta, { x: e.clientX, y: e.clientY });
      }, { passive: false });

      textarea.addEventListener("input", schedulePreview);
      cancelBtn.addEventListener("click", () => finish(false));
      closeBtn.addEventListener("click", () => finish(false));
      applyBtn.addEventListener("click", tryApply);
      mask.addEventListener("click", (e) => {
        if (e.target !== mask) return;
        e.preventDefault();
        e.stopPropagation();
      });
      dialog.addEventListener("click", (e) => e.stopPropagation());
      window.addEventListener("keydown", onKey, true);
      document.body.appendChild(mask);
      schedulePreview();
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(0, textarea.value.length);
      });
    });
  }
