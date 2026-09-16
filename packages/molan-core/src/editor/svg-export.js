  /* --- svg-export: 流程图转 PNG / 复制 --- */
  function diagramSvgSize(svg) {
    const vb = svg?.viewBox?.baseVal;
    if (vb && vb.width > 0 && vb.height > 0) {
      return { width: vb.width, height: vb.height };
    }
    const rawW = svg?.getAttribute?.("width") || "";
    const rawH = svg?.getAttribute?.("height") || "";
    const w = parseFloat(rawW);
    const h = parseFloat(rawH);
    if (Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0 && !/%/.test(rawW) && !/%/.test(rawH)) {
      return { width: w, height: h };
    }
    try {
      const box = svg.getBBox();
      if (box.width > 0 && box.height > 0) {
        return { width: box.width, height: box.height };
      }
    } catch (_) { /* ignore */ }
    const rect = svg.getBoundingClientRect?.() || { width: 0, height: 0 };
    return {
      width: rect.width > 0 ? rect.width : 800,
      height: rect.height > 0 ? rect.height : 600,
    };
  }

  function foreignObjectLines(fo) {
    const host = fo.querySelector(".nodeLabel, .edgeLabel, .label, span, div, p") || fo;
    const clone = host.cloneNode(true);
    clone.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
    clone.querySelectorAll("p").forEach((p) => p.append("\n"));
    const text = String(clone.textContent || "").replace(/\u00a0/g, " ");
    return text.split(/\n/).map((s) => s.replace(/[ \t]+/g, " ").trim()).filter(Boolean);
  }

  function replaceForeignObjectWithText(liveFo, cloneFo) {
    const lines = foreignObjectLines(liveFo);
    if (!lines.length) {
      cloneFo.remove();
      return;
    }
    const label = liveFo.querySelector(".nodeLabel, .edgeLabel, .label, span, div, p") || liveFo;
    let cs = null;
    try { cs = getComputedStyle(label); } catch (_) { /* ignore */ }
    const x = parseFloat(cloneFo.getAttribute("x") || liveFo.getAttribute("x") || 0) || 0;
    const y = parseFloat(cloneFo.getAttribute("y") || liveFo.getAttribute("y") || 0) || 0;
    const width = parseFloat(cloneFo.getAttribute("width") || liveFo.getAttribute("width") || 0) || 0;
    const height = parseFloat(cloneFo.getAttribute("height") || liveFo.getAttribute("height") || 0) || 0;
    const fontSize = parseFloat(cs?.fontSize || 16) || 16;
    const lineHeight = (() => {
      const raw = parseFloat(cs?.lineHeight);
      return Number.isFinite(raw) && raw > 0 ? raw : fontSize * 1.25;
    })();
    const align = cs?.textAlign || "center";
    const textEl = document.createElementNS("http://www.w3.org/2000/svg", "text");
    if (align === "left" || align === "start") {
      textEl.setAttribute("x", String(x + Math.min(4, width / 8)));
      textEl.setAttribute("text-anchor", "start");
    } else if (align === "right" || align === "end") {
      textEl.setAttribute("x", String(x + width - Math.min(4, width / 8)));
      textEl.setAttribute("text-anchor", "end");
    } else {
      textEl.setAttribute("x", String(x + width / 2));
      textEl.setAttribute("text-anchor", "middle");
    }
    textEl.setAttribute("fill", cs?.color || "#111");
    textEl.setAttribute("font-size", cs?.fontSize || "16px");
    if (cs?.fontFamily) textEl.setAttribute("font-family", cs.fontFamily);
    if (cs?.fontWeight) textEl.setAttribute("font-weight", cs.fontWeight);
    if (cs?.fontStyle && cs.fontStyle !== "normal") textEl.setAttribute("font-style", cs.fontStyle);
    textEl.setAttribute("dominant-baseline", "central");
    textEl.setAttribute("alignment-baseline", "middle");
    const anchorX = textEl.getAttribute("x");
    if (lines.length === 1) {
      textEl.setAttribute("y", String(y + height / 2));
      textEl.textContent = lines[0];
    } else {
      const total = lineHeight * (lines.length - 1);
      const startY = y + height / 2 - total / 2;
      lines.forEach((line, i) => {
        const tspan = document.createElementNS("http://www.w3.org/2000/svg", "tspan");
        tspan.setAttribute("x", anchorX);
        tspan.setAttribute("y", String(startY + i * lineHeight));
        tspan.setAttribute("dominant-baseline", "central");
        tspan.textContent = line;
        textEl.appendChild(tspan);
      });
    }
    cloneFo.replaceWith(textEl);
  }

  function stripTaintingCss(svg) {
    const strip = (css) => String(css || "")
      .replace(/@import[^;]+;/gi, "")
      .replace(/@font-face\s*\{[\s\S]*?\}/gi, "")
      .replace(/url\(\s*(['"]?)(?:https?:)?\/\/[^)]+\)/gi, "none");
    svg.querySelectorAll("style").forEach((style) => {
      style.textContent = strip(style.textContent);
    });
    svg.querySelectorAll("[style]").forEach((el) => {
      const next = strip(el.getAttribute("style"));
      if (next) el.setAttribute("style", next);
      else el.removeAttribute("style");
    });
  }

  function collectCssCustomProperties(el, into) {
    if (!el) return;
    try {
      const cs = getComputedStyle(el);
      for (const name of cs) {
        if (!name.startsWith("--")) continue;
        const value = cs.getPropertyValue(name).trim();
        if (value) into.set(name, value);
      }
    } catch (_) { /* ignore */ }
  }

  function bakeCssCustomProperties(liveSvg, cloneSvg) {
    const vars = new Map();
    collectCssCustomProperties(document.documentElement, vars);
    collectCssCustomProperties(document.body, vars);
    let node = liveSvg;
    while (node && node !== document.documentElement) {
      collectCssCustomProperties(node, vars);
      node = node.parentElement;
    }
    for (const [name, value] of vars) {
      cloneSvg.style.setProperty(name, value);
    }
  }

  function resolveCssVarsInText(css, cloneSvg) {
    return String(css || "").replace(/var\(\s*(--[\w-]+)\s*(?:,\s*((?:[^()]+|\([^()]*\))*))?\)/g, (match, name, fallback) => {
      const baked = cloneSvg.style.getPropertyValue(name).trim();
      if (baked) return baked;
      const fromDoc = cssVar(name, "");
      if (fromDoc) return fromDoc;
      const fb = String(fallback || "").trim();
      return fb || match;
    });
  }

  function resolveCssVarsInClone(cloneSvg) {
    cloneSvg.querySelectorAll("style").forEach((style) => {
      style.textContent = resolveCssVarsInText(style.textContent, cloneSvg);
    });
    cloneSvg.querySelectorAll("[style]").forEach((el) => {
      const next = resolveCssVarsInText(el.getAttribute("style"), cloneSvg);
      if (next) el.setAttribute("style", next);
      else el.removeAttribute("style");
    });
  }

  const SVG_PAINT_TAGS = new Set([
    "rect", "circle", "ellipse", "polygon", "polyline", "path", "line",
    "text", "tspan", "textpath", "use",
  ]);
  const SVG_PAINT_PROPS = [
    "fill", "stroke", "stroke-width", "stroke-dasharray", "stroke-linecap", "stroke-linejoin",
    "stroke-miterlimit", "stroke-opacity", "fill-opacity", "opacity", "color",
    "font-family", "font-size", "font-weight", "font-style",
    "text-anchor", "dominant-baseline", "alignment-baseline", "letter-spacing",
    "paint-order", "vector-effect",
  ];

  function inlineComputedSvgStyles(liveRoot, cloneRoot) {
    const liveEls = [liveRoot, ...liveRoot.querySelectorAll("*")];
    const cloneEls = [cloneRoot, ...cloneRoot.querySelectorAll("*")];
    const limit = Math.min(liveEls.length, cloneEls.length);
    for (let i = 0; i < limit; i++) {
      const live = liveEls[i];
      const clone = cloneEls[i];
      const tag = (live.tagName || "").toLowerCase();
      if (!clone || tag === "style" || tag === "script" || tag === "defs") continue;
      let cs;
      try { cs = getComputedStyle(live); } catch (_) { continue; }
      const paint = SVG_PAINT_TAGS.has(tag);
      if (paint) {
        for (const prop of SVG_PAINT_PROPS) {
          const value = cs.getPropertyValue(prop);
          if (!value || value === "auto") continue;
          clone.style.setProperty(prop, value);
        }
      } else {
        const fontFamily = cs.getPropertyValue("font-family");
        const fontSize = cs.getPropertyValue("font-size");
        if (fontFamily) clone.style.setProperty("font-family", fontFamily);
        if (fontSize) clone.style.setProperty("font-size", fontSize);
      }
      const vis = cs.getPropertyValue("visibility");
      if (vis === "hidden") clone.style.setProperty("visibility", "hidden");
      const display = cs.getPropertyValue("display");
      if (display === "none") clone.style.setProperty("display", "none");
    }
  }

  function insertDiagramBackground(cloneSvg) {
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("class", "molan-diagram-bg");
    bg.setAttribute("x", "0");
    bg.setAttribute("y", "0");
    bg.setAttribute("width", "100%");
    bg.setAttribute("height", "100%");
    bg.setAttribute("fill", diagramBackgroundColor());
    const kids = Array.from(cloneSvg.childNodes);
    const firstGraphic = kids.find((n) => {
      if (n.nodeType !== 1) return false;
      const tag = n.tagName.toLowerCase();
      return tag !== "style" && tag !== "defs" && tag !== "title" && tag !== "desc" && tag !== "metadata";
    });
    if (firstGraphic) cloneSvg.insertBefore(bg, firstGraphic);
    else cloneSvg.appendChild(bg);
  }

  function svgImageHref(el) {
    return el.getAttribute("href")
      || el.getAttributeNS?.("http://www.w3.org/1999/xlink", "href")
      || el.getAttribute("xlink:href")
      || el.getAttribute("src")
      || "";
  }

  async function inlineSvgImages(svg) {
    const images = Array.from(svg.querySelectorAll("image, img"));
    await Promise.all(images.map(async (img) => {
      const href = svgImageHref(img);
      if (!href || href.startsWith("data:") || href.startsWith("#")) return;
      try {
        const res = await fetch(href);
        const blob = await res.blob();
        const dataUrl = await blobToDataUrl(blob);
        img.setAttribute("href", dataUrl);
        try { img.setAttributeNS("http://www.w3.org/1999/xlink", "href", dataUrl); } catch (_) { /* ignore */ }
        img.removeAttribute("src");
        img.removeAttribute("xlink:href");
      } catch (_) {
        img.remove();
      }
    }));
  }

  // Chrome 把带 foreignObject / 跨域资源的 SVG 画进 canvas 后会污染画布，toBlob 直接抛 SecurityError。
  // 独立 SVG 不会继承页面主题变量，复制前要把计算色和 CSS 变量烘焙进去，否则会掉回 Mermaid 默认暗色。
  async function sanitizeSvgForCanvas(svg) {
    const clone = svg.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    const size = diagramSvgSize(svg);
    clone.setAttribute("width", String(size.width));
    clone.setAttribute("height", String(size.height));
    if (!clone.getAttribute("viewBox")) {
      clone.setAttribute("viewBox", `0 0 ${size.width} ${size.height}`);
    }
    clone.style.width = `${size.width}px`;
    clone.style.height = `${size.height}px`;
    clone.style.maxWidth = "none";
    bakeCssCustomProperties(svg, clone);
    inlineComputedSvgStyles(svg, clone);
    resolveCssVarsInClone(clone);
    const liveFos = svg.querySelectorAll("foreignObject");
    const cloneFos = clone.querySelectorAll("foreignObject");
    cloneFos.forEach((fo, i) => replaceForeignObjectWithText(liveFos[i] || fo, fo));
    clone.querySelectorAll("foreignObject, script").forEach((el) => el.remove());
    insertDiagramBackground(clone);
    stripTaintingCss(clone);
    await inlineSvgImages(clone);
    const serialized = new XMLSerializer().serializeToString(clone);
    const xml = serialized.startsWith("<?xml")
      ? serialized
      : `<?xml version="1.0" encoding="UTF-8"?>${serialized}`;
    return { xml, width: size.width, height: size.height };
  }

  function loadSvgImage(xml) {
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    return new Promise((resolve, reject) => {
      const img = new Image();
      const done = (fn) => (arg) => {
        URL.revokeObjectURL(url);
        fn(arg);
      };
      img.onload = done(() => resolve(img));
      img.onerror = done(() => reject(new Error("svg image load failed")));
      img.src = url;
    });
  }

  function canvasToPngBlob(canvas) {
    return new Promise((resolve, reject) => {
      try {
        canvas.toBlob((blob) => {
          if (blob) resolve(blob);
          else reject(new Error("toBlob failed"));
        }, "image/png");
      } catch (err) {
        reject(err);
      }
    });
  }

  async function svgToPngBlob(svg, opts = {}) {
    if (!svg) throw new Error("diagram not ready");
    const prepared = await sanitizeSvgForCanvas(svg);
    const img = await loadSvgImage(prepared.xml);
    const scale = Math.max(1, Number(opts.scale) || 2);
    const w = img.naturalWidth || prepared.width || 800;
    const h = img.naturalHeight || prepared.height || 600;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.floor(w * scale));
    canvas.height = Math.max(1, Math.floor(h * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas 2d unavailable");
    ctx.fillStyle = diagramBackgroundColor();
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvasToPngBlob(canvas);
  }

  async function copySvgAsPng(svg) {
    if (!svg) {
      toast(t("diagramNotReady"));
      return;
    }
    try {
      const blob = await svgToPngBlob(svg);
      try {
        if (navigator.clipboard && global.ClipboardItem) {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          toast(t("copiedDiagramImage"));
          return;
        }
      } catch (_) { /* 无剪贴板权限时改为下载 */ }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "diagram.png";
      a.click();
      toast(t("copyImageFallback"));
    } catch (err) {
      console.warn(err);
      toast(t("copyImageFail"));
    }
  }

  async function copyTextToClipboard(text) {
    const value = String(text ?? "");
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      try {
        await navigator.clipboard.writeText(value);
        return;
      } catch (_) { /* 无权限或非安全上下文时走降级 */ }
    }
    const ta = document.createElement("textarea");
    ta.value = value;
    ta.setAttribute("readonly", "");
    ta.setAttribute("aria-hidden", "true");
    ta.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (_) { /* ignore */ }
    ta.remove();
    if (ok) return;
    if (typeof global.__molanHostCopyText === "function") {
      await global.__molanHostCopyText(value);
      return;
    }
    throw new Error("clipboard unavailable");
  }
