  /* --- svg-fit: SVG 尺寸、适配与画布 --- */
  function svgNaturalSize(svg) {
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
    const rect = svg.getBoundingClientRect();
    return {
      width: rect.width > 0 ? rect.width : 1,
      height: rect.height > 0 ? rect.height : 1,
    };
  }

  function ensureSvgViewBox(svg, natural) {
    if (!svg.getAttribute("viewBox") && natural.width > 0 && natural.height > 0) {
      svg.setAttribute("viewBox", `0 0 ${natural.width} ${natural.height}`);
    }
  }

  function storeSvgNaturalSize(svg, natural) {
    svg.dataset.molanNaturalW = String(natural.width);
    svg.dataset.molanNaturalH = String(natural.height);
  }

  function readSvgNaturalSize(svg) {
    const w = parseFloat(svg.dataset.molanNaturalW || "");
    const h = parseFloat(svg.dataset.molanNaturalH || "");
    if (Number.isFinite(w) && w > 0 && Number.isFinite(h) && h > 0) {
      return { width: w, height: h };
    }
    return svgNaturalSize(svg);
  }

  function setSvgDisplaySize(svg, width, height) {
    svg.setAttribute("width", String(width));
    svg.setAttribute("height", String(height));
    svg.style.width = `${width}px`;
    svg.style.height = `${height}px`;
    svg.style.maxWidth = "none";
    svg.style.maxHeight = "none";
  }

  function computeSvgFitDisplay(natural, maxW, maxH, insetFactor = 0.94) {
    const nw = Math.max(1, natural.width);
    const nh = Math.max(1, natural.height);
    const fit = Math.min(maxW / nw, maxH / nh) * insetFactor;
    return {
      width: Math.max(1, nw * fit),
      height: Math.max(1, nh * fit),
    };
  }

  function fitSvgToBox(svg, boxWidth, boxHeight, inset = 40) {
    const natural = svgNaturalSize(svg);
    ensureSvgViewBox(svg, natural);
    storeSvgNaturalSize(svg, natural);
    const maxW = Math.max(80, boxWidth - inset * 2);
    const maxH = Math.max(80, boxHeight - inset * 2);
    const display = computeSvgFitDisplay(readSvgNaturalSize(svg), maxW, maxH);
    setSvgDisplaySize(svg, display.width, display.height);
    return display;
  }

  // 克隆进灯箱后若保留原文 id，url(#id) 会解析到文档里那份小图，看起来就一直发糊。
  function uniquifySvgIds(svg) {
    if (!svg) return svg;
    const suffix = `-molan-${Math.random().toString(36).slice(2, 9)}`;
    const mapped = new Map();
    const remember = (id) => {
      if (!id || mapped.has(id)) return;
      mapped.set(id, `${id}${suffix}`);
    };
    remember(svg.getAttribute("id"));
    svg.querySelectorAll("[id]").forEach((el) => remember(el.getAttribute("id")));
    if (!mapped.size) return svg;
    const keys = [...mapped.keys()].sort((a, b) => b.length - a.length);
    const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rewrite = (value) => {
      let next = String(value || "");
      if (!next) return next;
      for (const from of keys) {
        const to = mapped.get(from);
        if (next === from) {
          next = to;
          continue;
        }
        const id = escapeRegExp(from);
        next = next.replace(new RegExp(`url\\((['"]?)#${id}\\1\\)`, "g"), `url($1#${to}$1)`);
        next = next.replace(new RegExp(`#${id}(?![\\w.-])`, "g"), `#${to}`);
      }
      return next;
    };
    const apply = (el) => {
      const id = el.getAttribute("id");
      if (id && mapped.has(id)) el.setAttribute("id", mapped.get(id));
      const attrs = el.attributes;
      if (!attrs) return;
      for (let i = 0; i < attrs.length; i += 1) {
        const attr = attrs[i];
        if (attr.name === "id" || !attr.value || !attr.value.includes("#")) continue;
        const next = rewrite(attr.value);
        if (next !== attr.value) el.setAttribute(attr.name, next);
      }
    };
    apply(svg);
    svg.querySelectorAll("*").forEach(apply);
    svg.querySelectorAll("style").forEach((style) => {
      style.textContent = rewrite(style.textContent);
    });
    return svg;
  }

  function vectorizeSvgForeignObjects(svg) {
    if (!svg) return svg;
    const fos = Array.from(svg.querySelectorAll("foreignObject"));
    fos.forEach((fo) => replaceForeignObjectWithText(fo, fo));
    svg.querySelectorAll("foreignObject").forEach((el) => el.remove());
    return svg;
  }

  function placeSvgCanvas(canvas, box, width, height, panX, panY) {
    if (!canvas || !box) return;
    const w = Math.max(1, width);
    const h = Math.max(1, height);
    canvas.style.inset = "auto";
    canvas.style.left = `${(box.width - w) / 2 + panX}px`;
    canvas.style.top = `${(box.height - h) / 2 + panY}px`;
    canvas.style.right = "auto";
    canvas.style.bottom = "auto";
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.style.transform = "none";
    canvas.style.willChange = "auto";
    canvas.style.padding = "0";
  }

  function resetSvgCanvas(canvas) {
    if (!canvas) return;
    canvas.style.inset = "";
    canvas.style.left = "";
    canvas.style.top = "";
    canvas.style.right = "";
    canvas.style.bottom = "";
    canvas.style.width = "";
    canvas.style.height = "";
    canvas.style.transform = "none";
    canvas.style.willChange = "";
    canvas.style.padding = "";
  }
