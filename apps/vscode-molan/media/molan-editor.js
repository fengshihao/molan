/**
 * 墨览编辑器核心：Vditor 初始化、Mermaid 主题、流程图工具条与灯箱。
 * 源码在 src/editor/*，构建时拼接为 IIFE。浏览器工作室与 VSCode 扩展共用。
 */
(function (global) {
  /* --- load: Vditor / Lute / Mermaid 脚本加载 --- */
  function resolveDefaultCdn() {
    try {
      return new URL("vendor/vditor", document.baseURI || location.href).href.replace(/\/$/, "");
    } catch (_) {
      return "./vendor/vditor";
    }
  }
  const DEFAULT_CDN = resolveDefaultCdn();
  const scriptLoads = Object.create(null);

  function loadScript(src, id) {
    if (id && document.getElementById(id) && isScriptReady(id)) {
      return Promise.resolve();
    }
    const key = id || src;
    if (scriptLoads[key]) return scriptLoads[key];
    scriptLoads[key] = new Promise((resolve, reject) => {
      if (id && document.getElementById(id) && isScriptReady(id)) {
        resolve();
        return;
      }
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = () => {
        if (id && !s.id) s.id = id;
        resolve();
      };
      s.onerror = () => {
        delete scriptLoads[key];
        reject(new Error("加载失败: " + src));
      };
      document.head.appendChild(s);
    });
    return scriptLoads[key];
  }

  function isScriptReady(id) {
    if (id === "vditorLuteScript") return typeof global.Lute === "function";
    if (id === "vditorFullScript") return isFullVditor();
    if (id === "vditorMermaidScript") return !!global.mermaid;
    return true;
  }

  function isFullVditor() {
    return typeof global.Vditor === "function"
      && typeof global.Vditor.prototype?.getValue === "function"
      && typeof global.Vditor.prototype?.setValue === "function";
  }

  function preloadLute(cdn) {
    if (typeof global.Lute === "function") return Promise.resolve();
    return loadScript(`${cdn}/dist/js/lute/lute.min.js`, "vditorLuteScript").catch(() => {});
  }

  function ensureFullVditor(cdn) {
    if (isFullVditor()) return Promise.resolve();
    return loadScript(`${cdn}/dist/index.min.js`, "vditorFullScript").then(() => {
      if (!isFullVditor()) throw new Error("Vditor 编辑器未加载");
    });
  }

  function markdownHasMermaid(text) {
    return /(^|\n)\s*(```+|~~~+)\s*mermaid\b/i.test(String(text || ""));
  }

  function maybePreloadMermaid(cdn, text) {
    if (markdownHasMermaid(text)) return preloadMermaid(cdn);
    return Promise.resolve();
  }

  /* --- i18n: 内置文案回退（MolanI18n 优先） --- */
  function t(key, vars) {
    if (global.MolanI18n && typeof global.MolanI18n.t === "function") {
      return global.MolanI18n.t(key, vars);
    }
    const fallback = {
      diagramNotReady: "流程图尚未渲染完成",
      copiedDiagramImage: "已复制流程图图片",
      copyImageFallback: "当前环境不支持复制图片，已改为下载",
      copyImageFail: "复制图片失败",
      cannotEdit: "无法进入编辑",
      enteredEdit: "已进入源码编辑，点空白处退出",
      editSource: "编辑源码",
      viewDiagram: "观看流程图",
      copyCode: "复制代码",
      copyImage: "复制图片",
      noMermaidSource: "未找到流程图源码",
      copiedMermaidCode: "已复制流程图代码",
      mermaidEditorTitle: "编辑流程图",
      mermaidEditorHint: "左侧编辑源码，右侧实时预览 · ⌘/Ctrl+Enter 应用 · Esc 关闭",
      mermaidEditorApply: "应用",
      mermaidEditorCancel: "取消",
      mermaidSyntaxError: "语法错误",
      mermaidUpdated: "已更新流程图",
      mermaidSnippetsLabel: "常用模板",
      mermaidSnippetFlowchart: "流程图",
      mermaidSnippetSequence: "时序图",
      mermaidSnippetClass: "类图",
      copyFail: "复制失败",
      copiedCode: "已复制代码",
      zoomIn: "放大",
      zoomOut: "缩小",
      find: "查找",
      findPlaceholder: "查找",
      findPrev: "上一个",
      findNext: "下一个",
      findClose: "关闭查找",
      findCase: "区分大小写",
      findNoMatch: "无匹配",
      findMatchCount: "{current}/{total}",
      findAria: "在文档中查找",
      typeAria: "排版",
      typeTitle: "调节字号、行距与字体",
      typeLabel: "排版",
      typeSize: "字号",
      typeLeading: "行距",
      typeGap: "段距",
      typeTracking: "字距",
      typeFont: "字体",
      typeFontTheme: "跟随主题",
      typeFontSans: "黑体",
      typeFontSerif: "宋体",
      typeFontFang: "仿宋",
      typeFontKai: "楷体",
      typeFontNotoSans: "思源黑体",
      typeFontNotoSerif: "思源宋体",
      typeFontXiaowei: "站酷小薇",
      typeFontMashan: "马善政楷",
      typeFontCormorant: "Cormorant",
      typeFontPlex: "IBM Plex",
      typeFontMono: "等宽",
      typeReset: "恢复默认",
      prefsTheme: "纸面",
      themeAria: "界面样式",
      themeXuan: "宣纸",
      themeXuanTitle: "宣纸 · 暖色纸面",
      themeNight: "墨夜",
      themeNightTitle: "墨夜 · 暗色夜读",
      themeHack: "终端",
      themeHackTitle: "终端 · 程序员",
      themeRose: "胭脂",
      themeRoseTitle: "胭脂 · 柔粉纸面",
      themeSlate: "青石",
      themeSlateTitle: "青石 · 冷灰夜读",
      themeMist: "薄雾",
      themeMistTitle: "薄雾 · 冷白纸面",
      themeCinnabar: "朱砂",
      themeCinnabarTitle: "朱砂 · 赭石纸面",
      themeSwitched: "已切换为「{name}」",
      themeTweak: "色调",
      themeBrightness: "亮度",
      themeContrast: "对比",
      themeAccentShift: "强调色",
      themeTweakReset: "恢复色调",
      themeTweakResetDone: "已恢复当前纸面色调",
      prefsAria: "界面配置",
      placeholder: "开始编辑 Markdown…",
      insertBlock: "插入块",
      insertGroupText: "文本",
      insertGroupList: "列表",
      insertGroupInsert: "插入",
      insertH1: "标题 1",
      insertH2: "标题 2",
      insertH3: "标题 3",
      insertUl: "无序列表",
      insertOl: "有序列表",
      insertTask: "任务列表",
      toggleTask: "勾选待办",
      insertQuote: "引用",
      insertHr: "分割线",
      insertCode: "代码块",
      insertTable: "插入表格",
      insertMath: "公式",
      insertMermaid: "流程图",
      insertImage: "图片",
      insertLink: "链接",
      formatBold: "加粗",
      formatItalic: "斜体",
      formatStrike: "删除线",
      formatInlineCode: "行内代码",
      formatLink: "链接",
      formatLinkPlaceholder: "https:// 或相对路径",
      undo: "撤销",
      redo: "重做",
      viewSource: "查看原文",
      sourceTitle: "原文",
      sourceReadonly: "只读",
      sourceEditable: "可直接编辑 Markdown",
      sourceClose: "关闭原文",
      outlineAria: "大纲",
      outlineCloseAria: "收起大纲",
      outlineEmpty: "没有标题",
      pickImageFail: "无法插入图片",
      imageUrlTitle: "插入图片",
      imageUrlHint: "请填写可公开访问的图片地址",
      imageUrlPlaceholder: "https://",
      imageUrlInvalid: "请填写 http 或 https 开头的图片地址",
      imageUrlConfirm: "插入",
      imageUrlCancel: "取消",
      exportPdf: "导出 PDF",
      exportPdfEmpty: "请先打开一篇文档",
      exportPdfFail: "无法打开打印对话框",
      exportPdfPreparing: "正在准备 PDF…",
      exportPdfUseBrowser: "当前窗口不能打印（会把 Cursor 打崩）。已下载网页，请用 Chrome 或 Safari 打开后再存成 PDF。",
      exportAria: "导出",
      exportPng: "导出图片",
      exportPngFail: "导出图片失败",
      exportPngPreparing: "正在生成图片…",
      tableSize: "{cols} 列 × {rows} 行",
      insertRowAbove: "上方插入行",
      insertRowBelow: "下方插入行",
      insertColLeft: "左侧插入列",
      insertColRight: "右侧插入列",
      deleteRow: "删除当前行",
      deleteColumn: "删除当前列",
    };
    let s = fallback[key] || key;
    if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] == null ? "" : String(vars[k])));
    return s;
  }

  /* --- mermaid-theme: 纸面色、toast、Mermaid 主题与预加载 --- */
  function cssVar(name, fallback) {
    try {
      const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return value || fallback;
    } catch (_) {
      return fallback;
    }
  }

  function diagramPaperColors() {
    const paper = cssVar("--paper", "#f4efe6");
    return {
      paper,
      paperDeep: cssVar("--paper-deep", "#ebe4d6"),
      paperLift: cssVar("--paper-lift", "#ffffff"),
      ink: cssVar("--ink", "#1c1914"),
      inkSoft: cssVar("--ink-soft", "#6b5e4e"),
      accent: cssVar("--accent", "#d4773b"),
      onAccent: cssVar("--on-accent", "#fff8f1"),
      tableBg: cssVar("--table-bg", "#ffffff"),
      diagramCard: cssVar("--diagram-card", paper),
      danger: cssVar("--danger", "#c45c4a"),
    };
  }

  function diagramBackgroundColor() {
    return diagramPaperColors().diagramCard;
  }

  function getMermaidOpts() {
    const inlineReader = document.documentElement.style.getPropertyValue("--reader-font").trim();
    const font = (inlineReader || cssVar("--font-ui", '"DM Sans", sans-serif')).replace(/"/g, "");
    const themeName = document.documentElement.getAttribute("data-theme") || "night";
    const scheme = (document.documentElement.style.getPropertyValue("color-scheme")
      || getComputedStyle(document.documentElement).colorScheme
      || "").toLowerCase();
    let dark = scheme.includes("dark");
    if (!scheme) {
      dark = themeName === "night" || themeName === "hack" || themeName === "slate";
    }
    const c = diagramPaperColors();
    return {
      startOnLoad: false,
      theme: dark ? "dark" : "base",
      securityLevel: "loose",
      flowchart: { htmlLabels: true, useMaxWidth: true },
      themeVariables: {
        darkMode: dark,
        primaryColor: c.paper,
        primaryTextColor: c.ink,
        primaryBorderColor: c.accent,
        lineColor: c.inkSoft,
        secondaryColor: c.paperDeep,
        tertiaryColor: c.tableBg,
        background: c.diagramCard,
        mainBkg: c.paper,
        nodeBorder: c.accent,
        clusterBkg: c.paperDeep,
        titleColor: c.ink,
        textColor: c.ink,
        edgeLabelBackground: c.paperLift,
        fontFamily: font,
        actorBkg: c.paperDeep,
        actorBorder: c.accent,
        actorTextColor: c.ink,
        actorLineColor: c.accent,
        signalColor: c.inkSoft,
        signalTextColor: c.ink,
        labelBoxBkgColor: c.paperDeep,
        labelBoxBorderColor: c.accent,
        labelTextColor: c.ink,
        loopTextColor: c.ink,
        noteBkgColor: c.paperLift,
        noteTextColor: c.ink,
        noteBorderColor: c.accent,
        activationBkgColor: c.paperLift,
        activationBorderColor: c.accent,
        sequenceNumberColor: c.onAccent,
        errorBkgColor: c.danger,
        errorTextColor: c.ink,
      },
      themeCSS: `
        /* molan-theme:${themeName} */
        .node rect,
        .node polygon,
        .cluster rect {
          rx: 8px;
          ry: 8px;
        }
      `,
    };
  }

  let toastEl = null;
  let activeBlockInsert = null;
  let diagramObserver = null;
  let lightboxBound = false;
  let lightboxOnEdit = null;

  function toast(msg) {
    if (!toastEl) toastEl = document.getElementById("toast");
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toastEl.classList.remove("show"), 2200);
  }

  function countWords(text) {
    const cn = (String(text).match(/[\u4e00-\u9fff]/g) || []).length;
    const en = (String(text).replace(/[\u4e00-\u9fff]/g, " ").match(/[A-Za-z0-9]+/g) || []).length;
    return cn + en;
  }

  function applyMermaidTheme() {
    if (!global.mermaid || typeof mermaid.initialize !== "function") return false;
    try {
      patchMermaidInitialize();
      if (typeof mermaid.mermaidAPI?.reset === "function") {
        try { mermaid.mermaidAPI.reset(); } catch (_) { /* ignore */ }
      }
      mermaid.initialize(getMermaidOpts());
      return true;
    } catch (_) {
      return false;
    }
  }

  function mermaidRoot() {
    return document.getElementById("editorWrap")
      || document.getElementById("molanPreview")
      || document.getElementById("vditor")
      || document;
  }

  let mermaidMarkdownProvider = null;
  let lastEditorApi = null;
  const themeChangeListeners = [];

  function setMermaidMarkdownProvider(fn) {
    mermaidMarkdownProvider = typeof fn === "function" ? fn : null;
  }

  function onThemeChange(fn) {
    if (typeof fn !== "function") return () => {};
    themeChangeListeners.push(fn);
    return () => {
      const i = themeChangeListeners.indexOf(fn);
      if (i >= 0) themeChangeListeners.splice(i, 1);
    };
  }

  function extractMermaidSources(text) {
    const out = [];
    const src = String(text || "");
    const re = /(?:^|\n)[ \t]*(```+|~~~+)[ \t]*mermaid[^\n]*\n([\s\S]*?)(?:\n[ \t]*\1[ \t]*(?:\n|$))/gi;
    let match;
    while ((match = re.exec(src))) out.push(match[2].trim());
    return out;
  }

  function replaceMermaidBlock(markdown, index, newSource) {
    const src = String(markdown || "");
    const re = /(?:^|\n)([ \t]*(```+|~~~+)[ \t]*mermaid[^\n]*\n)([\s\S]*?)(?:\n[ \t]*\2[ \t]*(?:\n|$))/gi;
    let match;
    let i = 0;
    while ((match = re.exec(src))) {
      if (i === index) {
        const lead = match[0].startsWith("\n") ? "\n" : "";
        const open = match[1];
        const closeMatch = match[0].match(/\n[ \t]*(`{3,}|~{3,})[ \t]*(?:\n|$)/);
        const close = closeMatch ? closeMatch[0] : "\n```\n";
        const body = String(newSource || "").trim();
        const replacement = `${lead}${open}${body}${close}`;
        return src.slice(0, match.index) + replacement + src.slice(match.index + match[0].length);
      }
      i += 1;
    }
    return src;
  }

  function mermaidSourcesFromMarkdown() {
    if (typeof mermaidMarkdownProvider !== "function") return [];
    try {
      return extractMermaidSources(mermaidMarkdownProvider());
    } catch (_) {
      return [];
    }
  }

  function isValidMermaidSource(text) {
    const s = String(text || "").trim();
    if (!s || /^svg\s*$/i.test(s)) return false;
    if (/^<\s*svg[\s>]/i.test(s)) return false;
    return /^(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|stateDiagram-v2|erDiagram|journey|gantt|pie|mindmap|timeline|gitGraph|C4Context|sankey|xychart|block-beta|%%)/im.test(s);
  }

  function mermaidDisplayHosts(root = document) {
    return Array.from(root.querySelectorAll(".language-mermaid")).filter((host) => {
      if (host.closest(".vditor-ir__marker--pre, .vditor-ir__marker")) return false;
      if (host.closest(".vditor-ir__preview, #molanPreviewBody, .molan-preview")) return true;
      return host.classList.contains("molan-mermaid-shell");
    });
  }

  function captureMermaidSource(el) {
    if (!el || el.nodeType !== 1) return;
    if (el.getAttribute("data-molan-source")) return;
    const node = el.closest(".vditor-ir__node");
    const marker = node?.querySelector?.(".vditor-ir__marker--pre code.language-mermaid");
    const markerText = marker?.textContent?.trim();
    if (markerText && isValidMermaidSource(markerText)) {
      el.setAttribute("data-molan-source", markerText);
      return;
    }
    if (el.getAttribute("data-processed") === "true") return;
    if (el.querySelector("svg")) return;
    const text = (el.textContent || "").trim();
    if (text && isValidMermaidSource(text)) el.setAttribute("data-molan-source", text);
  }

  function captureMermaidSources(root = document) {
    root.querySelectorAll?.(".language-mermaid")?.forEach(captureMermaidSource);
  }

  function stampMermaidSources(root, text) {
    if (!root) return;
    const sources = extractMermaidSources(text);
    mermaidDisplayHosts(root).forEach((el, i) => {
      if (sources[i] && isValidMermaidSource(sources[i])) {
        el.setAttribute("data-molan-source", sources[i]);
      } else {
        captureMermaidSource(el);
      }
    });
  }

  function scheduleMermaidThemeRefresh() {
    const run = () => {
      applyMermaidTheme();
      if (themeChangeListeners.length) {
        themeChangeListeners.forEach((fn) => {
          try { fn(); } catch (_) { /* ignore */ }
        });
        return;
      }
      refreshMermaidDiagrams(mermaidRoot());
    };
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(run);
    else run();
  }

  function patchMermaidInitialize() {
    if (!global.mermaid || mermaid.__molanPatched) return;
    const raw = mermaid.initialize.bind(mermaid);
    mermaid.initialize = (opts = {}) => {
      const next = getMermaidOpts();
      return raw({
        ...opts,
        ...next,
        themeVariables: {
          ...(opts.themeVariables || {}),
          ...next.themeVariables,
        },
      });
    };
    mermaid.__molanPatched = true;
  }

  function patchMermaidLoader() {
    if (patchMermaidLoader.done) return;
    patchMermaidLoader.done = true;
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      if (applyMermaidTheme() || tries > 80) clearInterval(timer);
    }, 250);

    const origAppend = document.head.appendChild.bind(document.head);
    document.head.appendChild = function patchedAppend(node) {
      const el = origAppend(node);
      if (node && node.tagName === "SCRIPT" && /mermaid/i.test(node.src || "")) {
        node.addEventListener("load", () => {
          applyMermaidTheme();
          patchMermaidInitialize();
        });
      }
      return el;
    };
  }

  function preloadMermaid(cdn) {
    const ready = () => {
      applyMermaidTheme();
      patchMermaidInitialize();
      if (typeof scheduleMermaidReadyRefresh === "function") scheduleMermaidReadyRefresh();
    };
    if (global.mermaid) {
      ready();
      return Promise.resolve();
    }
    return loadScript(`${cdn}/dist/js/mermaid/mermaid.min.js`, "vditorMermaidScript")
      .then(ready)
      .catch(() => {});
  }

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

  /* --- lightbox: 流程图灯箱 --- */
  function initLightbox() {
    const lightbox = document.getElementById("lightbox");
    const lightboxStage = document.getElementById("lightboxStage");
    const lightboxCanvas = document.getElementById("lightboxCanvas");
    const lightboxClose = document.getElementById("lightboxClose");
    const lightboxZoomIn = document.getElementById("lightboxZoomIn");
    const lightboxZoomOut = document.getElementById("lightboxZoomOut");
    const lightboxEdit = document.getElementById("lightboxEdit");
    const lightboxReset = document.getElementById("lightboxReset");
    const lightboxCopyImage = document.getElementById("lightboxCopyImage");
    if (!lightbox || !lightboxStage || !lightboxCanvas) {
      return {
        openFromSvg() { toast(t("diagramNotReady")); },
        close() {},
        isOpen() { return false; },
        setOnEdit(fn) { lightboxOnEdit = fn; },
        copySvgAsPng,
      };
    }

    let lightboxUserScale = 1;
    let lightboxFitW = 1;
    let lightboxFitH = 1;
    let lightboxPanX = 0;
    let lightboxPanY = 0;
    let lightboxDragging = false;
    let lightboxDragOrigin = null;
    let lightboxOriginShell = null;

    if (lightboxEdit) {
      lightboxEdit.title = t("mermaidEditorTitle");
      lightboxEdit.setAttribute("aria-label", t("mermaidEditorTitle"));
    }

    function closeLightbox() {
      lightbox.classList.remove("open", "is-preparing");
      lightbox.setAttribute("aria-hidden", "true");
      lightboxCanvas.innerHTML = "";
      lightboxUserScale = 1;
      lightboxFitW = 1;
      lightboxFitH = 1;
      lightboxPanX = 0;
      lightboxPanY = 0;
      lightboxDragging = false;
      lightboxDragOrigin = null;
      lightboxOriginShell = null;
      lightboxStage.classList.remove("is-dragging");
      resetSvgCanvas(lightboxCanvas);
    }

    function applyLightboxView() {
      const svg = lightboxCanvas.querySelector("svg");
      const stage = lightboxStage.getBoundingClientRect();
      const width = Math.max(1, lightboxFitW * lightboxUserScale);
      const height = Math.max(1, lightboxFitH * lightboxUserScale);
      if (svg) setSvgDisplaySize(svg, width, height);
      placeSvgCanvas(lightboxCanvas, stage, width, height, lightboxPanX, lightboxPanY);
    }

    function prepareLightboxSvg(clone) {
      clone.removeAttribute("style");
      const natural = svgNaturalSize(clone);
      ensureSvgViewBox(clone, natural);
      storeSvgNaturalSize(clone, natural);
    }

    function fitLightboxView() {
      const svg = lightboxCanvas.querySelector("svg");
      lightboxUserScale = 1;
      lightboxPanX = 0;
      lightboxPanY = 0;
      if (!svg) {
        lightboxFitW = 1;
        lightboxFitH = 1;
        applyLightboxView();
        return;
      }
      const stage = lightboxStage.getBoundingClientRect();
      const display = fitSvgToBox(svg, stage.width, stage.height);
      lightboxFitW = display.width;
      lightboxFitH = display.height;
      applyLightboxView();
    }

    function resetLightboxView() {
      fitLightboxView();
    }

    function openLightboxFromSvg(svg) {
      if (!svg) {
        toast(t("diagramNotReady"));
        return;
      }
      lightboxOriginShell = findMermaidPreviewShell(svg)
        || svg.closest?.(".molan-mermaid-shell, .vditor-ir__preview, pre, .language-mermaid")
        || null;
      lightboxCanvas.innerHTML = "";
      const clone = svg.cloneNode(true);
      prepareLightboxSvg(clone);
      uniquifySvgIds(clone);
      lightboxCanvas.appendChild(clone);
      lightbox.classList.add("open", "is-preparing");
      lightbox.setAttribute("aria-hidden", "false");
      void lightboxStage.offsetHeight;
      vectorizeSvgForeignObjects(clone);
      fitLightboxView();
      lightbox.classList.remove("is-preparing");
    }

    if (!lightboxBound) {
      lightboxBound = true;
      lightboxClose?.addEventListener("click", closeLightbox);
      lightbox.addEventListener("click", (e) => {
        if (e.target === lightbox) closeLightbox();
      });
      lightboxZoomIn?.addEventListener("click", () => {
        lightboxUserScale = Math.min(lightboxUserScale + 0.25, 5);
        applyLightboxView();
      });
      lightboxZoomOut?.addEventListener("click", () => {
        lightboxUserScale = Math.max(lightboxUserScale - 0.25, 0.35);
        applyLightboxView();
      });
      lightboxEdit?.addEventListener("click", () => {
        const shell = lightboxOriginShell;
        closeLightbox();
        if (typeof lightboxOnEdit === "function") {
          lightboxOnEdit(shell);
        }
      });
      lightboxReset?.addEventListener("click", resetLightboxView);
      lightboxCopyImage?.addEventListener("click", () => {
        copySvgAsPng(lightboxCanvas.querySelector("svg"));
      });

      lightboxStage.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        lightboxDragging = true;
        lightboxDragOrigin = {
          x: e.clientX,
          y: e.clientY,
          panX: lightboxPanX,
          panY: lightboxPanY,
        };
        lightboxStage.classList.add("is-dragging");
        lightboxStage.setPointerCapture?.(e.pointerId);
      });
      lightboxStage.addEventListener("pointermove", (e) => {
        if (!lightboxDragging || !lightboxDragOrigin) return;
        lightboxPanX = lightboxDragOrigin.panX + (e.clientX - lightboxDragOrigin.x);
        lightboxPanY = lightboxDragOrigin.panY + (e.clientY - lightboxDragOrigin.y);
        applyLightboxView();
      });
      const endLightboxDrag = (e) => {
        if (!lightboxDragging) return;
        lightboxDragging = false;
        lightboxDragOrigin = null;
        lightboxStage.classList.remove("is-dragging");
        try { lightboxStage.releasePointerCapture?.(e.pointerId); } catch (_) { /* ignore */ }
      };
      lightboxStage.addEventListener("pointerup", endLightboxDrag);
      lightboxStage.addEventListener("pointercancel", endLightboxDrag);
      lightboxStage.addEventListener("wheel", (e) => {
        if (!lightbox.classList.contains("open")) return;
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.12 : 0.12;
        const next = Math.min(5, Math.max(0.35, lightboxUserScale + delta));
        const rect = lightboxStage.getBoundingClientRect();
        const cx = e.clientX - rect.left - rect.width / 2;
        const cy = e.clientY - rect.top - rect.height / 2;
        const ratio = next / lightboxUserScale;
        lightboxPanX = cx - (cx - lightboxPanX) * ratio;
        lightboxPanY = cy - (cy - lightboxPanY) * ratio;
        lightboxUserScale = next;
        applyLightboxView();
      }, { passive: false });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && lightbox.classList.contains("open")) {
          e.preventDefault();
          closeLightbox();
        }
      });
    }

    return {
      openFromSvg: openLightboxFromSvg,
      close: closeLightbox,
      isOpen: () => lightbox.classList.contains("open"),
      setOnEdit(fn) { lightboxOnEdit = fn; },
      copySvgAsPng,
    };
  }

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

  function enhanceMermaidPreviews(root = document) {
    captureMermaidSources(root);
    const codes = root.querySelectorAll(".language-mermaid");
    codes.forEach((code) => {
      stripMermaidHostSource(code);
      const shell = code.closest(".vditor-ir__preview") || code.closest("pre") || code;
      const source = getMermaidSourceNear(shell);
      if (source) code.setAttribute("data-molan-source", source);
      if (!shell || shell.querySelector(":scope > .molan-diagram-toolbar")) return;
      if (!shell.querySelector("svg")) return;
      if (getComputedStyle(shell).position === "static") shell.style.position = "relative";
      shell.classList.add("molan-mermaid-shell");
      const bar = document.createElement("div");
      bar.className = "molan-diagram-toolbar";
      bar.innerHTML = `
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
      `;
      shell.appendChild(bar);
    });
  }

  /* --- table: 表格自适应、工具条与尺寸选择器 --- */
  function contentBoxWidth(el) {
    if (!el) return 0;
    const cs = getComputedStyle(el);
    return el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  }

  function naturalTableMetrics(table) {
    const source = table.closest(".vditor-reset");
    const probe = document.createElement("div");
    probe.className = source?.className || "vditor-reset";
    const clone = table.cloneNode(true);
    clone.classList.remove("molan-table--wide");
    clone.setAttribute("aria-hidden", "true");
    Object.assign(probe.style, {
      position: "fixed",
      visibility: "hidden",
      pointerEvents: "none",
      left: "-100000px",
      top: "0",
    });
    Object.assign(clone.style, { width: "max-content", maxWidth: "none" });
    probe.appendChild(clone);
    document.body.appendChild(probe);
    const columns = [];
    Array.from(clone.rows).forEach((row) => {
      Array.from(row.cells).forEach((cell, index) => {
        const tokens = (cell.textContent || "").match(/[A-Za-z0-9_./\\:$@#%-]+/g) || [];
        const longestToken = tokens.reduce((length, token) => Math.max(length, token.length), 0);
        const preferredMin = cell.querySelector("code") || longestToken >= 18
          ? 168
          : longestToken >= 12
            ? 144
            : 0;
        const current = columns[index] || { natural: 0, preferredMin: 0 };
        columns[index] = {
          natural: Math.max(current.natural, cell.getBoundingClientRect().width),
          preferredMin: Math.max(current.preferredMin, preferredMin),
        };
      });
    });
    const metrics = { width: clone.getBoundingClientRect().width, columns };
    probe.remove();
    return metrics;
  }

  function distributeColumnWidths(naturalColumns, availableWidth) {
    const count = naturalColumns.length;
    if (!count) return [];
    const hardMin = Math.max(64, Math.min(96, availableWidth / count * 0.6));
    const defaultMin = Math.max(80, Math.min(112, availableWidth / count * 0.72));
    let minimums = naturalColumns.map((column) =>
      Math.max(defaultMin, Math.min(column.preferredMin || 0, availableWidth * 0.42)));
    const minimumTotal = minimums.reduce((total, width) => total + width, 0);
    if (minimumTotal > availableWidth) {
      const extraRoom = Math.max(0, availableWidth - hardMin * count);
      const requestedExtra = minimums.map((width) => Math.max(0, width - hardMin));
      const requestedTotal = requestedExtra.reduce((total, width) => total + width, 0);
      minimums = requestedExtra.map((extra) =>
        hardMin + (requestedTotal ? extraRoom * extra / requestedTotal : extraRoom / count));
    }
    const max = Math.max(...minimums, availableWidth * 0.52);
    const ideal = naturalColumns.map((column, index) =>
      Math.max(minimums[index], Math.min(max, column.natural)));
    const idealExtra = ideal.map((width, index) => width - minimums[index]);
    const extraTotal = idealExtra.reduce((total, width) => total + width, 0);
    const remaining = Math.max(0, availableWidth - minimums.reduce((total, width) => total + width, 0));
    if (!extraTotal) return minimums.map((width) => width + remaining / count);
    return idealExtra.map((extra, index) => minimums[index] + remaining * extra / extraTotal);
  }

  function clearMolanTableLayout(root) {
    root?.querySelectorAll(".molan-table--wide").forEach((table) => {
      table.classList.remove("molan-table--wide");
      for (let index = 1; index <= 12; index += 1) {
        table.style.removeProperty(`--molan-col-${index}`);
      }
    });
  }

  function fitMolanTables(root) {
    if (!root) return;
    root.querySelectorAll(".vditor-reset table").forEach((table) => {
      const host = table.closest(".vditor-reset") || table.parentElement;
      const cap = contentBoxWidth(host);
      if (cap <= 0) return;
      const metrics = naturalTableMetrics(table);
      const isWide = metrics.width > cap + 2;
      table.classList.toggle("molan-table--wide", isWide);
      if (!isWide) return;
      distributeColumnWidths(metrics.columns.slice(0, 12), cap).forEach((width, index) => {
        table.style.setProperty(`--molan-col-${index + 1}`, `${width}px`);
      });
    });
  }

  function scheduleFitTables(root) {
    if (!root) return;
    cancelAnimationFrame(scheduleFitTables._raf);
    scheduleFitTables._raf = requestAnimationFrame(() => fitMolanTables(root));
  }

  function watchTables(root) {
    if (!root) return;
    scheduleFitTables(root);
    if (watchTables._obs) return;
    watchTables._obs = new ResizeObserver(() => scheduleFitTables(root));
    watchTables._obs.observe(root);
    const reset = root.querySelector(".vditor-reset");
    if (reset) watchTables._obs.observe(reset);
  }

  const TABLE_PICKER_MAX = 8;
  const TABLE_ACTIONS = [
    ["insertRowAbove", "insertRowAbove"],
    ["insertRowBelow", "insertRowBelow"],
    "|",
    ["insertColLeft", "insertColLeft"],
    ["insertColRight", "insertColRight"],
    "|",
    ["deleteRow", "deleteRow"],
    ["deleteColumn", "deleteColumn"],
  ];
  const TABLE_ICONS = {
    insertRowAbove: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="11" width="16" height="9" rx="1.5"/><path d="M12 3v6M9 6h6"/></svg>',
    insertRowBelow: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="9" rx="1.5"/><path d="M12 15v6M9 18h6"/></svg>',
    insertColLeft: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="11" y="4" width="9" height="16" rx="1.5"/><path d="M3 12h6M6 9v6"/></svg>',
    insertColRight: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="9" height="16" rx="1.5"/><path d="M15 12h6M18 9v6"/></svg>',
    deleteRow: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="8" width="16" height="8" rx="1.5"/><path d="M8 12h8"/></svg>',
    deleteColumn: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="4" width="8" height="16" rx="1.5"/><path d="M10 12h4"/></svg>',
  };

  function buildTableMarkdown(rows, cols) {
    const rowCount = Math.max(1, Math.min(20, Number(rows) || 1));
    const colCount = Math.max(1, Math.min(20, Number(cols) || 1));
    const line = (fill) => `|${Array.from({ length: colCount }, () => ` ${fill} `).join("|")}|`;
    return [line(""), line("---"), ...Array.from({ length: rowCount - 1 }, () => line(""))].join("\n");
  }

  function tableCellFromNode(node) {
    if (!node) return null;
    const el = node.nodeType === 1 ? node : node.parentElement;
    return el?.closest?.("td, th") || null;
  }

  function irHostOf(root) {
    return root?.querySelector?.(".vditor-ir") || root;
  }

  function currentEditorMode(vditor) {
    const iv = vditor?.vditor || vditor;
    return iv?.currentMode || "ir";
  }

  function notifyTableEdit(vditor, root) {
    try {
      const iv = vditor?.vditor || vditor;
      iv?.options?.input?.("");
      iv?.undo?.addToUndoStack?.(iv);
    } catch (_) { /* ignore */ }
    scheduleFitTables(root);
  }

  function focusTableCell(cell) {
    if (!cell) return;
    const range = document.createRange();
    range.selectNodeContents(cell);
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function ensureTbody(table) {
    if (table.tBodies[0]) return table.tBodies[0];
    const tbody = document.createElement("tbody");
    table.appendChild(tbody);
    return tbody;
  }

  function rowCellHtml(count, tag) {
    const name = tag === "th" ? "th" : "td";
    return Array.from({ length: count }, () => `<${name}> </${name}>`).join("");
  }

  function insertTableRow(cell, where) {
    const row = cell.parentElement;
    const table = cell.closest("table");
    if (!row || !table) return null;
    const html = `<tr>${rowCellHtml(row.cells.length, "td")}</tr>`;
    const inHead = row.parentElement?.tagName === "THEAD" || cell.tagName === "TH";
    if (inHead) {
      const tbody = ensureTbody(table);
      tbody.insertAdjacentHTML("afterbegin", html);
      return tbody.rows[0]?.cells[cell.cellIndex] || tbody.rows[0]?.cells[0];
    }
    row.insertAdjacentHTML(where === "before" ? "beforebegin" : "afterend", html);
    const next = where === "before" ? row.previousElementSibling : row.nextElementSibling;
    return next?.cells?.[cell.cellIndex] || next?.cells?.[0];
  }

  function insertTableColumn(cell, where) {
    const table = cell.closest("table");
    if (!table) return null;
    const index = cell.cellIndex;
    const pos = where === "before" ? "beforebegin" : "afterend";
    Array.from(table.rows).forEach((row) => {
      const ref = row.cells[index];
      if (!ref) return;
      const tag = ref.tagName.toLowerCase();
      ref.insertAdjacentHTML(pos, `<${tag}> </${tag}>`);
    });
    const updated = cell.parentElement?.cells?.[where === "before" ? index : index + 1];
    return updated || cell;
  }

  function deleteTableRow(cell) {
    if (!cell || cell.tagName === "TH") return cell;
    const row = cell.parentElement;
    const table = cell.closest("table");
    const body = row?.parentElement;
    if (!row || !table || !body || body.tagName === "THEAD") return cell;
    const col = cell.cellIndex;
    const fallback = row.nextElementSibling
      || row.previousElementSibling
      || table.tHead?.rows?.[0];
    const next = fallback?.cells?.[col] || fallback?.cells?.[0] || null;
    row.remove();
    if (body.tagName === "TBODY" && body.rows.length === 0) body.remove();
    return next;
  }

  function deleteTableColumn(cell) {
    const table = cell.closest("table");
    if (!table) return null;
    const index = cell.cellIndex;
    if ((table.rows[0]?.cells.length || 0) <= 1) {
      const p = document.createElement("p");
      p.setAttribute("data-block", "0");
      p.textContent = "";
      table.replaceWith(p);
      focusTableCell(p);
      return null;
    }
    const neighbor = cell.nextElementSibling || cell.previousElementSibling;
    Array.from(table.rows).forEach((row) => {
      row.cells[index]?.remove();
    });
    return neighbor;
  }

  function applyTableAction(action, cell) {
    if (!cell) return null;
    switch (action) {
      case "insertRowAbove":
        return insertTableRow(cell, "before");
      case "insertRowBelow":
        return insertTableRow(cell, "after");
      case "insertColLeft":
        return insertTableColumn(cell, "before");
      case "insertColRight":
        return insertTableColumn(cell, "after");
      case "deleteRow":
        return deleteTableRow(cell);
      case "deleteColumn":
        return deleteTableColumn(cell);
      default:
        return cell;
    }
  }

  function hideTableToolbar(bar) {
    if (bar) bar.hidden = true;
  }

  function positionTableToolbar(bar, table, host) {
    if (!bar || !table) return;
    const tableRect = table.getBoundingClientRect();
    const hostRect = host?.getBoundingClientRect?.() || tableRect;
    const gap = 8;
    let top = tableRect.top - bar.offsetHeight - gap;
    if (top < Math.max(8, hostRect.top + 4)) {
      top = Math.min(tableRect.top + gap, hostRect.bottom - bar.offsetHeight - 4);
    }
    let left = tableRect.left;
    const maxLeft = window.innerWidth - bar.offsetWidth - 8;
    left = Math.max(8, Math.min(left, maxLeft));
    bar.style.top = `${Math.round(top)}px`;
    bar.style.left = `${Math.round(left)}px`;
  }

  function ensureTableToolbar(root) {
    let bar = document.getElementById("molanTableToolbar");
    if (bar) return bar;
    bar = document.createElement("div");
    bar.id = "molanTableToolbar";
    bar.className = "molan-table-toolbar";
    bar.hidden = true;
    bar.setAttribute("role", "toolbar");
    bar.innerHTML = TABLE_ACTIONS.map((item) => {
      if (item === "|") return '<span class="molan-table-toolbar__sep" aria-hidden="true"></span>';
      const [action, key] = item;
      const label = t(key);
      return `<button type="button" class="icon-btn" data-molan-table="${action}" title="${label}" aria-label="${label}">${TABLE_ICONS[action]}</button>`;
    }).join("");
    document.body.appendChild(bar);
    return bar;
  }

  function refreshTableToolbarI18n(root = document) {
    root.querySelectorAll("[data-molan-table]").forEach((btn) => {
      const action = btn.getAttribute("data-molan-table");
      const key = {
        insertRowAbove: "insertRowAbove",
        insertRowBelow: "insertRowBelow",
        insertColLeft: "insertColLeft",
        insertColRight: "insertColRight",
        deleteRow: "deleteRow",
        deleteColumn: "deleteColumn",
      }[action];
      if (!key) return;
      const label = t(key);
      btn.title = label;
      btn.setAttribute("aria-label", label);
    });
  }

  function bindTableControls(root, getVditor) {
    if (!root || root.dataset.molanTableControls === "1") return;
    root.dataset.molanTableControls = "1";
    const bar = ensureTableToolbar(root);
    let lastCell = null;
    let raf = 0;

    const sync = () => {
      const vditor = getVditor?.();
      if (root.classList.contains("is-preview") || currentEditorMode(vditor) !== "ir") {
        hideTableToolbar(bar);
        return;
      }
      const cell = tableCellFromNode(window.getSelection()?.anchorNode);
      if (!cell || !root.contains(cell) || !cell.closest(".vditor-ir")) {
        if (!bar.contains(document.activeElement)) hideTableToolbar(bar);
        return;
      }
      lastCell = cell;
      const table = cell.closest("table");
      const host = irHostOf(root);
      const deleteRowBtn = bar.querySelector('[data-molan-table="deleteRow"]');
      if (deleteRowBtn) {
        const locked = cell.tagName === "TH";
        deleteRowBtn.disabled = locked;
        deleteRowBtn.classList.toggle("is-disabled", locked);
      }
      bar.hidden = false;
      positionTableToolbar(bar, table, host);
    };

    const scheduleSync = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        sync();
      });
    };

    document.addEventListener("selectionchange", scheduleSync);
    root.addEventListener("keyup", scheduleSync);
    root.addEventListener("mouseup", scheduleSync);
    irHostOf(root)?.addEventListener("scroll", () => {
      if (!bar.hidden && lastCell?.isConnected) {
        positionTableToolbar(bar, lastCell.closest("table"), irHostOf(root));
      }
    }, { passive: true });
    window.addEventListener("resize", () => {
      if (!bar.hidden && lastCell?.isConnected) {
        positionTableToolbar(bar, lastCell.closest("table"), irHostOf(root));
      }
    });

    bar.addEventListener("mousedown", (e) => {
      e.preventDefault();
    });
    bar.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-molan-table]");
      if (!btn || btn.disabled) return;
      const cell = lastCell?.isConnected
        ? lastCell
        : tableCellFromNode(window.getSelection()?.anchorNode);
      if (!cell || !root.contains(cell)) return;
      const next = applyTableAction(btn.getAttribute("data-molan-table"), cell);
      const vditor = getVditor?.();
      if (next) {
        lastCell = next;
        focusTableCell(next);
      } else {
        lastCell = null;
        hideTableToolbar(bar);
      }
      notifyTableEdit(vditor, root);
      scheduleSync();
    });
  }

  function hideTablePicker() {
    const picker = document.getElementById("molanTablePicker");
    if (picker) picker.hidden = true;
  }

  function positionTablePicker(picker, anchor) {
    const rect = anchor.getBoundingClientRect();
    const width = picker.offsetWidth || 180;
    const height = picker.offsetHeight || 200;
    let left = rect.left;
    let top = rect.bottom + 8;
    if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
    if (left < 8) left = 8;
    if (top + height > window.innerHeight - 8) top = rect.top - height - 8;
    if (top < 8) top = 8;
    picker.style.left = `${Math.round(left)}px`;
    picker.style.top = `${Math.round(top)}px`;
  }

  function paintTablePicker(picker, cols, rows) {
    picker.querySelectorAll("[data-col]").forEach((cell) => {
      const c = Number(cell.getAttribute("data-col"));
      const r = Number(cell.getAttribute("data-row"));
      cell.classList.toggle("is-on", c <= cols && r <= rows);
    });
    const label = picker.querySelector(".molan-table-picker__label");
    if (label) label.textContent = t("tableSize", { cols, rows });
  }

  function ensureTablePicker() {
    let picker = document.getElementById("molanTablePicker");
    if (picker) return picker;
    picker = document.createElement("div");
    picker.id = "molanTablePicker";
    picker.className = "molan-table-picker";
    picker.hidden = true;
    picker.setAttribute("role", "dialog");
    picker.setAttribute("aria-label", t("insertTable"));
    const cells = [];
    for (let r = 1; r <= TABLE_PICKER_MAX; r += 1) {
      for (let c = 1; c <= TABLE_PICKER_MAX; c += 1) {
        cells.push(`<button type="button" class="molan-table-picker__cell" data-col="${c}" data-row="${r}" aria-label="${c} × ${r}"></button>`);
      }
    }
    picker.innerHTML = `
      <div class="molan-table-picker__grid" style="grid-template-columns:repeat(${TABLE_PICKER_MAX}, 16px)">${cells.join("")}</div>
      <div class="molan-table-picker__label">${t("tableSize", { cols: 3, rows: 3 })}</div>
    `;
    document.body.appendChild(picker);
    picker.addEventListener("mousedown", (e) => e.preventDefault());
    picker.addEventListener("mouseover", (e) => {
      const cell = e.target.closest("[data-col]");
      if (!cell) return;
      paintTablePicker(picker, Number(cell.getAttribute("data-col")), Number(cell.getAttribute("data-row")));
    });
    picker.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hideTablePicker();
    });
    return picker;
  }

  function showTableSizePicker(anchor, vditor) {
    const picker = ensureTablePicker();
    picker._vditor = vditor;
    picker._anchor = anchor;
    picker.hidden = false;
    picker.setAttribute("aria-label", t("insertTable"));
    paintTablePicker(picker, 3, 3);
    positionTablePicker(picker, anchor);
  }

  function currentIrBlock(ir) {
    if (!ir) return null;
    const sel = window.getSelection();
    let node = sel?.anchorNode;
    if (node?.nodeType === 3) node = node.parentElement;
    if (!node || !ir.contains(node)) return ir.lastElementChild;
    while (node && node.parentElement !== ir) node = node.parentElement;
    return node;
  }

  function insertPickedTable(vditor, rows, cols) {
    hideTablePicker();
    const md = buildTableMarkdown(rows, cols);
    const iv = vditor?.vditor || vditor;
    const ir = iv?.ir?.element;
    const lute = iv?.lute;
    try { vditor?.focus?.(); } catch (_) { /* ignore */ }
    if (ir && lute && typeof lute.Md2VditorIRDOM === "function") {
      const html = lute.Md2VditorIRDOM(`\n${md}\n`);
      const block = currentIrBlock(ir);
      withMutedIrInput(vditor, () => {
        if (block) block.insertAdjacentHTML("afterend", html);
        else ir.insertAdjacentHTML("beforeend", html);
      });
      const inserted = (block?.nextElementSibling) || ir.lastElementChild;
      const table = inserted?.tagName === "TABLE" ? inserted : inserted?.querySelector?.("table");
      const firstCell = table?.querySelector?.("th, td");
      if (firstCell) focusTableCell(firstCell);
      notifyTableEdit(vditor, ir.closest("#vditor") || ir);
      scheduleFitTables(ir.closest("#vditor") || ir);
      return;
    }
    try { vditor.focus(); } catch (_) { /* ignore */ }
    if (vditor && typeof vditor.insertValue === "function") {
      vditor.insertValue(`\n\n${md}\n\n`);
    }
  }

  function eventPath(e) {
    if (typeof e.composedPath === "function") {
      try { return e.composedPath(); } catch (_) { /* ignore */ }
    }
    const path = [];
    let node = e.target;
    while (node) {
      path.push(node);
      node = node.parentNode;
    }
    return path;
  }

  /* --- source: 原文面板 --- */
  const SOURCE_ICON = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 7.5 4.5 12 9 16.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 7.5 19.5 12 15 16.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function scrollToHeading(index) {
    const wrap = document.getElementById("editorWrap") || document.querySelector(".editor-wrap");
    if (!wrap || index == null || index < 0) return;
    const el = wrap.querySelector(".molan-preview h1, .molan-preview h2, .molan-preview h3, .molan-preview h4, .molan-preview h5, .molan-preview h6")
      ?.parentElement?.closest(".molan-preview")
      ? [...wrap.querySelectorAll(".molan-preview h1, .molan-preview h2, .molan-preview h3, .molan-preview h4, .molan-preview h5, .molan-preview h6")][index]
      : null;
    el?.scrollIntoView({ block: "start", behavior: "smooth" });
  }

  function markdownHeadings(md) {
    const lines = String(md || "").split("\n");
    const heads = [];
    let fence = "";
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (fence) {
        if (line.startsWith(fence)) fence = "";
        continue;
      }
      const open = line.match(/^(`{3,}|~{3,})/);
      if (open) {
        fence = open[1][0].repeat(open[1].length);
        continue;
      }
      const atx = line.match(/^(#{1,6})\s+(.+?)\s*$/);
      if (atx) heads.push({ line: i, text: atx[2].replace(/\s+#+\s*$/, "").trim() });
    }
    return heads;
  }

  function headingKey(text) {
    return String(text || "").replace(/[`*_~]/g, "").replace(/\s+/g, " ").trim();
  }

  function textareaLineMetrics(textarea) {
    const cs = getComputedStyle(textarea);
    const lh = parseFloat(cs.lineHeight);
    const lineHeight = Number.isFinite(lh) && lh > 0 ? lh : (parseFloat(cs.fontSize) || 14) * 1.65;
    const pad = parseFloat(cs.paddingTop) || 0;
    return { lineHeight, pad };
  }

  function jumpTextareaToLine(textarea, lineIndex, viewportOffset) {
    if (!textarea || lineIndex == null || lineIndex < 0) return;
    const value = textarea.value;
    const lines = value.split("\n");
    let pos = 0;
    for (let i = 0; i < lineIndex && i < lines.length; i++) pos += lines[i].length + 1;
    const end = pos + (lines[lineIndex]?.length ?? 0);
    const { lineHeight, pad } = textareaLineMetrics(textarea);
    const offset = typeof viewportOffset === "number"
      ? viewportOffset
      : textarea.clientHeight * 0.28;
    textarea.focus({ preventScroll: true });
    textarea.setSelectionRange(pos, end);
    textarea.scrollTop = Math.max(0, pad + lineIndex * lineHeight - offset);
  }

  function scrollTextareaToRatio(textarea, ratio) {
    if (!textarea || typeof ratio !== "number") return;
    const max = Math.max(0, textarea.scrollHeight - textarea.clientHeight);
    textarea.focus({ preventScroll: true });
    textarea.scrollTop = Math.max(0, Math.min(max, max * ratio));
  }

  function scrollSourceToHeading(index, title) {
    const { text } = sourceEls();
    if (!text) return;
    const heads = markdownHeadings(text.value);
    const want = headingKey(title);
    let hit = index >= 0 ? heads[index] : null;
    if (want) {
      const named = heads.find((h) => headingKey(h.text) === want);
      if (named) hit = named;
    }
    if (!hit) return;
    jumpTextareaToLine(text, hit.line);
  }

  function mdBlockPlainText(text) {
    return String(text || "")
      .split("\n")
      .map((line) => line
        .replace(/^ {0,3}#{1,6}\s+/, "")
        .replace(/^ {0,3}([-*+]|\d+[.)])\s+(\[[ xX]\]\s+)?/, "")
        .replace(/^ {0,3}>\s?/, "")
        .replace(/[`*_~]/g, "")
        .trim())
      .filter(Boolean)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function estimateLineFromRatio(md, ratio) {
    const lines = String(md || "").split("\n");
    if (!lines.length) return 0;
    return Math.round((ratio || 0) * Math.max(0, lines.length - 1));
  }

  function findMdBlockNearIndex(blocks, key, hintIdx) {
    if (!blocks.length || !key) return null;
    const needle = key.slice(0, 48);
    const order = [];
    for (let d = 0; d < blocks.length; d += 1) {
      if (hintIdx - d >= 0) order.push(hintIdx - d);
      if (d > 0 && hintIdx + d < blocks.length) order.push(hintIdx + d);
    }
    for (const i of order) {
      const plain = mdBlockPlainText(blocks[i].text);
      if (plain === key) return blocks[i];
      if (plain && (plain.includes(needle) || key.includes(plain.slice(0, 48)))) return blocks[i];
    }
    return null;
  }

  function findSourceLineByText(md, anchorText, hintLine = 0) {
    const key = String(anchorText || "").trim();
    if (!key) return null;
    const lines = String(md || "").split("\n");
    const needle = key.slice(0, 48);
    const order = [];
    for (let d = 0; d < lines.length; d += 1) {
      if (hintLine - d >= 0) order.push(hintLine - d);
      if (d > 0 && hintLine + d < lines.length) order.push(hintLine + d);
    }
    for (const i of order) {
      const plain = mdBlockPlainText(lines[i]);
      if (plain === key) return i;
    }
    for (const i of order) {
      const plain = mdBlockPlainText(lines[i]);
      if (plain && (plain.includes(needle) || key.includes(plain.slice(0, 48)))) return i;
    }
    return null;
  }

  function captureSourceReadingSpot() {
    const { text } = sourceEls();
    if (!text) return null;
    const max = Math.max(0, text.scrollHeight - text.clientHeight);
    const ratio = readingScrollRatio(text);
    const viewOffset = text.clientHeight * 0.08;
    const { lineHeight, pad } = textareaLineMetrics(text);
    const lineIdx = Math.max(0, Math.floor((text.scrollTop - pad + viewOffset) / lineHeight));
    const md = text.value;
    const blocks = splitMdBlocks(md);
    let anchorText = "";
    let index;
    for (let i = 0; i < blocks.length; i += 1) {
      if (lineIdx >= blocks[i].start && lineIdx < blocks[i].end) {
        anchorText = mdBlockPlainText(blocks[i].text);
        index = i;
        break;
      }
    }
    if (!anchorText) {
      const lines = md.split("\n");
      anchorText = mdBlockPlainText(lines[lineIdx] || "");
    }
    return {
      text: anchorText,
      index,
      probeOffset: viewOffset,
      offset: viewOffset,
      scrollerHeight: text.clientHeight,
      ratio,
      scrollTop: text.scrollTop,
      scrollHeight: text.scrollHeight,
    };
  }

  function scaledReadingProbeOffset(spot, viewportHeight) {
    const fallback = viewportHeight * 0.08;
    if (!spot) return fallback;
    const raw = typeof spot.probeOffset === "number"
      ? spot.probeOffset
      : (typeof spot.offset === "number" ? spot.offset : fallback);
    if (raw < 0 || raw > viewportHeight * 0.45) return fallback;
    const fromHeight = spot.scrollerHeight || viewportHeight;
    return fromHeight > 0 ? raw * (viewportHeight / fromHeight) : fallback;
  }

  function readingScrollRatio(scroller) {
    if (!scroller) return 0;
    const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    if (max <= 0) return 0;
    return scroller.scrollTop / max;
  }

  function scrollTopFromSpot(spot, scroller) {
    if (!spot || !scroller) return null;
    const max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    const ratio = typeof spot.ratio === "number" ? spot.ratio : 0;
    if (max <= 0) return ratio > 0.005 ? null : 0;
    if (ratio >= 0 && ratio <= 1) {
      return Math.max(0, Math.min(max, max * ratio));
    }
    if (typeof spot.scrollTop === "number" && spot.scrollHeight > 0) {
      const scale = scroller.scrollHeight / spot.scrollHeight;
      return Math.max(0, Math.min(max, spot.scrollTop * scale));
    }
    return 0;
  }

  function keepPreviewFromSourceSpot(spot) {
    if (!spot) return;
    const apply = () => {
      const scroller = readingScroller(true);
      if (!scroller) return false;
      const top = scrollTopFromSpot(spot, scroller);
      if (top == null) return false;
      scroller.scrollTop = top;
      return true;
    };
    apply();
    requestAnimationFrame(() => {
      apply();
      requestAnimationFrame(apply);
    });
    [0, 50, 120, 240, 480, 720].forEach((ms) => window.setTimeout(apply, ms));
  }

  function scrollSourceToSpot(spot) {
    const { text } = sourceEls();
    if (!text || !spot) return;
    const max = Math.max(0, text.scrollHeight - text.clientHeight);
    const ratioScroll = max * (spot.ratio || 0);
    const probeOffset = scaledReadingProbeOffset(spot, text.clientHeight);
    const md = text.value;
    const line = estimateLineFromRatio(md, spot.ratio);
    const { lineHeight, pad } = textareaLineMetrics(text);
    const lineScroll = Math.max(0, pad + line * lineHeight - probeOffset);
    let target = Math.abs(lineScroll - ratioScroll) <= text.clientHeight * 0.18
      ? lineScroll
      : ratioScroll;
    const drift = (spot.ratio || 0) * text.clientHeight * 0.028;
    target = Math.max(0, target - drift);
    text.focus({ preventScroll: true });
    text.scrollTop = Math.max(0, Math.min(max, target));
    const lines = md.split("\n");
    let pos = 0;
    for (let i = 0; i < line && i < lines.length; i += 1) pos += lines[i].length + 1;
    const end = pos + (lines[line]?.length ?? 0);
    try { text.setSelectionRange(pos, end); } catch (_) { /* ignore */ }
  }

  function keepSourceReadingSpot(spot) {
    if (!spot) {
      const { text } = sourceEls();
      requestAnimationFrame(() => {
        try { text?.focus({ preventScroll: true }); } catch (_) { /* ignore */ }
      });
      return;
    }
    const run = () => scrollSourceToSpot(spot);
    requestAnimationFrame(() => {
      run();
      window.setTimeout(run, 120);
    });
  }

  let sourceCtx = null;
  let sourceOpen = false;
  let sourceInputTimer = 0;

  function sourceIsEditable() {
    return !document.body.classList.contains("is-readonly");
  }

  function paintSourceEditability() {
    const { text, hint } = sourceEls();
    const editable = sourceIsEditable();
    if (text) {
      if (editable) text.removeAttribute("readonly");
      else text.setAttribute("readonly", "");
    }
    if (hint) hint.textContent = t(editable ? "sourceEditable" : "sourceReadonly");
  }

  function commitSourceFromTextarea() {
    if (!sourceOpen) return;
    const { text } = sourceEls();
    if (!text) return;
    try { sourceCtx?.applyMarkdown?.(text.value, { live: false }); } catch (_) { /* ignore */ }
  }

  function handleSourceInput() {
    if (!sourceOpen || !sourceIsEditable()) return;
    const { text } = sourceEls();
    if (!text) return;
    window.clearTimeout(sourceInputTimer);
    sourceInputTimer = window.setTimeout(() => {
      if (!sourceOpen) return;
      try {
        sourceCtx?.applyMarkdown?.(text.value, { live: true });
        sourceCtx?.notifyInput?.();
      } catch (_) { /* ignore */ }
    }, 220);
  }

  function sourceEls() {
    return {
      wrap: document.getElementById("sourceViewPrefs"),
      btn: document.getElementById("sourceViewBtn"),
      panel: document.getElementById("molanSourceView"),
      text: document.getElementById("molanSourceText"),
      title: document.getElementById("molanSourceTitle"),
      hint: document.getElementById("molanSourceHint"),
      close: document.getElementById("molanSourceClose"),
    };
  }

  function applySourceViewI18n() {
    const { btn, title, close, panel } = sourceEls();
    const label = t("viewSource");
    if (btn) {
      btn.title = label;
      btn.setAttribute("aria-label", label);
    }
    if (title) title.textContent = t("sourceTitle");
    if (close) {
      close.title = t("sourceClose");
      close.setAttribute("aria-label", t("sourceClose"));
    }
    if (panel) panel.setAttribute("aria-label", t("sourceTitle"));
    paintSourceEditability();
  }

  function paintSourceBtn(open) {
    const { btn } = sourceEls();
    btn?.classList.toggle("is-on", !!open);
    btn?.setAttribute("aria-pressed", open ? "true" : "false");
  }

  function fillSourceText() {
    const { text } = sourceEls();
    if (!text) return;
    const md = sourceCtx?.getMarkdown?.() ?? "";
    if (text.value !== md) text.value = md;
    paintSourceEditability();
  }

  function ensureSourcePanel() {
    const editorWrap = document.getElementById("editorWrap") || document.querySelector(".editor-wrap");
    if (!editorWrap) return null;
    let panel = document.getElementById("molanSourceView");
    if (!panel) {
      panel = document.createElement("div");
      panel.id = "molanSourceView";
      panel.className = "molan-source-view";
      panel.hidden = true;
      panel.setAttribute("role", "region");
      panel.innerHTML = `
        <div class="molan-source-view__bar">
          <span class="molan-source-view__title" id="molanSourceTitle"></span>
          <span class="molan-source-view__hint" id="molanSourceHint"></span>
          <button type="button" class="icon-btn" id="molanSourceClose">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </div>
        <textarea id="molanSourceText" spellcheck="false" autocomplete="off"></textarea>
      `;
      editorWrap.appendChild(panel);
      panel.querySelector("#molanSourceClose")?.addEventListener("click", () => closeSourceView());
    }
    const sourceText = panel.querySelector("#molanSourceText");
    if (sourceText && !sourceText.dataset.bound) {
      sourceText.dataset.bound = "1";
      sourceText.addEventListener("input", handleSourceInput);
    }
    return panel;
  }

  function openSourceView() {
    closeFind();
    hideFormatBar();
    hideTableToolbar(document.getElementById("molanTableToolbar"));
    const panel = ensureSourcePanel();
    const editorWrap = document.getElementById("editorWrap") || document.querySelector(".editor-wrap");
    if (!panel) return;
    const previewing = sourceCtx?.getPreviewing?.() ?? false;
    const spot = captureReadingSpot(previewing);
    fillSourceText();
    applySourceViewI18n();
    panel.hidden = false;
    sourceOpen = true;
    editorWrap?.classList.add("is-source-open");
    paintSourceBtn(true);
    keepSourceReadingSpot(spot);
    syncHistoryChrome();
  }

  function closeSourceView(opts = {}) {
    const restorePreview = opts.restorePreview !== false;
    const previewing = sourceCtx?.getPreviewing?.() ?? false;
    let spot = null;
    if (sourceOpen) commitSourceFromTextarea();
    if (sourceOpen && previewing && restorePreview) {
      spot = captureSourceReadingSpot();
    }
    const { panel } = sourceEls();
    const editorWrap = document.getElementById("editorWrap") || document.querySelector(".editor-wrap");
    sourceOpen = false;
    window.clearTimeout(sourceInputTimer);
    if (panel) panel.hidden = true;
    editorWrap?.classList.remove("is-source-open");
    paintSourceBtn(false);
    if (spot) keepPreviewFromSourceSpot(spot);
    syncHistoryChrome();
  }

  function toggleSourceView() {
    if (sourceOpen) closeSourceView();
    else openSourceView();
  }

  /* --- outline: 大纲与顶栏 --- */
  const OUTLINE_ICON = '<svg class="icon-outline" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 6h16M8 12h12M8 18h10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="4" cy="12" r="1.15" fill="currentColor"/><circle cx="4" cy="18" r="1.15" fill="currentColor"/></svg>';
  const OUTLINE_CLOSE_ICON = '<svg class="icon-outline-close" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M7 7l10 10M17 7 7 17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  let outlineAnimToken = 0;
  let outlineCtx = null;

  function innerVditor(vditor) {
    return vditor?.vditor || vditor || null;
  }

  function vditorOutlineEl() {
    return document.querySelector(".vditor-outline");
  }

  function outlineIsOpen() {
    const el = vditorOutlineEl();
    if (!el) return false;
    return el.style.display === "block" && !el.classList.contains("is-out");
  }

  const UNDO_ICON = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 8H4V4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.4 13A8 8 0 1 0 6 6.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';
  const REDO_ICON = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M16 8h4V4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/><path d="M19.6 13A8 8 0 1 1 18 6.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>';

  function applyEditorChromeI18n() {
    applySourceViewI18n();
    const outlineBtn = document.getElementById("outlineBtn");
    if (outlineBtn) {
      const label = t(outlineBtn.classList.contains("is-on") ? "outlineCloseAria" : "outlineAria");
      outlineBtn.title = label;
      outlineBtn.setAttribute("aria-label", label);
    }
    const undoBtn = document.getElementById("undoBtn");
    if (undoBtn) {
      const label = t("undo");
      undoBtn.title = label;
      undoBtn.setAttribute("aria-label", label);
    }
    const redoBtn = document.getElementById("redoBtn");
    if (redoBtn) {
      const label = t("redo");
      redoBtn.title = label;
      redoBtn.setAttribute("aria-label", label);
    }
  }

  function nativeHistoryEnabled(type) {
    const root = outlineCtx?.getVditorRoot?.();
    const native = root?.querySelector(`.vditor-toolbar [data-type="${type}"]`);
    if (!native) return false;
    return !native.classList.contains("vditor-menu--disabled");
  }

  function syncHistoryChrome() {
    const undoBtn = document.getElementById("undoBtn");
    const redoBtn = document.getElementById("redoBtn");
    if (!undoBtn && !redoBtn) return;
    const previewing = outlineCtx?.getPreviewing?.() ?? true;
    const vditor = outlineCtx?.getVditor?.();
    const docUndo = !!outlineCtx?.canUndoDoc?.();
    const docRedo = !!outlineCtx?.canRedoDoc?.();
    const editUndo = !previewing && !sourceOpen && !!vditor && nativeHistoryEnabled("undo");
    const editRedo = !previewing && !sourceOpen && !!vditor && nativeHistoryEnabled("redo");
    if (undoBtn) undoBtn.disabled = !(docUndo || editUndo);
    if (redoBtn) redoBtn.disabled = !(docRedo || editRedo);
  }

  function runHistory(type) {
    const previewing = outlineCtx?.getPreviewing?.() ?? true;
    const vditor = outlineCtx?.getVditor?.();
    if (previewing || sourceOpen || !vditor) {
      if (type === "undo") outlineCtx?.undoDoc?.();
      else outlineCtx?.redoDoc?.();
      return;
    }
    if (nativeHistoryEnabled(type)) {
      const root = outlineCtx?.getVditorRoot?.();
      const native = root?.querySelector(`.vditor-toolbar [data-type="${type}"]`);
      native?.click();
      window.setTimeout(syncHistoryChrome, 80);
      return;
    }
    if (type === "undo") outlineCtx?.undoDoc?.();
    else outlineCtx?.redoDoc?.();
  }

  const OUTLINE_BTN_HTML = `<button type="button" class="icon-btn" id="outlineBtn" aria-haspopup="true" aria-expanded="false">${OUTLINE_ICON}${OUTLINE_CLOSE_ICON}</button>`;

  function mountOutlinePrefs(outlineWrap) {
    outlineWrap.className = "molan-outline-prefs";
    outlineWrap.removeAttribute("style");
    const btn = outlineWrap.querySelector("#outlineBtn");
    if (btn) {
      btn.className = "icon-btn";
      btn.removeAttribute("style");
    }
    const header = document.querySelector(".reader-header");
    const title = header?.querySelector(".reader-title");
    const actions = document.querySelector(".reader-actions");
    // 跟标题同一行，不要浮在纸面上：否则会和行首「+」重叠。
    if (header) {
      header.insertBefore(outlineWrap, title || actions || null);
      return;
    }
    if (actions) actions.insertBefore(outlineWrap, actions.firstChild);
  }

  function ensureOutlinePanel() {
    let panel = vditorOutlineEl();
    if (panel) return panel;
    const wrap = document.getElementById("editorWrap") || document.querySelector(".editor-wrap");
    if (!wrap) return null;
    panel = document.createElement("div");
    panel.className = "vditor-outline";
    panel.style.display = "none";
    panel.innerHTML = '<div class="vditor-outline__title">大纲</div><ul></ul>';
    wrap.insertBefore(panel, wrap.firstChild);
    return panel;
  }

  function escapeOutlineText(text) {
    return String(text || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /** 预览态用 lite DOM 抽标题，避免 hydrate 拉满血 IR 编辑器 */
  function renderLiteOutline() {
    const panel = ensureOutlinePanel();
    if (!panel) return panel;
    const preview =
      document.getElementById("molanPreviewBody") ||
      document.querySelector(".molan-preview");
    const heads = preview
      ? [...preview.querySelectorAll("h1, h2, h3, h4, h5, h6")]
      : [];
    let ul = panel.querySelector(":scope > ul");
    if (!ul) {
      ul = document.createElement("ul");
      panel.appendChild(ul);
    }
    if (!panel.querySelector(".vditor-outline__title")) {
      const title = document.createElement("div");
      title.className = "vditor-outline__title";
      title.textContent = "大纲";
      panel.insertBefore(title, ul);
    }
    ul.innerHTML = heads
      .map((h, i) => {
        const level = Number(h.tagName.slice(1)) || 1;
        return `<li data-level="${level}"><span data-target-id="lite-${i}">${escapeOutlineText(h.textContent)}</span></li>`;
      })
      .join("");
    return panel;
  }

  let outlineRefreshTimer = 0;

  function scheduleOutlineRefresh() {
    if (!outlineIsOpen()) return;
    clearTimeout(outlineRefreshTimer);
    outlineRefreshTimer = window.setTimeout(() => {
      refreshOutline();
    }, 200);
  }

  async function refreshOutline() {
    if (!outlineIsOpen()) return;
    if (outlineCtx?.getPreviewing?.()) {
      renderLiteOutline();
      relocateVditorOutline();
      return;
    }
    const inner = innerVditor(outlineCtx?.getVditor?.());
    relocateVditorOutline();
    try { inner?.outline?.render?.(inner); } catch (_) { /* ignore */ }
  }

  function setOutlineFab(open) {
    const btn = document.getElementById("outlineBtn");
    const dock = document.getElementById("outlinePrefs");
    dock?.classList.toggle("is-open", !!open);
    btn?.classList.toggle("is-on", !!open);
    btn?.setAttribute("aria-expanded", open ? "true" : "false");
    applyEditorChromeI18n();
  }

  function relocateVditorOutline() {
    const wrap = document.getElementById("editorWrap") || document.querySelector(".editor-wrap");
    const panel = vditorOutlineEl();
    if (!wrap || !panel) return panel;
    if (panel.parentElement !== wrap) wrap.insertBefore(panel, wrap.firstChild);
    wrap.classList.toggle("is-outline-open", outlineIsOpen());
    return panel;
  }

  function setVditorOutline(show) {
    const inner = innerVditor(outlineCtx?.getVditor?.());
    let panel = inner?.outline?.element || vditorOutlineEl();
    if (!panel && show && outlineCtx?.getPreviewing?.()) {
      panel = renderLiteOutline();
    }
    if (!panel) return;
    relocateVditorOutline();
    const wrap = document.getElementById("editorWrap") || document.querySelector(".editor-wrap");
    panel.classList.remove("is-in", "is-out");
    if (show) {
      panel.style.display = "block";
      wrap?.classList.add("is-outline-open");
      if (!outlineCtx?.getPreviewing?.()) {
        try { inner?.outline?.render?.(inner); } catch (_) { /* ignore */ }
        inner?.toolbar?.elements?.outline?.firstElementChild?.classList.add("vditor-menu--current");
      }
    } else {
      panel.style.display = "none";
      wrap?.classList.remove("is-outline-open");
      inner?.toolbar?.elements?.outline?.firstElementChild?.classList.remove("vditor-menu--current");
    }
    setOutlineFab(show);
  }

  function closeOutline(instant) {
    const panel = vditorOutlineEl();
    if (!outlineIsOpen()) {
      setOutlineFab(false);
      return;
    }
    const finish = () => {
      setVditorOutline(false);
    };
    if (instant || prefersReducedMotion() || !panel) {
      outlineAnimToken += 1;
      finish();
      return;
    }
    const token = ++outlineAnimToken;
    panel.classList.remove("is-in");
    panel.classList.add("is-out");
    setOutlineFab(false);
    const done = () => {
      if (token !== outlineAnimToken) return;
      finish();
    };
    panel.addEventListener("animationend", (e) => {
      if (e.target === panel) done();
    }, { once: true });
    window.setTimeout(done, 400);
  }

  async function openOutline() {
    if (outlineCtx?.getPreviewing?.()) {
      renderLiteOutline();
    } else {
      await outlineCtx?.hydrateVditor?.();
    }
    relocateVditorOutline();
    outlineAnimToken += 1;
    const wrap = document.getElementById("editorWrap") || document.querySelector(".editor-wrap");
    const wasOpen = wrap?.classList.contains("is-outline-open");
    const closing = vditorOutlineEl()?.classList.contains("is-out");
    setVditorOutline(true);
    const shown = vditorOutlineEl();
    if (shown && !wasOpen && !closing) {
      shown.classList.remove("is-in");
      void shown.offsetWidth;
      shown.classList.add("is-in");
    } else if (shown) {
      shown.classList.add("is-in");
    }
  }

  function ensureEditorChrome(ctx) {
    const actions = document.querySelector(".reader-actions");
    const editorWrap = document.getElementById("editorWrap") || document.querySelector(".editor-wrap");
    const modeBtn = document.getElementById("modeBtn");
    const anchor = actions && modeBtn && modeBtn.parentElement === actions
      ? modeBtn.nextSibling
      : (document.getElementById("typePrefs") || document.getElementById("headerPrefs") || null);

    document.getElementById("editModePrefs")?.remove();

    if (actions) {
      let historyWrap = document.getElementById("historyPrefs");
      if (!historyWrap) {
        historyWrap = document.createElement("div");
        historyWrap.id = "historyPrefs";
        historyWrap.className = "molan-chrome-prefs";
        historyWrap.innerHTML = `
          <button type="button" class="icon-btn" id="undoBtn" disabled>${UNDO_ICON}</button>
          <button type="button" class="icon-btn" id="redoBtn" disabled>${REDO_ICON}</button>
        `;
      }
      const findBtn = document.getElementById("molanFindBtn");
      const copyBtn = document.getElementById("copyBtn");
      if (historyWrap.parentElement !== actions) {
        if (findBtn && findBtn.parentElement === actions) findBtn.after(historyWrap);
        else if (copyBtn && copyBtn.parentElement === actions) actions.insertBefore(historyWrap, copyBtn);
        else actions.insertBefore(historyWrap, actions.firstChild);
      }

      let sourceWrap = document.getElementById("sourceViewPrefs");
      if (!sourceWrap) {
        sourceWrap = document.createElement("div");
        sourceWrap.id = "sourceViewPrefs";
        sourceWrap.className = "molan-chrome-prefs";
        sourceWrap.innerHTML = `
          <button type="button" class="icon-btn" id="sourceViewBtn" aria-pressed="false">${SOURCE_ICON}</button>
        `;
      }
      const afterCopy = copyBtn && copyBtn.parentElement === actions ? copyBtn.nextSibling : null;
      if (sourceWrap.parentElement !== actions) {
        if (afterCopy) actions.insertBefore(sourceWrap, afterCopy);
        else if (anchor) actions.insertBefore(sourceWrap, anchor);
        else actions.appendChild(sourceWrap);
      }
    }

    {
      let outlineWrap = document.getElementById("outlinePrefs");
      if (!outlineWrap) {
        outlineWrap = document.createElement("div");
        outlineWrap.id = "outlinePrefs";
        outlineWrap.innerHTML = OUTLINE_BTN_HTML;
      } else if (!outlineWrap.querySelector("#outlineBtn") || !outlineWrap.querySelector(".icon-outline-close")) {
        outlineWrap.innerHTML = OUTLINE_BTN_HTML;
      }
      outlineWrap.querySelector("#outlineMenu")?.remove();
      mountOutlinePrefs(outlineWrap);
    }

    outlineCtx = ctx;
    sourceCtx = ctx;
    ensureSourcePanel();
    const sourceBtn = document.getElementById("sourceViewBtn");
    const outlineBtn = document.getElementById("outlineBtn");
    applyEditorChromeI18n();
    syncHistoryChrome();
    if (sourceOpen) fillSourceText();

    const undoBtn = document.getElementById("undoBtn");
    const redoBtn = document.getElementById("redoBtn");
    if (undoBtn && !undoBtn.dataset.bound) {
      undoBtn.dataset.bound = "1";
      undoBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        runHistory("undo");
      });
    }
    if (redoBtn && !redoBtn.dataset.bound) {
      redoBtn.dataset.bound = "1";
      redoBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        runHistory("redo");
      });
    }

    if (sourceBtn && !sourceBtn.dataset.bound) {
      sourceBtn.dataset.bound = "1";
      sourceBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleSourceView();
      });
    }

    if (outlineBtn && !outlineBtn.dataset.bound) {
      outlineBtn.dataset.bound = "1";
      outlineBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const panel = vditorOutlineEl();
        if (panel?.classList.contains("is-out")) closeOutline(true);
        if (outlineIsOpen()) closeOutline();
        else openOutline();
      });
    }

    if (editorWrap && !editorWrap.dataset.previewJump) {
      editorWrap.dataset.previewJump = "1";
      editorWrap.addEventListener("click", (e) => {
        const span = e.target.closest(".vditor-outline [data-target-id]");
        if (!span) return;
        const items = [...(span.closest(".vditor-outline")?.querySelectorAll("[data-target-id]") || [])];
        const index = items.indexOf(span);
        if (sourceOpen) {
          e.preventDefault();
          e.stopPropagation();
          scrollSourceToHeading(index, span.textContent);
          return;
        }
        if (!outlineCtx?.getPreviewing?.()) return;
        e.preventDefault();
        e.stopPropagation();
        scrollToHeading(index);
      }, true);
    }

    if (!ensureEditorChrome._bound) {
      ensureEditorChrome._bound = true;
      document.addEventListener("keydown", (e) => {
        if (e.key !== "Escape") return;
        if (sourceOpen) {
          e.preventDefault();
          closeSourceView();
          return;
        }
        closeOutline();
      });
      document.addEventListener("keydown", (e) => {
        if (!(e.metaKey || e.ctrlKey) || e.altKey) return;
        if (String(e.key).toLowerCase() !== "z") return;
        if (e.target?.closest?.("input, textarea")) return;
        if (!outlineCtx?.getPreviewing?.() && !sourceOpen) return;
        const wantRedo = !!e.shiftKey;
        if (wantRedo ? !outlineCtx?.canRedoDoc?.() : !outlineCtx?.canUndoDoc?.()) return;
        e.preventDefault();
        runHistory(wantRedo ? "redo" : "undo");
      });
      // Cmd/Ctrl+E：点顶栏阅读/编辑按钮；VS Code / Cursor 由扩展命令注入，避免双次切换
      document.addEventListener("keydown", (e) => {
        if (e.shiftKey || e.altKey) return;
        if (String(e.key || "").toLowerCase() !== "e") return;
        if (!(e.metaKey || e.ctrlKey)) return;
        if (document.documentElement.classList.contains("molan-host-vscode")
          || document.body.classList.contains("molan-host-vscode")) {
          return;
        }
        if (typeof isPrimaryModKey === "function" && !isPrimaryModKey(e, "e")) return;
        if (e.target?.closest?.("input, textarea, select")) return;
        const blocked = e.target?.closest?.(
          ".molan-find-bar, .molan-image-url-mask, .molan-feedback, .molan-mermaid-editor, .lightbox",
        );
        if (blocked) return;
        const modeBtn = document.getElementById("modeBtn");
        if (!modeBtn || modeBtn.hidden || modeBtn.disabled) return;
        e.preventDefault();
        e.stopPropagation();
        modeBtn.click();
      }, true);
    }
  }

  /* --- format-bar: 选区格式条与插入表格拾取 --- */
  let formatHotkeys = {
    bold() { return false; },
    italic() { return false; },
    link() { return false; },
  };

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

    const captureForFormat = () => {
      if (isPreviewing?.() && previewFormat) {
        const focus = previewFocusFromSelection();
        if (!focus) return false;
        savedRange = focus.range;
        savedText = focus.text;
        return true;
      }
      return captureRange();
    };

    const applyFormatAction = (type) => {
      if (type === "link") {
        if (!captureForFormat()) return false;
        openLink();
        return true;
      }
      if (isPreviewing?.() && previewFormat) {
        if (!captureForFormat()) return false;
        const ok = applyPreviewFormat(type);
        hideFormatBar();
        return ok;
      }
      if (isPreviewing?.()) return false;
      if (!captureRange() && !(savedRange && savedText)) return false;
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
      return true;
    };

    formatHotkeys = {
      bold: () => applyFormatAction("bold"),
      italic: () => applyFormatAction("italic"),
      link: () => applyFormatAction("link"),
    };

    bar.addEventListener("pointerdown", (e) => {
      if (e.target.closest("input")) return;
      e.preventDefault();
    });
    bar.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-format]");
      if (!btn) return;
      applyFormatAction(btn.getAttribute("data-format"));
    });
    bar.querySelector(".molan-format-bar__link")?.addEventListener("submit", (e) => {
      e.preventDefault();
      const input = bar.querySelector(".molan-format-bar__link input");
      applyLink(input?.value || "");
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !bar.hidden) {
        if (linkOpen) {
          e.preventDefault();
          closeLink();
          if (savedRange) positionBar(savedRange);
          return;
        }
        hideFormatBar();
        return;
      }
      if (e.shiftKey || e.altKey) return;
      const key = String(e.key || "").toLowerCase();
      if (key !== "b" && key !== "i" && key !== "k") return;
      if (!(e.metaKey || e.ctrlKey)) return;
      // VS Code / Cursor：快捷键由扩展命令注入，避免和 webview 监听叠成双次切换
      if (document.documentElement.classList.contains("molan-host-vscode")
        || document.body.classList.contains("molan-host-vscode")) {
        return;
      }
      if (typeof isPrimaryModKey === "function" && !isPrimaryModKey(e, key)) return;
      const blocked = e.target?.closest?.(
        ".molan-find-bar, .molan-format-bar__link, .molan-image-url-mask, .molan-source-view, .molan-feedback, .molan-mermaid-editor, .lightbox",
      );
      if (blocked) return;
      if (e.target?.closest?.("input, textarea, select")) return;
      const ran = key === "b"
        ? applyFormatAction("bold")
        : key === "i"
          ? applyFormatAction("italic")
          : applyFormatAction("link");
      if (!ran) return;
      e.preventDefault();
      e.stopPropagation();
    }, true);
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

  /* --- mermaid-bind: 流程图交互绑定与 i18n 刷新 --- */
  function watchMermaidPreviews(rootId = "vditor") {
    const root = typeof rootId === "string" ? document.getElementById(rootId) : rootId;
    if (!root) return;
    enhanceMermaidPreviews(root);
    if (diagramObserver) return;
    let raf = 0;
    diagramObserver = new MutationObserver((mutations) => {
      let added = false;
      for (const m of mutations) {
        if (!m.addedNodes.length) continue;
        added = true;
        m.addedNodes.forEach((node) => {
          if (node.nodeType !== 1) return;
          if (node.matches?.(".language-mermaid")) captureMermaidSource(node);
          node.querySelectorAll?.(".language-mermaid")?.forEach(captureMermaidSource);
        });
      }
      if (!added) return;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        clearTimeout(watchMermaidPreviews._t);
        watchMermaidPreviews._t = setTimeout(() => {
          const ir = root.querySelector?.(".vditor-ir") || null;
          const needsPaint = ir && mermaidDisplayHosts(ir).some(mermaidHostNeedsPaint);
          if (needsPaint) refreshMermaidDiagrams(ir);
          else enhanceMermaidPreviews(root);
          scheduleFitTables(root);
        }, 120);
      });
    });
    diagramObserver.observe(root, { childList: true, subtree: true });
  }

  function bindMermaidInteractions(vditorRoot, getVditor, lightbox, ctx = {}) {
    lightbox.setOnEdit?.((shell) => {
      if (!shell) {
        toast(t("noMermaidSource"));
        return;
      }
      openMermaidEditorFromShell(shell, ctx, lightbox, vditorRoot, getVditor);
    });
    watchMermaidIrExpand(vditorRoot, ctx, lightbox, getVditor);

    const blockMermaidIrExpand = (e) => {
      if (e.target.closest("[data-molan-action]")) return;
      if (document.getElementById("molanMermaidEditor")) return;
      const node = e.target.closest('.vditor-ir__node[data-type="code-block"]');
      if (!node?.querySelector(".language-mermaid")) return;
      if (e.type === "mousedown" || e.type === "pointerdown") {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    };
    vditorRoot.addEventListener("mousedown", blockMermaidIrExpand, true);
    vditorRoot.addEventListener("pointerdown", blockMermaidIrExpand, true);

    const blockMermaidPreviewExpand = (e) => {
      if (e.target.closest("[data-molan-action]")) return;
      if (document.getElementById("molanMermaidEditor")) return;
      const shell = findMermaidPreviewShell(e.target);
      if (!shell) return;
      if (shell.closest(".vditor-ir__node--expand")) return;
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "click" || e.type === "pointerup") {
        if (ctx.getPreviewing?.()) {
          lightbox.openFromSvg(shell.querySelector("svg"));
          return;
        }
        openMermaidEditorFromShell(shell, ctx, lightbox, vditorRoot, getVditor);
      }
    };
    vditorRoot.addEventListener("mousedown", blockMermaidPreviewExpand, true);
    vditorRoot.addEventListener("pointerdown", blockMermaidPreviewExpand, true);
    vditorRoot.addEventListener("click", blockMermaidPreviewExpand, true);

    vditorRoot.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-molan-action]");
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const action = btn.getAttribute("data-molan-action");
      const shell = btn.closest(".vditor-ir__preview, pre, .language-mermaid");
      const svg = shell?.querySelector("svg");
      if (action === "edit") {
        openMermaidEditorFromShell(shell, ctx, lightbox, vditorRoot, getVditor);
        return;
      }
      if (action === "zoom") {
        lightbox.openFromSvg(svg);
        return;
      }
      if (action === "copy-image") {
        await copySvgAsPng(svg);
        return;
      }
      if (action === "copy-code") {
        const text = mermaidCopySource(shell, getVditor);
        if (!text) {
          toast(t("noMermaidSource"));
          return;
        }
        try {
          await copyTextToClipboard(text);
          toast(t("copiedMermaidCode"));
        } catch (err) {
          console.warn(err);
          toast(t("copyFail"));
        }
      }
    }, true);
  }

  function refreshI18n(root = document) {
    const actionKeys = {
      edit: "editSource",
      zoom: "viewDiagram",
      "copy-code": "copyCode",
      "copy-image": "copyImage",
    };
    root.querySelectorAll("[data-molan-action]").forEach((btn) => {
      const key = actionKeys[btn.getAttribute("data-molan-action")];
      if (!key) return;
      const label = t(key);
      btn.title = label;
      btn.setAttribute("aria-label", label);
    });
    const lightboxEdit = document.getElementById("lightboxEdit");
    if (lightboxEdit) {
      const label = t("mermaidEditorTitle");
      lightboxEdit.title = label;
      lightboxEdit.setAttribute("aria-label", label);
    }
    applyFindI18n();
    applyTypeI18n();
    applyThemeI18n();
    applyFormatBarI18n();
    applyEditorChromeI18n();
    applyExportI18n();
    if (activeBlockInsert && typeof activeBlockInsert.refreshI18n === "function") {
      activeBlockInsert.refreshI18n();
    }
    refreshTableToolbarI18n(root);
    const picker = document.getElementById("molanTablePicker");
    if (picker) {
      picker.setAttribute("aria-label", t("insertTable"));
      const on = picker.querySelector(".molan-table-picker__cell.is-on:last-of-type");
      const cols = Number(on?.getAttribute("data-col") || 3);
      const rows = Number(on?.getAttribute("data-row") || 3);
      const label = picker.querySelector(".molan-table-picker__label");
      if (label) label.textContent = t("tableSize", { cols, rows });
    }
  }

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

  /* --- type: 排版（字号、行距、字体） --- */
  const TYPE_KEY = "molan-type";
  const TYPE_DEFAULTS = {
    size: 0.98,
    leading: 1.58,
    gap: 0.65,
    tracking: 0,
    font: "theme",
  };
  const TYPE_RANGES = {
    size: { min: 0.85, max: 1.5, step: 0.01 },
    leading: { min: 1.3, max: 2.2, step: 0.02 },
    gap: { min: 0.25, max: 1.4, step: 0.05 },
    tracking: { min: -0.03, max: 0.12, step: 0.005 },
  };
  const TYPE_FONTS = {
    theme: null,
    sans: {
      ui: '"PingFang SC", "Microsoft YaHei UI", "Microsoft YaHei", "Segoe UI", system-ui, sans-serif',
      display: '"PingFang SC", "Microsoft YaHei UI", "Microsoft YaHei", "Segoe UI", system-ui, sans-serif',
    },
    serif: {
      ui: '"Songti SC", "STSong", SimSun, Georgia, "Times New Roman", serif',
      display: '"Songti SC", "STSong", SimSun, Georgia, "Times New Roman", serif',
    },
    fang: {
      ui: '"STFangsong", FangSong, "FangSong_GB2312", "Songti SC", SimSun, serif',
      display: '"STFangsong", FangSong, "FangSong_GB2312", "Songti SC", SimSun, serif',
    },
    kai: {
      ui: '"Kaiti SC", "STKaiti", KaiTi, "KaiTi_GB2312", serif',
      display: '"Kaiti SC", "STKaiti", KaiTi, "KaiTi_GB2312", serif',
    },
    notoSans: {
      ui: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
      display: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
      google: "family=Noto+Sans+SC:wght@400;500;700",
    },
    notoSerif: {
      ui: '"Noto Serif SC", "Songti SC", SimSun, Georgia, serif',
      display: '"Noto Serif SC", "Songti SC", SimSun, Georgia, serif',
      google: "family=Noto+Serif+SC:wght@400;600;700",
    },
    xiaowei: {
      ui: '"ZCOOL XiaoWei", "Noto Serif SC", "Songti SC", SimSun, serif',
      display: '"ZCOOL XiaoWei", "Noto Serif SC", "Songti SC", SimSun, serif',
      google: "family=ZCOOL+XiaoWei&family=Noto+Serif+SC:wght@400;600",
    },
    mashan: {
      ui: '"Ma Shan Zheng", "Kaiti SC", KaiTi, serif',
      display: '"Ma Shan Zheng", "Kaiti SC", KaiTi, serif',
      google: "family=Ma+Shan+Zheng",
    },
    cormorant: {
      ui: '"Cormorant Garamond", "Songti SC", SimSun, Georgia, serif',
      display: '"Cormorant Garamond", "Songti SC", SimSun, Georgia, serif',
      google: "family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600",
    },
    plex: {
      ui: '"IBM Plex Sans", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
      display: '"IBM Plex Sans", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
      google: "family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400",
    },
    mono: {
      ui: '"JetBrains Mono", "Cascadia Code", "IBM Plex Mono", Menlo, Consolas, ui-monospace, monospace, "PingFang SC", "Microsoft YaHei"',
      display: '"JetBrains Mono", "Cascadia Code", "IBM Plex Mono", Menlo, Consolas, ui-monospace, monospace, "PingFang SC", "Microsoft YaHei"',
    },
  };
  const TYPE_FONT_ORDER = [
    "theme", "sans", "serif", "fang", "kai",
    "notoSans", "notoSerif", "xiaowei", "mashan",
    "cormorant", "plex", "mono",
  ];
  const TYPE_FONT_I18N = {
    theme: "typeFontTheme",
    sans: "typeFontSans",
    serif: "typeFontSerif",
    fang: "typeFontFang",
    kai: "typeFontKai",
    notoSans: "typeFontNotoSans",
    notoSerif: "typeFontNotoSerif",
    xiaowei: "typeFontXiaowei",
    mashan: "typeFontMashan",
    cormorant: "typeFontCormorant",
    plex: "typeFontPlex",
    mono: "typeFontMono",
  };
  const TYPE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.6 19L8.2 5.5h1.7L14.5 19"/><path d="M5.4 13.6h7.2"/><path d="M16.4 19l2.6-8h1.1L22.6 19"/><path d="M17.5 15.6h4.1"/></svg>';

  const typeState = {
    open: false,
    fontsOpen: false,
    animToken: 0,
    values: { ...TYPE_DEFAULTS },
  };

  function clampType(key, value) {
    const range = TYPE_RANGES[key];
    const n = Number(value);
    if (!range || !Number.isFinite(n)) return TYPE_DEFAULTS[key];
    const snapped = range.step ? Math.round(n / range.step) * range.step : n;
    return Math.min(range.max, Math.max(range.min, snapped));
  }

  function normalizeTypeFont(id) {
    return Object.prototype.hasOwnProperty.call(TYPE_FONTS, id) ? id : TYPE_DEFAULTS.font;
  }

  function readStoredType() {
    try {
      const raw = JSON.parse(localStorage.getItem(TYPE_KEY) || "null");
      if (!raw || typeof raw !== "object") return { ...TYPE_DEFAULTS };
      return {
        size: clampType("size", raw.size ?? TYPE_DEFAULTS.size),
        leading: clampType("leading", raw.leading ?? TYPE_DEFAULTS.leading),
        gap: clampType("gap", raw.gap ?? TYPE_DEFAULTS.gap),
        tracking: clampType("tracking", raw.tracking ?? TYPE_DEFAULTS.tracking),
        font: normalizeTypeFont(raw.font ?? TYPE_DEFAULTS.font),
      };
    } catch (_) {
      return { ...TYPE_DEFAULTS };
    }
  }

  function persistType() {
    try {
      localStorage.setItem(TYPE_KEY, JSON.stringify(typeState.values));
    } catch (_) { /* ignore */ }
  }

  let typeFontPreviewToken = 0;

  function loadReaderFont(id, onReady) {
    const preset = TYPE_FONTS[id];
    const done = (ok) => {
      if (typeof onReady === "function") onReady(ok);
    };
    if (!preset?.google) {
      done(false);
      return;
    }
    if (isVscodeHost()) {
      done(false);
      return;
    }
    const linkId = "molan-reader-font-" + id;
    const existing = document.getElementById(linkId);
    if (existing) {
      done(true);
      return;
    }
    if (!document.head) {
      done(false);
      return;
    }
    const link = document.createElement("link");
    link.id = linkId;
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?" + preset.google + "&display=swap";
    link.addEventListener("load", () => done(true), { once: true });
    link.addEventListener("error", () => done(false), { once: true });
    document.head.appendChild(link);
  }

  function applyTypeVars(values) {
    loadReaderFont(values.font);
    const root = document.documentElement.style;
    root.setProperty("--reader-size", `${values.size}rem`);
    root.setProperty("--reader-leading", String(values.leading));
    root.setProperty("--reader-gap", `${values.gap}em`);
    root.setProperty("--reader-tracking", `${values.tracking}em`);
    const preset = TYPE_FONTS[values.font];
    if (preset) {
      root.setProperty("--reader-font", preset.ui);
      root.setProperty("--reader-heading", preset.display);
    } else {
      root.removeProperty("--reader-font");
      root.removeProperty("--reader-heading");
    }
  }

  function applyStoredType() {
    typeState.values = readStoredType();
    applyTypeVars(typeState.values);
  }

  function formatTypeValue(key, value) {
    if (key === "size") return String(Math.round(value * 16));
    if (key === "tracking") {
      if (Math.abs(value) < 0.0005) return "0";
      const sign = value > 0 ? "+" : "";
      return sign + value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
    }
    return value.toFixed(2);
  }

  function setRangeFill(input) {
    if (!input) return;
    const min = Number(input.min);
    const max = Number(input.max);
    const val = Number(input.value);
    const pct = max === min ? 0 : ((val - min) / (max - min)) * 100;
    input.style.setProperty("--pct", `${pct}%`);
  }

  function typeFontLabel(id) {
    const key = TYPE_FONT_I18N[normalizeTypeFont(id)];
    return key ? t(key) : id;
  }

  function paintTypeFontFaces(box) {
    if (!box) return;
    box.querySelectorAll("[data-type-font]").forEach((btn) => {
      const id = btn.getAttribute("data-type-font");
      const preset = TYPE_FONTS[id];
      if (!preset) {
        btn.style.fontFamily = "";
        return;
      }
      if (preset.google && !document.getElementById("molan-reader-font-" + id)) return;
      btn.style.fontFamily = preset.ui;
    });
  }

  function scheduleTypeFontPreviews() {
    if (!typeState.fontsOpen || isVscodeHost()) return;
    const token = ++typeFontPreviewToken;
    const ids = TYPE_FONT_ORDER.filter((id) => TYPE_FONTS[id]?.google);
    let i = 0;
    const run = () => {
      if (token !== typeFontPreviewToken || !typeIsOpen() || !typeState.fontsOpen) return;
      const id = ids[i++];
      if (!id) return;
      loadReaderFont(id, () => {
        if (token !== typeFontPreviewToken) return;
        const btn = document.querySelector(`#typeMenu [data-type-font="${id}"]`);
        const preset = TYPE_FONTS[id];
        if (btn && preset) btn.style.fontFamily = preset.ui;
        next();
      });
    };
    const next = () => {
      if (token !== typeFontPreviewToken || !typeIsOpen() || !typeState.fontsOpen) return;
      if (typeof requestIdleCallback === "function") requestIdleCallback(run, { timeout: 400 });
      else setTimeout(run, 80);
    };
    next();
  }

  function ensureTypeFontButtons(menu) {
    if (!typeState.fontsOpen) return;
    const box = menu?.querySelector(".type-fonts");
    if (!box) return;
    const ids = TYPE_FONT_ORDER.filter((id) => Object.prototype.hasOwnProperty.call(TYPE_FONTS, id));
    const existing = Array.from(box.querySelectorAll("[data-type-font]"), (el) => el.getAttribute("data-type-font"));
    if (existing.join() !== ids.join()) {
      box.innerHTML = ids.map((id) => {
        const key = TYPE_FONT_I18N[id];
        const label = key ? t(key) : id;
        return `<button type="button" role="radio" data-type-font="${id}" aria-checked="false">${label}</button>`;
      }).join("");
    }
    paintTypeFontFaces(box);
  }

  function setTypeFontsOpen(open) {
    const next = !!open;
    if (typeState.fontsOpen === next) {
      if (next) scheduleTypeFontPreviews();
      return;
    }
    typeState.fontsOpen = next;
    if (!next) typeFontPreviewToken += 1;
    paintTypeControls();
    if (next) scheduleTypeFontPreviews();
  }

  function paintTypeControls() {
    const menu = document.getElementById("typeMenu");
    if (!menu) return;
    if (typeState.fontsOpen) ensureTypeFontButtons(menu);
    Object.keys(TYPE_RANGES).forEach((key) => {
      const input = menu.querySelector(`[data-type-key="${key}"]`);
      const label = menu.querySelector(`[data-type-val="${key}"]`);
      const value = typeState.values[key];
      if (input) {
        input.value = String(value);
        setRangeFill(input);
      }
      if (label) label.textContent = formatTypeValue(key, value);
    });
    const fontLabel = menu.querySelector("[data-type-font-label]");
    if (fontLabel) fontLabel.textContent = typeFontLabel(typeState.values.font);
    const toggle = menu.querySelector("#typeFontToggle");
    if (toggle) toggle.setAttribute("aria-expanded", typeState.fontsOpen ? "true" : "false");
    const row = menu.querySelector(".type-row-fonts");
    if (row) row.classList.toggle("is-open", typeState.fontsOpen);
    const box = menu.querySelector(".type-fonts");
    if (box) box.hidden = !typeState.fontsOpen;
    menu.querySelectorAll("[data-type-font]").forEach((btn) => {
      btn.setAttribute("aria-checked", btn.getAttribute("data-type-font") === typeState.values.font ? "true" : "false");
    });
  }

  function setTypeValue(key, raw, persist) {
    const next = clampType(key, raw);
    typeState.values[key] = next;
    applyTypeVars(typeState.values);
    paintTypeControls();
    if (persist !== false) persistType();
  }

  function setTypeFont(id, persist) {
    const next = normalizeTypeFont(id);
    const changed = typeState.values.font !== next;
    typeState.values.font = next;
    applyTypeVars(typeState.values);
    paintTypeControls();
    if (persist !== false) persistType();
    if (changed) {
      try { scheduleMermaidThemeRefresh(); } catch (_) { /* ignore */ }
    }
  }

  function resetType() {
    const fontChanged = typeState.values.font !== TYPE_DEFAULTS.font;
    typeState.values = { ...TYPE_DEFAULTS };
    applyTypeVars(typeState.values);
    paintTypeControls();
    persistType();
    if (fontChanged) {
      try { scheduleMermaidThemeRefresh(); } catch (_) { /* ignore */ }
    }
  }

  function typeIsOpen() {
    const menu = document.getElementById("typeMenu");
    return !!(typeState.open && menu && !menu.hidden && menu.classList.contains("is-open"));
  }

  function paintTypeButton(btn) {
    if (!btn) return;
    btn.id = "typeBtn";
    btn.className = "icon-btn";
    btn.type = "button";
    if (!btn.querySelector("svg")) btn.innerHTML = TYPE_ICON;
  }

  function ensureTypeButton() {
    const actions = document.querySelector(".reader-actions");
    let wrap = document.getElementById("typePrefs") || document.querySelector(".type-prefs");
    let btn = document.getElementById("typeBtn");
    if (!wrap && actions) {
      wrap = document.createElement("div");
      wrap.id = "typePrefs";
      wrap.className = "type-prefs";
      const headerPrefs = document.getElementById("headerPrefs");
      if (headerPrefs && headerPrefs.parentElement === actions) actions.insertBefore(wrap, headerPrefs);
      else actions.appendChild(wrap);
    }
    if (!btn && wrap) {
      btn = document.createElement("button");
      wrap.appendChild(btn);
    } else if (btn && wrap && btn.parentElement !== wrap) {
      wrap.appendChild(btn);
    }
    paintTypeButton(btn);
    if (btn && !btn.dataset.bound) {
      btn.dataset.bound = "1";
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleType();
      });
    }
    return { wrap, btn };
  }

  function applyTypeI18n() {
    const btn = document.getElementById("typeBtn");
    const menu = document.getElementById("typeMenu");
    const label = t("typeAria");
    const title = t("typeTitle");
    if (btn) {
      btn.title = title;
      btn.setAttribute("aria-label", label);
    }
    if (!menu) return;
    menu.setAttribute("aria-label", label);
    const head = menu.querySelector(".type-head");
    if (head) head.textContent = t("typeLabel");
    const map = {
      size: "typeSize",
      leading: "typeLeading",
      gap: "typeGap",
      tracking: "typeTracking",
      font: "typeFont",
    };
    Object.keys(map).forEach((key) => {
      const el = menu.querySelector(`[data-type-name="${key}"]`);
      if (el) el.textContent = t(map[key]);
    });
    menu.querySelectorAll("[data-type-font]").forEach((btn) => {
      const key = TYPE_FONT_I18N[btn.getAttribute("data-type-font")];
      if (key) btn.textContent = t(key);
    });
    const fonts = menu.querySelector(".type-fonts");
    if (fonts) fonts.setAttribute("aria-label", t("typeFont"));
    const toggle = menu.querySelector("#typeFontToggle");
    if (toggle) toggle.setAttribute("aria-label", t("typeFont"));
    const fontLabel = menu.querySelector("[data-type-font-label]");
    if (fontLabel) fontLabel.textContent = typeFontLabel(typeState.values.font);
    const reset = menu.querySelector("#typeReset");
    if (reset) reset.textContent = t("typeReset");
  }

  function openType() {
    closeHeaderPrefs();
    closeExportMenu();
    initType();
    const menu = document.getElementById("typeMenu");
    const btn = document.getElementById("typeBtn");
    if (!menu || !btn) return;
    typeState.animToken += 1;
    const already = typeIsOpen();
    typeState.open = true;
    paintTypeControls();
    menu.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    btn.classList.add("is-on");
    if (!already) {
      menu.classList.remove("is-out", "is-open");
      void menu.offsetWidth;
      menu.classList.add("is-open");
    }
  }

  function closeType() {
    typeFontPreviewToken += 1;
    typeState.fontsOpen = false;
    const menu = document.getElementById("typeMenu");
    const btn = document.getElementById("typeBtn");
    if (!menu || menu.hidden || menu.classList.contains("is-out")) {
      typeState.open = false;
      btn?.setAttribute("aria-expanded", "false");
      btn?.classList.remove("is-on");
      return;
    }
    const token = typeState.animToken + 1;
    typeState.animToken = token;
    typeState.open = false;
    menu.classList.remove("is-open");
    menu.classList.add("is-out");
    btn?.setAttribute("aria-expanded", "false");
    btn?.classList.remove("is-on");
    const finish = () => {
      if (token !== typeState.animToken) return;
      menu.hidden = true;
      menu.classList.remove("is-out");
    };
    if (prefersReducedMotion()) {
      finish();
      return;
    }
    menu.addEventListener("animationend", (e) => {
      if (e.target === menu) finish();
    }, { once: true });
    window.setTimeout(finish, 280);
  }

  function toggleType() {
    if (typeIsOpen()) closeType();
    else openType();
  }

  function initType() {
    if (initType.done) {
      ensureTypeButton();
      applyTypeI18n();
      paintTypeControls();
      return;
    }
    initType.done = true;
    applyStoredType();
    const { wrap } = ensureTypeButton();
    if (wrap && !document.getElementById("typeMenu")) {
      const menu = document.createElement("div");
      menu.id = "typeMenu";
      menu.className = "type-menu";
      menu.hidden = true;
      menu.setAttribute("role", "dialog");
      menu.innerHTML = `
        <div class="type-head" data-i18n="typeLabel">排版</div>
        <label class="type-row">
          <span class="type-row-head">
            <span data-type-name="size" data-i18n="typeSize">字号</span>
            <span class="type-val" data-type-val="size">16</span>
          </span>
          <input type="range" data-type-key="size" min="${TYPE_RANGES.size.min}" max="${TYPE_RANGES.size.max}" step="${TYPE_RANGES.size.step}" />
        </label>
        <label class="type-row">
          <span class="type-row-head">
            <span data-type-name="leading" data-i18n="typeLeading">行距</span>
            <span class="type-val" data-type-val="leading">1.58</span>
          </span>
          <input type="range" data-type-key="leading" min="${TYPE_RANGES.leading.min}" max="${TYPE_RANGES.leading.max}" step="${TYPE_RANGES.leading.step}" />
        </label>
        <label class="type-row">
          <span class="type-row-head">
            <span data-type-name="gap" data-i18n="typeGap">段距</span>
            <span class="type-val" data-type-val="gap">0.65</span>
          </span>
          <input type="range" data-type-key="gap" min="${TYPE_RANGES.gap.min}" max="${TYPE_RANGES.gap.max}" step="${TYPE_RANGES.gap.step}" />
        </label>
        <label class="type-row">
          <span class="type-row-head">
            <span data-type-name="tracking" data-i18n="typeTracking">字距</span>
            <span class="type-val" data-type-val="tracking">0</span>
          </span>
          <input type="range" data-type-key="tracking" min="${TYPE_RANGES.tracking.min}" max="${TYPE_RANGES.tracking.max}" step="${TYPE_RANGES.tracking.step}" />
        </label>
        <div class="type-row type-row-fonts">
          <button type="button" class="type-font-toggle" id="typeFontToggle" aria-expanded="false" aria-controls="typeFonts">
            <span data-type-name="font" data-i18n="typeFont">字体</span>
            <span class="type-val" data-type-font-label>跟随主题</span>
          </button>
          <div class="type-fonts" id="typeFonts" hidden role="radiogroup" aria-label="字体"></div>
        </div>
        <button type="button" class="type-reset" id="typeReset" data-i18n="typeReset">恢复默认</button>
      `;
      wrap.appendChild(menu);
      menu.addEventListener("click", (e) => e.stopPropagation());
      menu.querySelectorAll("[data-type-key]").forEach((input) => {
        input.addEventListener("input", () => {
          setTypeValue(input.getAttribute("data-type-key"), input.value, false);
        });
        input.addEventListener("change", () => persistType());
      });
      menu.querySelector("#typeFontToggle")?.addEventListener("click", () => {
        setTypeFontsOpen(!typeState.fontsOpen);
      });
      menu.querySelector(".type-fonts")?.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-type-font]");
        if (!btn) return;
        setTypeFont(btn.getAttribute("data-type-font"));
      });
      menu.querySelector("#typeReset")?.addEventListener("click", () => resetType());
    }
    const btn = document.getElementById("typeBtn");
    btn?.setAttribute("aria-expanded", "false");
    btn?.setAttribute("aria-haspopup", "dialog");
    btn?.setAttribute("aria-controls", "typeMenu");
    applyTypeI18n();
    paintTypeControls();
    document.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".type-prefs")) return;
      closeType();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeType();
    });
  }

  /* --- theme-tweak: 纸面色调派生（亮度 / 对比 / 强调色） --- */
  const THEME_TWEAK_DEFAULTS = { brightness: 0, contrast: 0, accentShift: 0 };
  const THEME_TWEAK_RANGES = {
    brightness: { min: -40, max: 40, step: 1 },
    contrast: { min: -30, max: 30, step: 1 },
    accentShift: { min: -60, max: 60, step: 1 },
  };
  const THEME_TWEAK_VARS = [
    "--paper", "--paper-deep", "--paper-lift", "--page-wash", "--page-wash-end",
    "--ink", "--ink-soft", "--ink-muted", "--strong",
    "--accent", "--accent-soft", "--accent-deep", "--accent-glow",
    "--link", "--inline-code", "--on-accent",
    "--table-bg", "--diagram-card", "--blockquote-tint", "--row-hover",
    "--hairline", "--hairline-strong",
    "--sidebar-active-bg", "--sidebar-active-border",
  ];

  function clampThemeTweak(key, value) {
    const range = THEME_TWEAK_RANGES[key];
    const n = Number(value);
    if (!range || !Number.isFinite(n)) return THEME_TWEAK_DEFAULTS[key];
    const snapped = range.step ? Math.round(n / range.step) * range.step : n;
    return Math.min(range.max, Math.max(range.min, snapped));
  }

  function normalizeThemeTweak(raw) {
    if (!raw || typeof raw !== "object") return { ...THEME_TWEAK_DEFAULTS };
    return {
      brightness: clampThemeTweak("brightness", raw.brightness ?? 0),
      contrast: clampThemeTweak("contrast", raw.contrast ?? 0),
      accentShift: clampThemeTweak("accentShift", raw.accentShift ?? 0),
    };
  }

  function isDefaultThemeTweak(tweak) {
    return tweak.brightness === 0 && tweak.contrast === 0 && tweak.accentShift === 0;
  }

  function parseCssColor(input) {
    const s = String(input || "").trim();
    if (!s) return null;
    const hex = s.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hex) {
      let h = hex[1];
      if (h.length === 3) h = h.split("").map((c) => c + c).join("");
      return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
      };
    }
    const rgb = s.match(/^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)/i);
    if (rgb) {
      return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) };
    }
    try {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) return null;
      ctx.fillStyle = "#000";
      ctx.fillStyle = s;
      ctx.fillRect(0, 0, 1, 1);
      const data = ctx.getImageData(0, 0, 1, 1).data;
      return { r: data[0], g: data[1], b: data[2] };
    } catch (_) {
      return null;
    }
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return { h: 0, s: 0, l };
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h = 0;
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
    return { h: h * 360, s, l };
  }

  function hue2rgb(p, q, t) {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  }

  function hslToRgb(h, s, l) {
    const hh = ((h % 360) + 360) % 360;
    if (s === 0) {
      const v = Math.round(l * 255);
      return { r: v, g: v, b: v };
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    const hk = hh / 360;
    return {
      r: Math.round(hue2rgb(p, q, hk + 1 / 3) * 255),
      g: Math.round(hue2rgb(p, q, hk) * 255),
      b: Math.round(hue2rgb(p, q, hk - 1 / 3) * 255),
    };
  }

  function clamp01(n) {
    return Math.min(1, Math.max(0, n));
  }

  function formatRgb(c) {
    return `rgb(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)})`;
  }

  function formatRgba(c, a) {
    return `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${a})`;
  }

  function mixRgb(a, b, t) {
    const k = clamp01(t);
    return {
      r: a.r + (b.r - a.r) * k,
      g: a.g + (b.g - a.g) * k,
      b: a.b + (b.b - a.b) * k,
    };
  }

  function adjustLightness(rgb, delta) {
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    return hslToRgb(hsl.h, hsl.s, clamp01(hsl.l + delta));
  }

  function shiftHue(rgb, deg) {
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
    return hslToRgb(hsl.h + deg, hsl.s, hsl.l);
  }

  function relativeLuminance(rgb) {
    const lin = [rgb.r, rgb.g, rgb.b].map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
  }

  function clearThemeTweakStyles() {
    const root = document.documentElement.style;
    for (const key of THEME_TWEAK_VARS) root.removeProperty(key);
    root.removeProperty("color-scheme");
  }

  function readBaseThemeColor(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return parseCssColor(v) || parseCssColor(fallback) || { r: 128, g: 128, b: 128 };
  }

  function buildThemeTweakVars(tweak) {
    const paper0 = readBaseThemeColor("--paper", "#161410");
    const ink0 = readBaseThemeColor("--ink", "#e8e2d6");
    const accent0 = readBaseThemeColor("--accent", "#e0a054");

    const bright = tweak.brightness / 100 * 0.28;
    const contrast = tweak.contrast / 100;

    let paper = adjustLightness(paper0, bright);
    let ink = adjustLightness(ink0, -bright * 0.35);

    const paperL = rgbToHsl(paper.r, paper.g, paper.b).l;
    const inkHsl0 = rgbToHsl(ink.r, ink.g, ink.b);
    const darkPaper = paperL < 0.45;
    const spread = Math.abs(inkHsl0.l - paperL);
    const targetSpread = clamp01(spread + contrast * 0.35);
    const inkDir = inkHsl0.l >= paperL ? 1 : -1;
    ink = hslToRgb(
      inkHsl0.h,
      inkHsl0.s,
      clamp01(paperL + inkDir * Math.max(0.18, targetSpread)),
    );

    const inkHsl = rgbToHsl(ink.r, ink.g, ink.b);
    if (Math.abs(inkHsl.l - paperL) < 0.22) {
      ink = hslToRgb(
        inkHsl.h,
        inkHsl.s,
        clamp01(paperL + (darkPaper ? 0.42 : -0.42)),
      );
    }

    const accent = shiftHue(accent0, tweak.accentShift);
    const accentSoft = adjustLightness(accent, darkPaper ? 0.12 : 0.1);
    const accentDeep = adjustLightness(accent, darkPaper ? -0.1 : -0.12);
    const paperLift = adjustLightness(paper, darkPaper ? 0.04 : 0.035);
    const paperDeep = adjustLightness(paper, darkPaper ? 0.05 : -0.04);
    const pageWash = adjustLightness(paper, darkPaper ? -0.03 : -0.025);
    const pageWashEnd = adjustLightness(paper, darkPaper ? -0.05 : -0.04);
    const inkSoft = mixRgb(ink, paper, 0.32);
    const inkMuted = mixRgb(ink, paper, 0.55);
    const strong = adjustLightness(ink, darkPaper ? 0.06 : -0.05);
    const tableBg = mixRgb(paper, ink, darkPaper ? 0.06 : 0.04);
    const onAccent = relativeLuminance(accent) > 0.55 ? paper : { r: 255, g: 248, b: 241 };

    return {
      "--paper": formatRgb(paper),
      "--paper-deep": formatRgb(paperDeep),
      "--paper-lift": formatRgb(paperLift),
      "--page-wash": formatRgb(pageWash),
      "--page-wash-end": formatRgb(pageWashEnd),
      "--ink": formatRgb(ink),
      "--ink-soft": formatRgb(inkSoft),
      "--ink-muted": formatRgb(inkMuted),
      "--strong": formatRgb(strong),
      "--accent": formatRgb(accent),
      "--accent-soft": formatRgb(accentSoft),
      "--accent-deep": formatRgb(accentDeep),
      "--accent-glow": formatRgba(accent, 0.28),
      "--link": formatRgb(darkPaper ? accentSoft : accentDeep),
      "--inline-code": formatRgb(darkPaper ? accentSoft : accentDeep),
      "--on-accent": formatRgb(onAccent),
      "--table-bg": formatRgb(tableBg),
      "--diagram-card": formatRgb(tableBg),
      "--blockquote-tint": formatRgba(accent, 0.1),
      "--row-hover": formatRgba(accent, 0.12),
      "--hairline": formatRgba(ink, 0.1),
      "--hairline-strong": formatRgba(ink, 0.16),
      "--sidebar-active-bg": formatRgba(accent, 0.16),
      "--sidebar-active-border": formatRgba(accentSoft, 0.35),
      "color-scheme": darkPaper ? "dark" : "light",
    };
  }

  function writeThemeTweakVars(vars) {
    const root = document.documentElement.style;
    for (const [k, v] of Object.entries(vars)) {
      root.setProperty(k === "color-scheme" ? "color-scheme" : k, v);
    }
  }

  /* --- theme: 纸面主题、色调微调 UI、顶栏偏好、轻量预览 DOM --- */
  const THEMES = ["xuan", "night", "hack", "rose", "slate", "mist", "cinnabar"];
  const THEME_KEY = "molan-theme";
  const THEME_TWEAK_KEY = "molan-theme-tweak";
  const THEME_I18N = {
    xuan: "themeXuan",
    night: "themeNight",
    hack: "themeHack",
    rose: "themeRose",
    slate: "themeSlate",
    mist: "themeMist",
    cinnabar: "themeCinnabar",
  };
  const THEME_TITLE = {
    xuan: "themeXuanTitle",
    night: "themeNightTitle",
    hack: "themeHackTitle",
    rose: "themeRoseTitle",
    slate: "themeSlateTitle",
    mist: "themeMistTitle",
    cinnabar: "themeCinnabarTitle",
  };
  const THEME_FONTS = {
    night: "family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@400;500",
    hack: "family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400",
    xuan: "family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500",
    rose: "family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500",
    slate: "family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500",
    mist: "family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500",
    cinnabar: "family=Cormorant+Garamond:ital,wght@0,500;0,600;0,700;1,500;1,600&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500",
  };

  const headerPrefsState = {
    open: false,
    animToken: 0,
  };
  const themeTweakState = {
    byTheme: {},
    mermaidTimer: 0,
  };

  function isVscodeHost() {
    return document.documentElement.classList.contains("molan-host-vscode")
      || document.body.classList.contains("molan-host-vscode");
  }

  function loadThemeFonts(theme) {
    if (isVscodeHost()) return;
    const query = THEME_FONTS[theme] || THEME_FONTS.night;
    const href = "https://fonts.googleapis.com/css2?" + query + "&display=swap";
    let link = document.getElementById("molan-fonts");
    if (!link) {
      link = document.createElement("link");
      link.id = "molan-fonts";
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    if (link.getAttribute("href") === href) return;
    link.href = href;
  }

  function readStoredThemeTweaks() {
    try {
      const raw = JSON.parse(localStorage.getItem(THEME_TWEAK_KEY) || "null");
      if (!raw || typeof raw !== "object") return {};
      const out = {};
      for (const id of THEMES) {
        if (raw[id]) out[id] = normalizeThemeTweak(raw[id]);
      }
      return out;
    } catch (_) {
      return {};
    }
  }

  function persistThemeTweaks() {
    try {
      const slim = {};
      for (const id of THEMES) {
        const tw = themeTweakState.byTheme[id];
        if (tw && !isDefaultThemeTweak(tw)) slim[id] = tw;
      }
      localStorage.setItem(THEME_TWEAK_KEY, JSON.stringify(slim));
    } catch (_) { /* ignore */ }
  }

  function readThemeTweak(theme) {
    const id = THEMES.includes(theme) ? theme : "night";
    return normalizeThemeTweak(themeTweakState.byTheme[id] || THEME_TWEAK_DEFAULTS);
  }

  function applyThemeTweaks(tweak, opts = {}) {
    const values = normalizeThemeTweak(tweak);
    clearThemeTweakStyles();
    if (!isDefaultThemeTweak(values)) {
      writeThemeTweakVars(buildThemeTweakVars(values));
    }
    paintThemeTweakControls();
    if (opts.refreshMermaid) {
      scheduleThemeTweakMermaid(opts.immediate);
    }
  }

  function scheduleThemeTweakMermaid(immediate) {
    if (themeTweakState.mermaidTimer) {
      clearTimeout(themeTweakState.mermaidTimer);
      themeTweakState.mermaidTimer = 0;
    }
    const run = () => {
      themeTweakState.mermaidTimer = 0;
      try { scheduleMermaidThemeRefresh(); } catch (_) { /* ignore */ }
    };
    if (immediate) run();
    else themeTweakState.mermaidTimer = window.setTimeout(run, 280);
  }

  function setThemeTweakValue(key, value, opts = {}) {
    const theme = readStoredTheme();
    const next = {
      ...readThemeTweak(theme),
      [key]: clampThemeTweak(key, value),
    };
    themeTweakState.byTheme[theme] = next;
    if (opts.persist !== false) persistThemeTweaks();
    applyThemeTweaks(next, {
      refreshMermaid: opts.refreshMermaid !== false,
      immediate: !!opts.immediate,
    });
  }

  function resetThemeTweak(opts = {}) {
    const theme = readStoredTheme();
    themeTweakState.byTheme[theme] = { ...THEME_TWEAK_DEFAULTS };
    persistThemeTweaks();
    applyThemeTweaks(THEME_TWEAK_DEFAULTS, {
      refreshMermaid: true,
      immediate: true,
    });
    if (opts.toast !== false) toast(t("themeTweakResetDone"));
  }

  function formatThemeTweakValue(value) {
    if (value === 0) return "0";
    return (value > 0 ? "+" : "") + String(value);
  }

  function themeTweakMarkup() {
    const rows = [
      ["brightness", "themeBrightness"],
      ["contrast", "themeContrast"],
      ["accentShift", "themeAccentShift"],
    ].map(([key, labelKey]) => {
      const range = THEME_TWEAK_RANGES[key];
      return `<div class="type-row">
        <div class="type-row-head"><span data-theme-tweak-label="${key}">${t(labelKey)}</span><span class="type-val" data-theme-tweak-val="${key}">0</span></div>
        <input type="range" data-theme-tweak-key="${key}" min="${range.min}" max="${range.max}" step="${range.step}" value="0" />
      </div>`;
    }).join("");
    return `<div class="theme-tweak" data-theme-tweak>
      <div class="type-head" data-theme-tweak-head>${t("themeTweak")}</div>
      ${rows}
      <button type="button" class="type-reset" data-theme-tweak-reset>${t("themeTweakReset")}</button>
    </div>`;
  }

  function ensureThemeTweakDom() {
    const mounts = [];
    const headerMenu = document.getElementById("headerPrefsMenu");
    if (headerMenu) mounts.push(headerMenu);
    const prefsMenu = document.getElementById("prefsMenu");
    if (prefsMenu) {
      let section = prefsMenu.querySelector("[data-theme-tweak-section]");
      if (!section) {
        section = document.createElement("div");
        section.className = "prefs-section";
        section.setAttribute("data-theme-tweak-section", "1");
        const themeSection = prefsMenu.querySelector(".prefs-section");
        if (themeSection && themeSection.nextSibling) {
          prefsMenu.insertBefore(section, themeSection.nextSibling);
        } else if (themeSection) {
          themeSection.after(section);
        } else {
          prefsMenu.appendChild(section);
        }
      }
      mounts.push(section);
    }
    for (const mount of mounts) {
      if (mount.querySelector("[data-theme-tweak]")) continue;
      mount.insertAdjacentHTML("beforeend", themeTweakMarkup());
      const box = mount.querySelector("[data-theme-tweak]");
      if (!box || box.dataset.bound) continue;
      box.dataset.bound = "1";
      box.addEventListener("input", (e) => {
        const input = e.target.closest("[data-theme-tweak-key]");
        if (!input) return;
        setThemeTweakValue(input.getAttribute("data-theme-tweak-key"), input.value, {
          refreshMermaid: false,
          persist: false,
        });
      });
      box.addEventListener("change", (e) => {
        const input = e.target.closest("[data-theme-tweak-key]");
        if (!input) return;
        setThemeTweakValue(input.getAttribute("data-theme-tweak-key"), input.value, {
          refreshMermaid: true,
          immediate: false,
          persist: true,
        });
      });
      box.querySelector("[data-theme-tweak-reset]")?.addEventListener("click", () => {
        resetThemeTweak();
      });
    }
  }

  function paintThemeTweakControls() {
    const theme = readStoredTheme();
    const values = readThemeTweak(theme);
    document.querySelectorAll("[data-theme-tweak]").forEach((box) => {
      Object.keys(THEME_TWEAK_RANGES).forEach((key) => {
        const input = box.querySelector(`[data-theme-tweak-key="${key}"]`);
        const label = box.querySelector(`[data-theme-tweak-val="${key}"]`);
        const value = values[key];
        if (input) {
          input.value = String(value);
          setRangeFill(input);
        }
        if (label) label.textContent = formatThemeTweakValue(value);
      });
    });
  }

  function applyThemeTweakI18n() {
    document.querySelectorAll("[data-theme-tweak-head]").forEach((el) => {
      el.textContent = t("themeTweak");
    });
    document.querySelectorAll("[data-theme-tweak-label]").forEach((el) => {
      const key = el.getAttribute("data-theme-tweak-label");
      const map = {
        brightness: "themeBrightness",
        contrast: "themeContrast",
        accentShift: "themeAccentShift",
      };
      if (map[key]) el.textContent = t(map[key]);
    });
    document.querySelectorAll("[data-theme-tweak-reset]").forEach((el) => {
      el.textContent = t("themeTweakReset");
    });
  }

  function readStoredTheme() {
    try {
      const id = localStorage.getItem(THEME_KEY);
      if (THEMES.includes(id)) return id;
    } catch (_) { /* ignore */ }
    return "night";
  }

  function paintThemeSwitch(theme) {
    document.querySelectorAll(".theme-switch [data-theme]").forEach((btn) => {
      btn.setAttribute("aria-checked", btn.getAttribute("data-theme") === theme ? "true" : "false");
    });
  }

  function applyTheme(theme, persist) {
    const next = THEMES.includes(theme) ? theme : "night";
    clearThemeTweakStyles();
    document.documentElement.setAttribute("data-theme", next);
    loadThemeFonts(next);
    if (persist !== false) {
      try { localStorage.setItem(THEME_KEY, next); } catch (_) { /* ignore */ }
    }
    paintThemeSwitch(next);
    applyThemeTweaks(readThemeTweak(next), { refreshMermaid: false });
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: "theme", theme: next }, window.location.origin);
      }
    } catch (_) { /* ignore */ }
    try {
      scheduleMermaidThemeRefresh();
    } catch (_) { /* ignore */ }
  }

  function bindThemeSwitch(switchEl) {
    if (!switchEl || switchEl.dataset.bound) return;
    switchEl.dataset.bound = "1";
    switchEl.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-theme]");
      if (!btn) return;
      const id = btn.getAttribute("data-theme");
      applyTheme(id);
      paintThemeTweakControls();
      toast(t("themeSwitched", { name: t(THEME_I18N[id] || id) }));
    });
  }

  function applyThemeI18n() {
    const head = document.querySelector("#headerPrefsMenu .type-head");
    if (head) head.textContent = t("prefsTheme");
    const menu = document.getElementById("headerPrefsMenu");
    if (menu) menu.setAttribute("aria-label", t("prefsAria"));
    const prefsBtn = document.getElementById("headerPrefsBtn");
    if (prefsBtn) {
      prefsBtn.title = t("prefsAria");
      prefsBtn.setAttribute("aria-label", t("prefsAria"));
    }
    document.querySelectorAll(".theme-switch").forEach((el) => {
      el.setAttribute("aria-label", t("themeAria"));
    });
    document.querySelectorAll(".theme-switch [data-theme]").forEach((el) => {
      const id = el.getAttribute("data-theme");
      if (!THEME_I18N[id]) return;
      el.title = t(THEME_TITLE[id]);
      el.setAttribute("aria-label", t(THEME_I18N[id]));
    });
    applyThemeTweakI18n();
  }

  function headerPrefsIsOpen() {
    const menu = document.getElementById("headerPrefsMenu");
    return !!(headerPrefsState.open && menu && !menu.hidden && menu.classList.contains("is-open"));
  }

  function openHeaderPrefs() {
    closeType();
    closeExportMenu();
    initHeaderPrefs();
    const menu = document.getElementById("headerPrefsMenu");
    const btn = document.getElementById("headerPrefsBtn");
    if (!menu || !btn) return;
    headerPrefsState.animToken += 1;
    const already = headerPrefsIsOpen();
    headerPrefsState.open = true;
    menu.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    btn.classList.add("is-on");
    if (!already) {
      menu.classList.remove("is-out", "is-open");
      void menu.offsetWidth;
      menu.classList.add("is-open");
    }
  }

  function closeHeaderPrefs() {
    const menu = document.getElementById("headerPrefsMenu");
    const btn = document.getElementById("headerPrefsBtn");
    if (!menu || menu.hidden || menu.classList.contains("is-out")) {
      headerPrefsState.open = false;
      btn?.setAttribute("aria-expanded", "false");
      btn?.classList.remove("is-on");
      return;
    }
    const token = headerPrefsState.animToken + 1;
    headerPrefsState.animToken = token;
    headerPrefsState.open = false;
    menu.classList.remove("is-open");
    menu.classList.add("is-out");
    btn?.setAttribute("aria-expanded", "false");
    btn?.classList.remove("is-on");
    const finish = () => {
      if (token !== headerPrefsState.animToken) return;
      menu.hidden = true;
      menu.classList.remove("is-out");
    };
    if (prefersReducedMotion()) {
      finish();
      return;
    }
    menu.addEventListener("animationend", (e) => {
      if (e.target === menu) finish();
    }, { once: true });
    window.setTimeout(finish, 280);
  }

  function toggleHeaderPrefs() {
    if (headerPrefsIsOpen()) closeHeaderPrefs();
    else openHeaderPrefs();
  }

  function initHeaderPrefs() {
    const wrap = document.getElementById("headerPrefs");
    const btn = document.getElementById("headerPrefsBtn");
    const menu = document.getElementById("headerPrefsMenu");
    if (!wrap || !btn || !menu) return;
    ensureThemeTweakDom();
    if (initHeaderPrefs.done) {
      applyThemeI18n();
      paintThemeTweakControls();
      return;
    }
    initHeaderPrefs.done = true;
    if (!btn.dataset.bound) {
      btn.dataset.bound = "1";
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleHeaderPrefs();
      });
    }
    menu.addEventListener("click", (e) => e.stopPropagation());
    document.addEventListener("pointerdown", (e) => {
      if (e.target.closest("#headerPrefs")) return;
      closeHeaderPrefs();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeHeaderPrefs();
    });
    applyThemeI18n();
    paintThemeTweakControls();
  }

  function initTheme() {
    if (!initTheme.tweaksLoaded) {
      initTheme.tweaksLoaded = true;
      themeTweakState.byTheme = readStoredThemeTweaks();
    }
    ensureThemeTweakDom();
    if (initTheme.done) {
      applyThemeI18n();
      paintThemeSwitch(readStoredTheme());
      paintThemeTweakControls();
      return;
    }
    initTheme.done = true;
    applyTheme(readStoredTheme(), false);
    document.querySelectorAll(".theme-switch").forEach(bindThemeSwitch);
    applyThemeI18n();
    paintThemeSwitch(readStoredTheme());
    paintThemeTweakControls();
  }

  function revealVditorIcons() {
    const xlink = "http://www.w3.org/1999/xlink";
    document.querySelectorAll("use").forEach((use) => {
      const ref = use.getAttribute("href")
        || use.getAttributeNS(xlink, "href")
        || use.getAttribute("xlink:href");
      if (ref) use.setAttribute("href", ref);
    });
  }

  function ensureLitePreviewDom(vditorEl) {
    const wrap = vditorEl.parentElement;
    let host = document.getElementById("molanPreview");
    if (!host && wrap) {
      host = document.createElement("div");
      host.id = "molanPreview";
      host.className = "molan-preview vditor-preview";
      wrap.insertBefore(host, vditorEl);
    }
    let body = document.getElementById("molanPreviewBody");
    if (!body && host) {
      body = document.createElement("div");
      body.id = "molanPreviewBody";
      body.className = "vditor-reset";
      host.appendChild(body);
    }
    return { wrap, host, body };
  }

  /* --- image: 插入菜单图标与在线图片地址 --- */
  const INSERT_ICON = {
    table: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="1.5"/><path d="M4 10h16M4 15h16M10 5v14"/></svg>',
    code: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 8 5 12l4 4M15 8l4 4-4 4"/></svg>',
    math: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10L9 12l8 5H7"/></svg>',
    mermaid: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4.5" width="7" height="5.5" rx="1.2"/><rect x="13" y="14" width="7" height="5.5" rx="1.2"/><path d="M7.5 10v3.2h9V14"/></svg>',
    image: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="6" width="16" height="12" rx="2"/><circle cx="9" cy="10.5" r="1.4"/><path d="m5 16 4-3.2 3.2 2.6 2.6-2 4.2 3.4"/></svg>',
    quote: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 17V10H5.8C5.8 7.6 7.4 6.2 9.8 6"/><path d="M16.2 17V10h-2.2c0-2.4 1.6-3.8 4-4"/></svg>',
    hr: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16"/><circle cx="8" cy="12" r="1.2"/><circle cx="16" cy="12" r="1.2"/></svg>',
    ul: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="7" r="1.2"/><circle cx="6" cy="12" r="1.2"/><circle cx="6" cy="17" r="1.2"/><path d="M10 7h8M10 12h8M10 17h8"/></svg>',
    ol: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6.2V9M5 9h2M5.2 13.6c.4-.6 1.2-.8 1.8-.4.4.3.5.8.3 1.2L5 17.2h3"/><path d="M10 7h8M10 12h8M10 17h8"/></svg>',
    task: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5.5" width="6" height="6" rx="1.2"/><path d="m5.6 8.6 1.5 1.5 2.6-2.8M13 8h7M4 17h6M13 17h7"/></svg>',
  };

  const INSERT_ITEMS = [
    { id: "h1", key: "insertH1", md: "# ", icon: "<span>H1</span>" },
    { id: "h2", key: "insertH2", md: "## ", icon: "<span>H2</span>" },
    { id: "h3", key: "insertH3", md: "### ", icon: "<span>H3</span>" },
    { id: "quote", key: "insertQuote", md: "> ", icon: INSERT_ICON.quote },
    { id: "hr", key: "insertHr", md: "---", icon: INSERT_ICON.hr },
    { sep: true },
    { id: "ul", key: "insertUl", md: "- ", icon: INSERT_ICON.ul },
    { id: "ol", key: "insertOl", md: "1. ", icon: INSERT_ICON.ol },
    { id: "task", key: "insertTask", md: "- [ ] ", icon: INSERT_ICON.task },
    { sep: true },
    { id: "table", key: "insertTable", md: "| 列 1 | 列 2 |\n| --- | --- |\n|  |  |", icon: INSERT_ICON.table },
    { id: "code", key: "insertCode", md: "```\n\n```", icon: INSERT_ICON.code },
    { id: "math", key: "insertMath", md: "$$\n\n$$", icon: INSERT_ICON.math },
    { id: "mermaid", key: "insertMermaid", md: "```mermaid\nflowchart TD\n  A[开始] --> B[结束]\n```", icon: INSERT_ICON.mermaid },
    { id: "image", key: "insertImage", pick: "image", icon: INSERT_ICON.image },
  ];

  function escapeMdAlt(name) {
    return String(name || "").replace(/[[\]\n]/g, " ").trim() || "image";
  }

  function parseOnlineImageUrl(raw) {
    const s = String(raw || "").trim().replace(/^<|>$/g, "");
    if (!s) return "";
    try {
      const url = new URL(s);
      if (url.protocol !== "http:" && url.protocol !== "https:") return "";
      return url.href;
    } catch (_) {
      return "";
    }
  }

  function parseInlineHref(raw) {
    const s = String(raw || "").trim().replace(/^<|>$/g, "");
    if (!s || /[\s<>]/.test(s)) return "";
    if (/^(javascript|data|vbscript):/i.test(s)) return "";
    return s;
  }

  function altFromImageUrl(href) {
    try {
      const leaf = new URL(href).pathname.split("/").filter(Boolean).pop() || "";
      const name = decodeURIComponent(leaf).replace(/\.[^.]+$/, "");
      return escapeMdAlt(name);
    } catch (_) {
      return "image";
    }
  }

  function promptImageUrl() {
    return new Promise((resolve) => {
      document.getElementById("molanImageUrlDialog")?.remove();
      const mask = document.createElement("div");
      mask.id = "molanImageUrlDialog";
      mask.className = "molan-image-url-mask";
      mask.innerHTML = `
        <form class="molan-image-url-dialog" role="dialog" aria-modal="true" aria-labelledby="molanImageUrlTitle" novalidate>
          <div class="molan-image-url-title" id="molanImageUrlTitle"></div>
          <p class="molan-image-url-hint"></p>
          <input class="molan-image-url-input" type="url" inputmode="url" autocomplete="off" spellcheck="false" />
          <div class="molan-image-url-actions">
            <button type="button" class="molan-image-url-cancel"></button>
            <button type="submit" class="molan-image-url-ok"></button>
          </div>
        </form>
      `;
      const form = mask.querySelector(".molan-image-url-dialog");
      const input = mask.querySelector(".molan-image-url-input");
      const cancel = mask.querySelector(".molan-image-url-cancel");
      mask.querySelector(".molan-image-url-title").textContent = t("imageUrlTitle");
      mask.querySelector(".molan-image-url-hint").textContent = t("imageUrlHint");
      input.placeholder = t("imageUrlPlaceholder");
      cancel.textContent = t("imageUrlCancel");
      mask.querySelector(".molan-image-url-ok").textContent = t("imageUrlConfirm");
      let settled = false;
      const finish = (md) => {
        if (settled) return;
        settled = true;
        window.removeEventListener("keydown", onKey, true);
        mask.remove();
        resolve(md);
      };
      const onKey = (e) => {
        if (e.key !== "Escape") return;
        e.preventDefault();
        e.stopPropagation();
        finish("");
      };
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const href = parseOnlineImageUrl(input.value);
        if (!href) {
          input.classList.add("is-invalid");
          toast(t("imageUrlInvalid"));
          input.focus();
          input.select();
          return;
        }
        finish(`![${altFromImageUrl(href)}](${href})`);
      });
      cancel.addEventListener("click", () => finish(""));
      mask.addEventListener("click", (e) => {
        if (e.target === mask) finish("");
      });
      form.addEventListener("click", (e) => e.stopPropagation());
      window.addEventListener("keydown", onKey, true);
      document.body.appendChild(mask);
      requestAnimationFrame(() => input.focus());
    });
  }

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

      const resetPreviewView = () => {
        const canvas = preview.querySelector(".molan-mermaid-editor-preview-canvas");
        const svg = canvas?.querySelector("svg");
        previewScale = 1;
        previewPanX = 0;
        previewPanY = 0;
        previewDragging = false;
        previewDragOrigin = null;
        preview.classList.remove("is-dragging");
        if (svg) {
          const rect = preview.getBoundingClientRect();
          const display = fitSvgToBox(svg, rect.width, rect.height, 24);
          previewFitW = display.width;
          previewFitH = display.height;
        } else {
          previewFitW = 1;
          previewFitH = 1;
        }
        applyPreviewTransform();
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

      const renderPreview = async () => {
        const seq = ++previewSeq;
        const text = textarea.value.trim();
        if (!text) {
          preview.classList.remove("is-error");
          preview.innerHTML = "";
          resetPreviewView();
          return;
        }
        if (!global.mermaid || typeof global.mermaid.render !== "function") {
          showPreviewError(t("diagramNotReady"));
          return;
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
          resetPreviewView();
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

  /* --- task: 预览里勾选待办，写回 Markdown --- */
  function lineIsFence(line) {
    return /^ {0,3}(`{3,}|~{3,})/.test(line);
  }

  function listTaskMarks(source) {
    const lines = String(source ?? "").split("\n");
    const marks = [];
    let offset = 0;
    let fence = false;
    let inList = false;
    for (const line of lines) {
      if (lineIsFence(line)) {
        fence = !fence;
        inList = false;
      } else if (!fence && line.trim()) {
        const stripped = line.replace(/^(?: {0,3}> *)+/, "");
        const list = /^([ \t]*)([-*+]|\d+[.)])([ \t]+)/.exec(stripped);
        const indentedCode = /^(?: {4,}|\t)/.test(stripped) && !inList;
        if (list && !indentedCode && !(list[1].length >= 4 && !inList)) {
          inList = true;
          const task = /^([ \t]*)([-*+]|\d+[.)])([ \t]+)\[([ xX])\]/.exec(stripped);
          if (task) {
            const prefix = line.length - stripped.length;
            marks.push(offset + prefix + task[1].length + task[2].length + task[3].length + 1);
          }
        } else if (!/^(?: {4,}|\t)/.test(stripped)) {
          inList = false;
        }
      }
      offset += line.length + 1;
    }
    return marks;
  }

  function toggleTaskMarkdown(source, index) {
    const src = String(source ?? "");
    const at = listTaskMarks(src)[index];
    if (at == null) return src;
    const ch = src[at];
    if (ch !== " " && ch !== "x" && ch !== "X") return src;
    return src.slice(0, at) + (ch === " " ? "x" : " ") + src.slice(at + 1);
  }

  function previewTaskBoxes(root) {
    if (!root) return [];
    return [...root.querySelectorAll("li.vditor-task input[type='checkbox']")];
  }

  function armPreviewTasks(root) {
    const label = t("toggleTask");
    previewTaskBoxes(root).forEach((box) => {
      box.disabled = false;
      box.removeAttribute("disabled");
      box.title = label;
      box.setAttribute("aria-label", label);
    });
  }

  function bindPreviewTasks(root, handlers) {
    if (!root || root.dataset.molanPreviewTasks === "1") return;
    root.dataset.molanPreviewTasks = "1";
    const boxFrom = (e) => {
      const box = e.target?.closest?.("input[type='checkbox']");
      if (!box || !root.contains(box) || !box.closest("li.vditor-task")) return null;
      if (!handlers.isPreviewing?.()) return null;
      return box;
    };
    root.addEventListener("mousedown", (e) => {
      if (!boxFrom(e)) return;
      e.stopPropagation();
    }, true);
    root.addEventListener("click", (e) => {
      const box = boxFrom(e);
      if (!box) return;
      e.preventDefault();
      e.stopPropagation();
      const index = previewTaskBoxes(root).indexOf(box);
      if (index < 0) return;
      const next = toggleTaskMarkdown(handlers.getMarkdown?.() || "", index);
      handlers.applyMarkdown?.(next);
    }, true);
  }

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

  /* --- insert: 行首「+」插入块 --- */
  function bindBlockInsert(ctx) {
    const wrap = ctx.getWrap();
    if (!wrap) return { sync() {}, hide() {}, refreshI18n() {} };

    let handle = wrap.querySelector(":scope > .molan-block-insert");
    if (!handle) {
      handle = document.createElement("div");
      handle.className = "molan-block-insert";
      handle.hidden = true;
      handle.innerHTML = `<button type="button" class="molan-block-plus" aria-haspopup="menu" aria-expanded="false">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10"/></svg>
      </button>`;
      wrap.appendChild(handle);
    }
    const plusBtn = handle.querySelector(".molan-block-plus");

    let menu = wrap.querySelector(":scope > .molan-insert-menu");
    if (!menu) {
      menu = document.createElement("div");
      menu.className = "molan-insert-menu";
      menu.hidden = true;
      menu.setAttribute("role", "menu");
      wrap.appendChild(menu);
    }

    let hover = null;
    let menuOpen = false;
    let activeIndex = 0;
    let hideTimer = 0;
    let moveRaf = 0;

    const items = () => INSERT_ITEMS.filter((row) => !row.sep);

    function paintMenu() {
      menu.innerHTML = INSERT_ITEMS.map((item) => {
        if (item.sep) return '<span class="molan-insert-sep" aria-hidden="true"></span>';
        const label = t(item.key);
        return `<button type="button" class="molan-insert-item" role="menuitem" data-insert-id="${item.id}" title="${label}" aria-label="${label}">
            ${item.icon}
          </button>`;
      }).join("");
      plusBtn.setAttribute("aria-label", t("insertBlock"));
      plusBtn.setAttribute("title", t("insertBlock"));
      menu.setAttribute("aria-label", t("insertBlock"));
    }

    function visibleItems() {
      return [...menu.querySelectorAll(".molan-insert-item")];
    }

    function paintActive() {
      visibleItems().forEach((el, i) => el.classList.toggle("is-active", i === activeIndex));
    }

    function contentRoot() {
      if (ctx.getPreviewing()) return ctx.getPreviewBody();
      const vditorRoot = ctx.getVditorRoot();
      return vditorRoot?.querySelector(".vditor-ir pre.vditor-reset")
        || vditorRoot?.querySelector(".vditor-ir .vditor-reset")
        || vditorRoot?.querySelector(".vditor-wysiwyg pre.vditor-reset")
        || vditorRoot?.querySelector(".vditor-wysiwyg .vditor-reset")
        || null;
    }

    function hideHandle() {
      if (menuOpen) return;
      handle.hidden = true;
      handle.classList.remove("is-visible");
      hover = null;
    }

    function hideMenu() {
      if (document.activeElement && menu.contains(document.activeElement)) {
        try { document.activeElement.blur(); } catch (_) { /* ignore */ }
      }
      menuOpen = false;
      menu.hidden = true;
      plusBtn.setAttribute("aria-expanded", "false");
    }

    function handleRect(target) {
      if (!target) return null;
      if (target.gapRect) return target.gapRect;
      return target.el?.getBoundingClientRect?.() || null;
    }

    function positionHandle(target) {
      const rect = handleRect(target);
      if (!rect) {
        hideHandle();
        return;
      }
      const wrapRect = wrap.getBoundingClientRect();
      if (rect.bottom < wrapRect.top + 8 || rect.top > wrapRect.bottom - 8) {
        handle.hidden = true;
        return;
      }
      const rtl = document.documentElement.dir === "rtl";
      const size = 26;
      const top = rect.top - wrapRect.top + Math.min(Math.max((Math.min(rect.height, 32) - size) / 2, 0), 8);
      let left = rtl
        ? rect.right - wrapRect.left + 8
        : rect.left - wrapRect.left - size - 8;
      left = Math.max(4, Math.min(left, wrapRect.width - size - 4));
      handle.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
      handle.hidden = false;
      handle.classList.add("is-visible");
    }

    function positionMenu() {
      const wrapRect = wrap.getBoundingClientRect();
      const btnRect = plusBtn.getBoundingClientRect();
      menu.hidden = false;
      const menuRect = menu.getBoundingClientRect();
      const rtl = document.documentElement.dir === "rtl";
      let left = rtl
        ? btnRect.left - wrapRect.left - menuRect.width - 8
        : btnRect.right - wrapRect.left + 8;
      let top = btnRect.top - wrapRect.top + (btnRect.height - menuRect.height) / 2;
      if (left + menuRect.width > wrapRect.width - 8) {
        left = Math.max(8, wrapRect.width - menuRect.width - 8);
      }
      if (left < 8) left = 8;
      if (top < 8) top = 8;
      if (top + menuRect.height > wrapRect.height - 8) {
        top = Math.max(8, wrapRect.height - menuRect.height - 8);
      }
      menu.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
    }

    function setHover(next) {
      hover = next;
      if (!next) {
        hideHandle();
        return;
      }
      positionHandle(next);
    }

    function makeGapTarget(index, top, bottom, left) {
      const size = 26;
      const mid = (top + bottom) / 2;
      const gapTop = mid - size / 2;
      return {
        el: null,
        index,
        empty: false,
        gapRect: {
          top: gapTop,
          left,
          width: size,
          height: size,
          right: left + size,
          bottom: gapTop + size,
        },
      };
    }

    function hitFromPoint(clientX, clientY) {
      const root = contentRoot();
      if (!root) return null;
      const hitNode = document.elementFromPoint(clientX, clientY);
      if (hitNode && (hitNode.closest(".molan-block-insert") || hitNode.closest(".molan-insert-menu"))) {
        return hover;
      }
      const blocks = topLevelBlocks(root);
      const rootRect = root.getBoundingClientRect();
      const rtl = document.documentElement.dir === "rtl";
      const left = rtl ? rootRect.right - 26 : rootRect.left;
      if (!blocks.length) {
        return { el: root, index: 0, emptyDoc: true, empty: true };
      }

      for (let i = 0; i < blocks.length; i++) {
        const r = blocks[i].getBoundingClientRect();
        const prevBottom = i === 0 ? rootRect.top : blocks[i - 1].getBoundingClientRect().bottom;
        if (clientY >= prevBottom && clientY < r.top) {
          return makeGapTarget(i - 1, prevBottom, r.top, left);
        }
        if (clientY >= r.top && clientY <= r.bottom) {
          if (blockLooksEmpty(blocks[i])) {
            return { el: blocks[i], index: i, empty: true };
          }
          return null;
        }
      }

      const last = blocks[blocks.length - 1];
      const lastBottom = last.getBoundingClientRect().bottom;
      const after = Math.min(rootRect.bottom, lastBottom + 28);
      if (clientY > lastBottom && clientY <= after) {
        return makeGapTarget(blocks.length - 1, lastBottom, after, left);
      }
      return null;
    }

    function onMove(event) {
      if (menuOpen) return;
      if (moveRaf) cancelAnimationFrame(moveRaf);
      const { clientX, clientY } = event;
      moveRaf = requestAnimationFrame(() => {
        moveRaf = 0;
        const next = hitFromPoint(clientX, clientY);
        if (!next) {
          if (hideTimer) clearTimeout(hideTimer);
          hideTimer = window.setTimeout(hideHandle, 180);
          return;
        }
        if (hideTimer) {
          clearTimeout(hideTimer);
          hideTimer = 0;
        }
        setHover(next);
      });
    }

    function onLeave(event) {
      if (menuOpen) return;
      const to = event.relatedTarget;
      if (to && (handle.contains(to) || menu.contains(to))) return;
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = window.setTimeout(hideHandle, 220);
    }

    function openMenu() {
      if (!hover) return;
      paintMenu();
      menuOpen = true;
      activeIndex = 0;
      plusBtn.setAttribute("aria-expanded", "true");
      positionHandle(hover);
      positionMenu();
      paintActive();
      const first = visibleItems()[0];
      first?.focus();
    }

    function applyItem(id) {
      const item = items().find((row) => row.id === id);
      const target = hover;
      if (!item || !target) return;
      hideMenu();
      const run = async () => {
        let md = item.md;
        if (item.pick === "image") {
          hideHandle();
          try {
            md = await ctx.pickImage?.();
          } catch (_) {
            toast(t("pickImageFail"));
            return;
          }
          if (!md) return;
        }
        hideHandle();
        await ctx.insertSnippet?.(md, target);
      };
      void run();
    }

    plusBtn.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    plusBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (menuOpen) hideMenu();
      else openMenu();
    });
    handle.addEventListener("mouseenter", () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = 0;
      }
    });
    menu.addEventListener("click", (event) => {
      const btn = event.target.closest(".molan-insert-item");
      if (!btn) return;
      event.preventDefault();
      applyItem(btn.getAttribute("data-insert-id"));
    });
    menu.addEventListener("mouseover", (event) => {
      const btn = event.target.closest(".molan-insert-item");
      if (!btn) return;
      const rows = visibleItems();
      activeIndex = Math.max(0, rows.indexOf(btn));
      paintActive();
    });

    document.addEventListener("pointerdown", (event) => {
      if (!menuOpen) return;
      if (menu.contains(event.target) || handle.contains(event.target)) return;
      hideMenu();
    }, true);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menuOpen) {
        event.preventDefault();
        hideMenu();
        plusBtn.focus();
        return;
      }
      if (!menuOpen) return;
      const rows = visibleItems();
      if (!rows.length) return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        const delta = (event.key === "ArrowDown" || event.key === "ArrowRight") ? 1 : -1;
        activeIndex = (activeIndex + delta + rows.length) % rows.length;
        paintActive();
        rows[activeIndex]?.focus();
      } else if (event.key === "Enter") {
        event.preventDefault();
        const id = rows[activeIndex]?.getAttribute("data-insert-id");
        if (id) applyItem(id);
      }
    });

    wrap.addEventListener("mousemove", onMove);
    wrap.addEventListener("mouseleave", onLeave);
    const onScroll = () => {
      if (hover) positionHandle(hover);
      if (menuOpen) positionMenu();
    };
    wrap.addEventListener("scroll", onScroll, true);
    const scrollBound = new WeakSet();
    function watchScroller(el) {
      if (!el || scrollBound.has(el)) return;
      scrollBound.add(el);
      el.addEventListener("scroll", onScroll, { passive: true });
    }

    paintMenu();
    watchScroller(ctx.getPreviewBody());

    return {
      sync() {
        watchScroller(ctx.getPreviewBody());
        watchScroller(ctx.getVditorRoot()?.querySelector(".vditor-ir"));
        if (menuOpen && hover) {
          positionHandle(hover);
          positionMenu();
        } else if (!menuOpen) {
          hideHandle();
        }
      },
      hide() {
        hideMenu();
        hideHandle();
      },
      refreshI18n() {
        paintMenu();
        if (menuOpen) {
          paintActive();
          positionMenu();
        }
      },
    };
  }

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

  /* --- create: MolanEditor.create --- */
  function create(options = {}) {
    const elementId = options.elementId || "vditor";
    const cdn = options.cdn || DEFAULT_CDN;
    const placeholder = options.placeholder || t("placeholder");
    toastEl = document.getElementById("toast");
    patchMermaidLoader();
    preloadLute(cdn);

    const lightbox = initLightbox();
    const vditorRoot = document.getElementById(elementId);
    if (!vditorRoot) {
      return Promise.reject(new Error(`找不到编辑器容器 #${elementId}`));
    }
    if (typeof global.Vditor?.preview !== "function") {
      return Promise.reject(new Error("Vditor 预览未加载"));
    }

    const { wrap, host: previewHost, body: previewBody } = ensureLitePreviewDom(vditorRoot);
    const previewRoot = wrap || vditorRoot;
    let vditor = null;
    let vditorReady = null;
    let markdown = "";
    let previewing = options.defaultPreview !== false;
    const docUndo = [];
    const docRedo = [];

    const readLiveMarkdown = () => {
      if (sourceOpen) {
        const { text } = sourceEls();
        if (text) return text.value;
      }
      if (previewing || !vditor) return markdown;
      try { return vditor.getValue(); } catch (_) { return markdown; }
    };

    const writeLiveMarkdown = (next) => {
      markdown = String(next ?? "");
      if (sourceOpen) {
        const { text } = sourceEls();
        if (text && text.value !== markdown) text.value = markdown;
      }
      if (previewing) {
        const spot = sourceOpen ? captureSourceReadingSpot() : captureReadingSpot(true);
        renderLitePreview(markdown, spot);
      } else if (vditor) {
        try { vditor.setValue(markdown, false); } catch (_) { /* ignore */ }
      }
      try { options.onInput?.(); } catch (_) { /* ignore */ }
    };

    const applyDocChange = (next) => {
      const before = readLiveMarkdown();
      const value = String(next ?? "");
      if (value === before) return false;
      docUndo.push(before);
      if (docUndo.length > 80) docUndo.shift();
      docRedo.length = 0;
      writeLiveMarkdown(value);
      syncHistoryChrome();
      return true;
    };

    const undoDoc = () => {
      if (!docUndo.length) return false;
      docRedo.push(readLiveMarkdown());
      writeLiveMarkdown(docUndo.pop());
      syncHistoryChrome();
      return true;
    };

    const redoDoc = () => {
      if (!docRedo.length) return false;
      docUndo.push(readLiveMarkdown());
      writeLiveMarkdown(docRedo.pop());
      syncHistoryChrome();
      return true;
    };

    const clearDocHistory = () => {
      docUndo.length = 0;
      docRedo.length = 0;
      syncHistoryChrome();
    };
    let previewSeq = 0;
    let muteInput = false;
    const previewListeners = [];
    const previewSelection = bindPreviewSelection({
      getRoot: () => previewBody,
      isPreviewing: () => previewing,
      sectionAsk: options.sectionAsk === true,
    });
    previewSelection.onSelection((focus) => {
      try { options.onSelection?.(focus); } catch (_) { /* ignore */ }
    });
    let blockInsert = { sync() {}, hide() {}, refreshI18n() {} };
    let lastPreviewSource = null;
    const mermaidBridge = {
      getPreviewing: () => previewing,
      onApplyMermaidEdit: null,
    };

    setMermaidMarkdownProvider(() => {
      if (previewing) return markdown;
      if (vditor) {
        try { return vditor.getValue(); } catch (_) { /* ignore */ }
      }
      return markdown;
    });
    bindMermaidInteractions(previewRoot, () => vditor, lightbox, mermaidBridge);
    bindFormatBar(vditorRoot, () => vditor, () => previewing, {
      previewFormat: options.previewFormatBar === true,
      getPreviewRoot: () => previewBody,
      getMarkdown: () => {
        if (sourceOpen) {
          const { text } = sourceEls();
          if (text) return text.value;
        }
        if (previewing || !vditor) return markdown;
        try { return vditor.getValue(); } catch (_) { return markdown; }
      },
      applyMarkdown: (next) => {
        applyDocChange(next);
      },
    });
    bindPreviewTasks(previewBody, {
      isPreviewing: () => previewing,
      getMarkdown: readLiveMarkdown,
      applyMarkdown: applyDocChange,
    });
    bindPreviewCodeCopy();
    watchMermaidPreviews(previewRoot);
    watchTables(previewRoot);
    initFind();
    initType();
    initTheme();
    initHeaderPrefs();
    observeFindTarget(previewRoot);

    const markdownOpts = {
      linkBase: options.linkBase || "",
      toc: false,
      fixTermTypo: false,
      autoSpace: false,
      paragraphBeginningSpace: false,
      listStyle: false,
      sanitize: true,
      codeBlockPreview: true,
      mathBlockPreview: true,
    };
    const lazyLoadImage = `${cdn}/dist/images/img-loading.svg`;

    const notifyPreview = () => {
      previewListeners.forEach((cb) => {
        try { cb(previewing); } catch (_) { /* ignore */ }
      });
      if (!previewing) previewSelection.clear();
      syncHistoryChrome();
    };

    const syncLiteClass = () => {
      wrap?.classList.toggle("is-lite-preview", previewing);
      vditorRoot.classList.toggle("is-preview", previewing);
      if (previewing) hideFormatBar();
      if (outlineIsOpen()) {
        relocateVditorOutline();
        const inner = innerVditor(vditor);
        try { inner?.outline?.render?.(inner); } catch (_) { /* ignore */ }
      }
    };

    const renderLitePreview = (text, spot) => {
      if (!previewBody || typeof global.Vditor?.preview !== "function") return;
      const seq = ++previewSeq;
      const sourceText = text ?? "";
      const restoreScroll = renderLitePreview._scrollTop;
      renderLitePreview._scrollTop = null;
      syncLiteClass();
      const finishPreview = () => {
        if (seq !== previewSeq) return;
        if (spot) keepReadingSpot(true, spot);
        if (findState.open) runFind({ keepIndex: true, reveal: false });
        blockInsert.sync();
        previewSelection.decorate();
        armPreviewTasks(previewBody);
        scheduleOutlineRefresh();
      };
      if (spot && lastPreviewSource === sourceText && previewBody.childElementCount) {
        finishPreview();
        return;
      }
      maybePreloadMermaid(cdn, sourceText);
      const run = () => {
        if (seq !== previewSeq) return;
        global.Vditor.preview(previewBody, sourceText, {
          cdn,
          lazyLoadImage,
          mode: "light",
          hljs: { style: "kimbie-dark", lineNumber: false },
          math: { engine: "KaTeX", inlineDigit: true },
          markdown: markdownOpts,
          after() {
            if (seq !== previewSeq) return;
            lastPreviewSource = sourceText;
            const root = previewHost || previewBody;
            stampMermaidSources(root, sourceText);
            enhanceMermaidPreviews(root);
            scheduleFitTables(root);
            if (typeof restoreScroll === "number" && previewBody) {
              previewBody.scrollTop = restoreScroll;
            }
            finishPreview();
          },
        });
      };
      Promise.resolve(preloadLute(cdn)).then(run, run);
    };

    mermaidBridge.onApplyMermaidEdit = (index, newSource) => {
      if (index < 0) {
        toast(t("cannotEdit"));
        return false;
      }
      const next = replaceMermaidBlock(markdown, index, newSource);
      if (next === markdown) {
        toast(t("cannotEdit"));
        return false;
      }
      docUndo.push(markdown);
      if (docUndo.length > 80) docUndo.shift();
      docRedo.length = 0;
      markdown = next;
      syncHistoryChrome();
      if (previewing) {
        const spot = captureReadingSpot(true);
        renderLitePreview(markdown, spot);
      } else {
        muteInput = true;
        bootEditor().then(() => {
          if (!vditor) return;
          vditor.setValue(markdown, false);
          applyMermaidTheme();
          setTimeout(() => {
            muteInput = false;
            refreshMermaidDiagrams(vditorRoot).finally(() => scheduleFitTables(vditorRoot));
          }, 400);
        });
      }
      try { options.onInput?.(); } catch (_) { /* ignore */ }
      toast(t("mermaidUpdated"));
      return true;
    };

    onThemeChange(() => {
      applyMermaidTheme();
      if (previewing) {
        if (previewBody) renderLitePreview._scrollTop = previewBody.scrollTop;
        renderLitePreview(markdown);
      } else {
        refreshMermaidDiagrams(vditorRoot);
      }
    });

    const bootEditor = () => {
      if (vditor) return Promise.resolve(vditor);
      if (vditorReady) return vditorReady;
      vditorReady = ensureFullVditor(cdn).then(() => new Promise((resolve) => {
        maybePreloadMermaid(cdn, markdown);
        vditor = new global.Vditor(elementId, {
          cdn,
          height: "100%",
          mode: "ir",
          theme: "classic",
          icon: "ant",
          lang: options.lang || (global.MolanI18n && global.MolanI18n.vditorLang()) || "zh_CN",
          placeholder,
          cache: { enable: false },
          undoDelay: 200,
          hint: { delay: 400 },
          toolbar: [
            "bold", "italic", "strike", "inline-code", "link",
            "table",
            "undo", "redo",
            "edit-mode", "outline",
          ],
          toolbarConfig: { pin: true, hide: false },
          preview: {
            delay: 800,
            maxWidth: 2400,
            actions: options.previewActions || [],
            theme: { current: "light" },
            hljs: { style: "kimbie-dark", lineNumber: false },
            math: { engine: "KaTeX", inlineDigit: true },
            markdown: markdownOpts,
            lazyLoadImage,
          },
          counter: {
            enable: false,
          },
          input: () => {
            if (previewing || muteInput) return;
            scheduleFitTables(vditorRoot);
            scheduleOutlineRefresh();
            syncHistoryChrome();
            try {
              options.onInput?.();
            } catch (_) { /* ignore */ }
          },
          ctrlEnter: () => {
            options.onSave?.();
          },
          after: () => {
            applyMermaidTheme();
            watchMermaidIrExpand(vditorRoot, mermaidBridge, lightbox, () => vditor);
            watchMermaidPreviews(previewRoot);
            watchTables(vditorRoot);
            bindTableInsertPicker(vditorRoot, () => vditor);
            bindTableControls(vditorRoot, () => vditor);
            bindFormatBar(vditorRoot, () => vditor, () => previewing, {
              previewFormat: options.previewFormatBar === true,
              getPreviewRoot: () => previewBody,
            });
            bindIrListGuards(vditorRoot, () => vditor, () => previewing);
            relocateVditorOutline();
            revealVditorIcons();
            blockInsert.sync();
            scheduleOutlineRefresh();
            syncHistoryChrome();
            resolve(vditor);
          },
        });
      })).catch((err) => {
        vditorReady = null;
        throw err;
      });
      return vditorReady;
    };

    const pickImage = () => promptImageUrl();

    let pendingInsert = null;

    const releasePreviewOverlay = () => {
      wrap?.classList.remove("is-preparing-edit");
    };

    const applySnippet = async (snippet, hover) => {
      const piece = String(snippet || "").replace(/^\n+/, "").replace(/\n+$/, "");
      if (!piece) return;
      const before = readLiveMarkdown();
      const mermaidReady = maybePreloadMermaid(cdn, piece);
      const anchor = hover?.gapRect || hover?.el?.getBoundingClientRect?.();
      const viewportY = anchor ? anchor.top + Math.min(anchor.height || 26, 28) / 2 : null;
      const previewScrollTop = previewBody?.scrollTop;
      const paintInsertedMermaid = (el) => {
        if (snippetKind(piece) !== "mermaid") return;
        const run = () => {
          captureMermaidSources(el && el.isConnected ? el : vditorRoot);
          refreshMermaidDiagrams(vditorRoot);
        };
        Promise.resolve(mermaidReady).then(run, run);
      };
      const finish = (el) => {
        let node = el;
        if (!node?.isConnected && vditor) {
          node = locateInsertedBlock(irRootOf(vditor), {
            kind: snippetKind(piece),
            snippet: piece,
            focusText: piece.replace(/\s+/g, " ").trim().slice(0, 80),
            focusIndex: hover?.emptyDoc || hover?.index < 0
              ? 0
              : hover?.empty ? (hover.index ?? 0) : (hover?.index ?? 0) + 1,
          });
        }
        pendingInsert = {
          el: node,
          viewportY,
          kind: snippetKind(piece),
          snippet: piece,
          focusText: piece.replace(/\s+/g, " ").trim().slice(0, 80),
          focusIndex: hover?.emptyDoc || hover?.index < 0
            ? 0
            : hover?.empty ? (hover.index ?? 0) : (hover?.index ?? 0) + 1,
        };
        settleInsertedBlock(node, viewportY);
        paintInsertedMermaid(node);
        requestAnimationFrame(() => {
          const root = readingContentRoot(false);
          const live = pendingInsert?.el?.isConnected
            ? pendingInsert.el
            : locateInsertedBlock(root, pendingInsert);
          settleInsertedBlock(live, viewportY);
          paintInsertedMermaid(live);
          if (vditor) {
            try { markdown = vditor.getValue(); } catch (_) { /* ignore */ }
          }
          if (markdown !== before) {
            docUndo.push(before);
            if (docUndo.length > 80) docUndo.shift();
            docRedo.length = 0;
            syncHistoryChrome();
          }
          releasePreviewOverlay();
        });
        try { options.onInput?.(); } catch (_) { /* ignore */ }
      };
      if (previewing || !vditor) {
        try {
          await api.setPreview(false, { holdPreview: true, previewScrollTop });
          finish(insertIrSnippet(vditor, piece, hover));
        } catch (err) {
          releasePreviewOverlay();
          throw err;
        }
        return;
      }
      finish(insertIrSnippet(vditor, piece, hover));
    };

    blockInsert = bindBlockInsert({
      getWrap: () => wrap,
      getPreviewBody: () => previewBody,
      getVditorRoot: () => vditorRoot,
      getPreviewing: () => previewing,
      insertSnippet: applySnippet,
      pickImage,
    });
    activeBlockInsert = blockInsert;

    const api = {
      async setValue(text, clearStack = true) {
        markdown = text ?? "";
        if (clearStack) clearDocHistory();
        if (previewing) {
          renderLitePreview(markdown);
          if (sourceOpen) fillSourceText();
          return;
        }
        muteInput = true;
        await bootEditor();
        vditor.setValue(markdown, clearStack);
        if (sourceOpen) fillSourceText();
        applyMermaidTheme();
        setTimeout(() => {
          muteInput = false;
          refreshMermaidDiagrams(vditorRoot).finally(() => {
            scheduleFitTables(vditorRoot);
            if (findState.open) runFind({ keepIndex: true, reveal: false });
            blockInsert.sync();
            scheduleOutlineRefresh();
          });
        }, 400);
      },
      getValue() {
        if (sourceOpen) {
          const { text } = sourceEls();
          if (text) return text.value;
        }
        if (previewing || !vditor) return markdown;
        clearMolanTableLayout(vditorRoot);
        sweepOrphanIrNodes(irRootOf(vditor));
        const value = vditor.getValue();
        scheduleFitTables(vditorRoot);
        return value;
      },
      focus() {
        if (previewing || !vditor) return;
        const editable = readingContentRoot(false);
        if (editable && typeof editable.focus === "function") {
          try { editable.focus({ preventScroll: true }); return; } catch (_) { /* ignore */ }
        }
        try { vditor.focus(); } catch (_) { /* ignore */ }
      },
      isPreview() {
        return previewing;
      },
      async setPreview(on, opts = {}) {
        const want = Boolean(on);
        if (want === previewing) return previewing;
        let spot = opts.spot || captureReadingSpot(previewing);
        if (want) {
          wrap?.classList.remove("is-preparing-edit");
          hideTablePicker();
          hideTableToolbar(document.getElementById("molanTableToolbar"));
          hideFormatBar();
          if (sourceOpen) {
            commitSourceFromTextarea();
            spot = captureSourceReadingSpot() || spot;
            closeSourceView({ restorePreview: false });
          }
          if (vditor) {
            try { markdown = api.getValue(); } catch (_) { /* ignore */ }
          }
          previewing = true;
          blockInsert.hide();
          if (!opts.skipRender) {
            renderLitePreview(markdown, spot);
          } else {
            syncLiteClass();
          }
          if (sourceOpen) fillSourceText();
          notifyPreview();
          return true;
        }
        if (sourceOpen) {
          commitSourceFromTextarea();
          spot = captureSourceReadingSpot() || spot;
          closeSourceView({ restorePreview: false });
        }
        const hold = Boolean(opts.holdPreview);
        const previewY = typeof opts.previewScrollTop === "number"
          ? opts.previewScrollTop
          : previewBody?.scrollTop;
        previewing = false;
        muteInput = true;
        blockInsert.hide();
        if (hold) wrap?.classList.add("is-preparing-edit");
        syncLiteClass();
        if (hold && previewBody && typeof previewY === "number") previewBody.scrollTop = previewY;
        await bootEditor();
        vditor.setValue(markdown, true);
        applyMermaidTheme();
        if (hold && typeof previewY === "number") {
          const scroller = readingScroller(false);
          if (scroller) scroller.scrollTop = previewY;
        } else if (!hold) {
          keepReadingSpot(false, spot);
        }
        setTimeout(() => {
          muteInput = false;
          refreshMermaidDiagrams(vditorRoot).finally(() => {
            scheduleFitTables(vditorRoot);
            if (findState.open) runFind({ keepIndex: true, reveal: false });
            blockInsert.sync();
            scheduleOutlineRefresh();
            if (pendingInsert) {
              const root = readingContentRoot(false);
              const el = pendingInsert.el?.isConnected
                ? pendingInsert.el
                : locateInsertedBlock(root, pendingInsert);
              settleInsertedBlock(el, pendingInsert.viewportY);
              pendingInsert = null;
            } else if (!hold) {
              restoreReadingSpot(false, spot);
            }
          });
        }, 400);
        notifyPreview();
        return false;
      },
      onPreviewChange(cb) {
        if (typeof cb !== "function") return () => {};
        previewListeners.push(cb);
        return () => {
          const i = previewListeners.indexOf(cb);
          if (i >= 0) previewListeners.splice(i, 1);
        };
      },
      onSelection(cb) {
        return previewSelection.onSelection(cb);
      },
      clearSelection() {
        previewSelection.clear();
      },
      expandToSection() {
        previewSelection.expandToSection();
      },
      getVditor() {
        return vditor;
      },
    };

    ensureEditorChrome({
      getVditor: () => vditor,
      getVditorRoot: () => vditorRoot,
      getPreviewing: () => previewing,
      canUndoDoc: () => docUndo.length > 0,
      canRedoDoc: () => docRedo.length > 0,
      undoDoc,
      redoDoc,
      getMarkdown: () => {
        if (sourceOpen) {
          const { text } = sourceEls();
          if (text) return text.value;
        }
        if (previewing || !vditor) return markdown;
        try { return vditor.getValue(); } catch (_) { return markdown; }
      },
      applyMarkdown: (next, opts = {}) => {
        markdown = String(next ?? "");
        if (opts.live && previewing) {
          const spot = sourceOpen ? captureSourceReadingSpot() : captureReadingSpot(true);
          renderLitePreview(markdown, spot);
        }
      },
      notifyInput: () => {
        try { options.onInput?.(); } catch (_) { /* ignore */ }
      },
      enterEdit: () => api.setPreview(false),
      bootEditor,
      hydrateVditor: async () => {
        await bootEditor();
        if (!vditor) return;
        relocateVditorOutline();
        if (!previewing) return;
        let current = "";
        try { current = vditor.getValue(); } catch (_) { /* ignore */ }
        if (current === markdown) return;
        muteInput = true;
        try { vditor.setValue(markdown, true); } catch (_) { /* ignore */ }
        await new Promise((resolve) => setTimeout(resolve, 220));
        muteInput = false;
      },
    });

    syncLiteClass();
    lastEditorApi = api;
    if (options.defaultPreview === false) {
      return bootEditor().then(() => {
        options.onReady?.(api);
        return api;
      });
    }
    options.onReady?.(api);
    return Promise.resolve(api);
  }

  /* --- export: 导出 PDF/PNG 与 window.MolanEditor --- */
  function applyExportI18n() {
    const btn = document.getElementById("pdfBtn");
    const menu = document.getElementById("exportMenu");
    const label = t("exportAria");
    if (btn) {
      btn.title = label;
      btn.setAttribute("aria-label", label);
    }
    if (menu) menu.setAttribute("aria-label", label);
    menu?.querySelectorAll("[data-export]").forEach((el) => {
      const key = el.getAttribute("data-export") === "png" ? "exportPng" : "exportPdf";
      el.textContent = t(key);
    });
  }

  function exportMenuIsOpen() {
    const menu = document.getElementById("exportMenu");
    return !!(menu && !menu.hidden);
  }

  function openExportMenu() {
    closeType();
    closeHeaderPrefs();
    const menu = document.getElementById("exportMenu");
    const btn = document.getElementById("pdfBtn");
    if (!menu || !btn) return;
    menu.hidden = false;
    btn.setAttribute("aria-expanded", "true");
    btn.classList.add("is-on");
  }

  function closeExportMenu() {
    const menu = document.getElementById("exportMenu");
    const btn = document.getElementById("pdfBtn");
    if (menu) menu.hidden = true;
    btn?.setAttribute("aria-expanded", "false");
    btn?.classList.remove("is-on");
  }

  function toggleExportMenu() {
    if (exportMenuIsOpen()) closeExportMenu();
    else openExportMenu();
  }

  function waitFrame() {
    return new Promise((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(resolve));
    });
  }

  function waitFonts() {
    try {
      if (document.fonts?.ready) {
        return Promise.race([
          document.fonts.ready,
          new Promise((resolve) => setTimeout(resolve, 1500)),
        ]);
      }
    } catch (_) { /* ignore */ }
    return Promise.resolve();
  }

  function printDocumentTitle() {
    const name = (document.getElementById("readerTitle")?.textContent || "").trim();
    if (name && name !== "墨览") return name;
    return document.title || "墨览";
  }

  function isUnsafePrintHost() {
    if (typeof window.acquireVsCodeApi === "function") return true;
    if (isVscodeHost()) return true;
    if (location.protocol === "vscode-webview:") return true;
    const ua = navigator.userAgent || "";
    if (/Cursor\//i.test(ua) || /\bElectron\b/i.test(ua)) return true;
    try {
      const origins = location.ancestorOrigins;
      if (origins) {
        for (let i = 0; i < origins.length; i += 1) {
          if (/vscode|cursor/i.test(origins[i] || "")) return true;
        }
      }
    } catch (_) { /* ignore */ }
    return false;
  }

  /** Mac/iOS 用 ⌘，Windows/Linux 用 Ctrl（与 VS Code / 系统快捷键一致） */
  function isApplePlatform() {
    const platform = navigator.platform || "";
    if (/Mac|iPhone|iPad|iPod/i.test(platform)) return true;
    try {
      if (navigator.userAgentData?.platform === "macOS") return true;
    } catch (_) { /* ignore */ }
    return /Mac OS X|Macintosh/i.test(navigator.userAgent || "");
  }

  function isPrimaryModKey(e, key) {
    if (e.key.toLowerCase() !== key || e.shiftKey || e.altKey) return false;
    if (isApplePlatform()) return e.metaKey && !e.ctrlKey;
    return e.ctrlKey && !e.metaKey;
  }

  function safeFileName(name) {
    return String(name || "document").replace(/[\\/:*?"<>|]+/g, "_").trim() || "document";
  }

  function escapeHtml(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function collectSameOriginCss() {
    const out = [];
    const sheets = document.styleSheets || [];
    for (let i = 0; i < sheets.length; i += 1) {
      try {
        const rules = sheets[i].cssRules;
        if (!rules) continue;
        for (let j = 0; j < rules.length; j += 1) out.push(rules[j].cssText);
      } catch (_) { /* cross-origin */ }
    }
    return out.join("\n");
  }

  function readerCssVars() {
    try {
      const s = getComputedStyle(document.documentElement);
      return [
        "--reader-size",
        "--reader-leading",
        "--reader-gap",
        "--reader-tracking",
        "--reader-font",
        "--reader-heading",
      ].map((key) => `${key}:${s.getPropertyValue(key) || ""};`).join("");
    } catch (_) {
      return "";
    }
  }

  function clonePreviewHtml() {
    const src = document.getElementById("molanPreviewBody") || document.getElementById("molanPreview");
    if (!src) return "";
    const clone = src.cloneNode(true);
    clone.querySelectorAll?.("script, .molan-diagram-toolbar, .molan-block-insert, .molan-insert-menu")
      ?.forEach((el) => el.remove());
    return clone.innerHTML || "";
  }

  function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  function downloadPrintableHtml() {
    const title = printDocumentTitle();
    const body = clonePreviewHtml();
    if (!body.trim()) return false;
    const css = collectSameOriginCss();
    const html = `<!DOCTYPE html>
<html class="molan-print-doc" lang="${document.documentElement.lang || "zh-CN"}" data-theme="xuan">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    html { ${readerCssVars()} }
    html, body { background: #f4efe6; color: #1c1914; margin: 0; }
    body { max-width: 42rem; margin: 24px auto; padding: 0 20px 48px; }
    .molan-diagram-toolbar, .molan-block-insert, .molan-insert-menu { display: none !important; }
    ${css}
    html.molan-print-doc, html.molan-print-doc body {
      height: auto !important;
      max-height: none !important;
      overflow: visible !important;
    }
    html.molan-print-doc .molan-preview,
    html.molan-print-doc .vditor-reset {
      display: block !important;
      height: auto !important;
      max-height: none !important;
      overflow: visible !important;
    }
    @media print {
      html.molan-print-doc body {
        max-width: none !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      html.molan-print-doc pre,
      html.molan-print-doc table,
      html.molan-print-doc blockquote {
        break-inside: auto !important;
        page-break-inside: auto !important;
      }
      html.molan-print-doc pre,
      html.molan-print-doc table,
      html.molan-print-doc .vditor-reset {
        overflow: visible !important;
      }
      html.molan-print-doc .vditor-reset table {
        width: 100% !important;
        max-width: 100% !important;
        table-layout: auto !important;
        border-collapse: collapse !important;
      }
      html.molan-print-doc img,
      html.molan-print-doc .molan-mermaid-shell,
      html.molan-print-doc .molan-mermaid-shell svg {
        max-width: 100% !important;
        max-height: 220mm !important;
        height: auto !important;
        break-inside: avoid !important;
      }
    }
  </style>
</head>
<body>
  <div class="molan-preview vditor-preview">
    <div class="vditor-reset">${body}</div>
  </div>
  <script>
    (function () {
      var ua = navigator.userAgent || "";
      if (/Cursor\\/|Electron\\b/i.test(ua) || typeof window.acquireVsCodeApi === "function") return;
      window.addEventListener("load", function () {
        setTimeout(function () { window.print(); }, 280);
      });
    })();
  </script>
</body>
</html>`;
    downloadBlob(`${safeFileName(title)}.html`, new Blob([html], { type: "text/html;charset=utf-8" }));
    return true;
  }

  function isolatePreviewForPrint() {
    const preview = document.getElementById("molanPreview");
    if (!preview || preview.parentElement === document.body) return () => {};
    const parent = preview.parentNode;
    const next = preview.nextSibling;
    preview.classList.add("is-print-root");
    document.body.appendChild(preview);
    return () => {
      preview.classList.remove("is-print-root");
      if (!parent?.isConnected) return;
      if (next && next.parentNode === parent) parent.insertBefore(preview, next);
      else parent.appendChild(preview);
    };
  }

  function closePrintChrome() {
    try { closeFind(); } catch (_) { /* ignore */ }
    try { closeType(); } catch (_) { /* ignore */ }
    try { closeHeaderPrefs(); } catch (_) { /* ignore */ }
    try { closeSourceView(); } catch (_) { /* ignore */ }
    try { closeOutline(true); } catch (_) { /* ignore */ }
    try { hideFormatBar(); } catch (_) { /* ignore */ }
    try { hideTableToolbar(document.getElementById("molanTableToolbar")); } catch (_) { /* ignore */ }
    try { closeExportMenu(); } catch (_) { /* ignore */ }
    document.getElementById("molanMermaidEditor")?.remove();
    document.getElementById("molanImageUrlMask")?.remove();
    const lightbox = document.getElementById("lightbox");
    if (lightbox) {
      lightbox.classList.remove("open");
      lightbox.setAttribute("aria-hidden", "true");
    }
  }

  function hasMermaidToRestyle() {
    const md = lastEditorApi && typeof lastEditorApi.getValue === "function"
      ? lastEditorApi.getValue()
      : "";
    return markdownHasMermaid(md) || !!document.querySelector(".language-mermaid svg, .molan-mermaid-shell svg");
  }

  async function waitForMermaidReady() {
    if (!hasMermaidToRestyle()) return;
    const deadline = Date.now() + 4000;
    while (Date.now() < deadline) {
      if (global.mermaid && typeof mermaid.render === "function") {
        try { await refreshMermaidDiagrams(mermaidRoot()); } catch (_) { /* ignore */ }
        if (document.querySelector(".language-mermaid svg, .molan-mermaid-shell svg")) return;
      }
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
  }

  function waitAfterPrint() {
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        window.removeEventListener("afterprint", finish);
        try { media.removeEventListener("change", onMedia); } catch (_) {
          try { media.removeListener(onMedia); } catch (__) { /* ignore */ }
        }
        resolve();
      };
      const onMedia = (e) => {
        if (!e.matches) finish();
      };
      const media = window.matchMedia("print");
      try { media.addEventListener("change", onMedia); } catch (_) {
        try { media.addListener(onMedia); } catch (__) { /* ignore */ }
      }
      window.addEventListener("afterprint", finish);
      setTimeout(finish, 120000);
    });
  }

  function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  async function inlineImages(root) {
    const imgs = Array.from(root.querySelectorAll?.("img") || []);
    await Promise.all(imgs.map(async (img) => {
      const src = img.getAttribute("src") || "";
      if (!src || src.startsWith("data:")) return;
      try {
        const res = await fetch(src);
        const blob = await res.blob();
        img.setAttribute("src", await blobToDataUrl(blob));
      } catch (_) { /* leave original src */ }
    }));
    root.querySelectorAll?.("svg")?.forEach((svg) => {
      if (!svg.getAttribute("xmlns")) svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    });
  }

  async function rasterizePreviewPng() {
    const src = document.getElementById("molanPreviewBody") || document.getElementById("molanPreview");
    if (!src) return null;
    const width = Math.max(1, Math.ceil(Math.max(src.scrollWidth, src.clientWidth)));
    const height = Math.max(1, Math.ceil(Math.max(src.scrollHeight, src.clientHeight)));
    const maxEdge = 8192;
    const scale = Math.min(2, maxEdge / width, maxEdge / height);
    const w = Math.max(1, Math.round(width * scale));
    const h = Math.max(1, Math.round(height * scale));

    const clone = src.cloneNode(true);
    clone.querySelectorAll?.("script, .molan-diagram-toolbar, .molan-block-insert, .molan-insert-menu")
      ?.forEach((el) => el.remove());
    await inlineImages(clone);

    const root = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
    root.setAttribute("data-theme", "xuan");
    root.setAttribute("style", `width:${width}px;background:#f4efe6;color:#1c1914;${readerCssVars()}`);
    const style = document.createElementNS("http://www.w3.org/1999/xhtml", "style");
    style.textContent = `${collectSameOriginCss()}
      .molan-diagram-toolbar,.molan-block-insert,.molan-insert-menu{display:none!important}
      .molan-preview,#molanPreviewBody,.vditor-reset{overflow:visible!important;height:auto!important;max-height:none!important}`;
    root.appendChild(style);
    const preview = document.createElementNS("http://www.w3.org/1999/xhtml", "div");
    preview.setAttribute("class", "molan-preview vditor-preview");
    preview.appendChild(clone);
    root.appendChild(preview);

    const xhtml = new XMLSerializer().serializeToString(root);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject x="0" y="0" width="${width}" height="${height}">${xhtml}</foreignObject></svg>`;
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
    try {
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("raster"));
        img.src = url;
      });
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.fillStyle = "#f4efe6";
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(image, 0, 0, w, h);
      return await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function exportPng() {
    if (exportPdfBusy) return;
    const wrap = document.getElementById("editorWrap");
    if (!wrap?.classList.contains("visible")) {
      toast(t("exportPdfEmpty"));
      return;
    }
    exportPdfBusy = true;
    const btn = document.getElementById("pdfBtn");
    if (btn) btn.disabled = true;
    const prevTheme = document.documentElement.getAttribute("data-theme") || readStoredTheme();
    let restoreEdit = false;
    const cleanup = async () => {
      applyTheme(prevTheme, false);
      try { await refreshMermaidDiagrams(mermaidRoot()); } catch (_) { /* ignore */ }
      if (restoreEdit && lastEditorApi?.setPreview) {
        try { await lastEditorApi.setPreview(false); } catch (_) { /* ignore */ }
      }
      exportPdfBusy = false;
      if (btn) btn.disabled = false;
    };
    try {
      closePrintChrome();
      if (lastEditorApi?.isPreview && !lastEditorApi.isPreview()) {
        restoreEdit = true;
        await lastEditorApi.setPreview(true);
      }
      toast(t("exportPngPreparing"));
      if (prevTheme !== "xuan") {
        clearThemeTweakStyles();
        document.documentElement.setAttribute("data-theme", "xuan");
        loadThemeFonts("xuan");
        applyMermaidTheme();
      } else {
        clearThemeTweakStyles();
      }
      await waitForMermaidReady();
      await waitFonts();
      await waitFrame();
      const blob = await rasterizePreviewPng();
      if (!blob) {
        toast(t("exportPngFail"));
        return;
      }
      downloadBlob(`${safeFileName(printDocumentTitle())}.png`, blob);
    } catch (err) {
      console.warn(err);
      toast(t("exportPngFail"));
    } finally {
      await cleanup();
    }
  }

  let exportPdfBusy = false;

  async function exportPdf() {
    if (exportPdfBusy) return;
    const wrap = document.getElementById("editorWrap");
    const hasDoc = !!(wrap && wrap.classList.contains("visible"));
    if (!hasDoc) {
      toast(t("exportPdfEmpty"));
      return;
    }
    const unsafePrint = isUnsafePrintHost();
    if (!unsafePrint && typeof window.print !== "function") {
      toast(t("exportPdfFail"));
      return;
    }

    exportPdfBusy = true;
    const btn = document.getElementById("pdfBtn");
    if (btn) btn.disabled = true;

    const prevTitle = document.title;
    const prevTheme = document.documentElement.getAttribute("data-theme") || readStoredTheme();
    let restoreEdit = false;
    let restorePreview = () => {};

    const cleanup = async () => {
      try { restorePreview(); } catch (_) { /* ignore */ }
      document.documentElement.classList.remove("is-printing");
      document.body.classList.remove("is-printing");
      document.title = prevTitle;
      applyTheme(prevTheme, false);
      try { await refreshMermaidDiagrams(mermaidRoot()); } catch (_) { /* ignore */ }
      if (restoreEdit && lastEditorApi?.setPreview) {
        try { await lastEditorApi.setPreview(false); } catch (_) { /* ignore */ }
      }
      exportPdfBusy = false;
      if (btn) btn.disabled = false;
    };

    try {
      closePrintChrome();
      if (lastEditorApi?.isPreview && !lastEditorApi.isPreview()) {
        restoreEdit = true;
        await lastEditorApi.setPreview(true);
      }

      const needPaper = hasMermaidToRestyle() && prevTheme !== "xuan";
      if (needPaper) toast(t("exportPdfPreparing"));
      clearThemeTweakStyles();
      if (prevTheme !== "xuan") {
        document.documentElement.setAttribute("data-theme", "xuan");
        loadThemeFonts("xuan");
        applyMermaidTheme();
      }
      await waitForMermaidReady();
      await waitFonts();
      await waitFrame();

      if (unsafePrint) {
        if (!downloadPrintableHtml()) {
          toast(t("exportPdfFail"));
          return;
        }
        toast(t("exportPdfUseBrowser"));
        return;
      }

      restorePreview = isolatePreviewForPrint();
      document.title = printDocumentTitle();
      document.documentElement.classList.add("is-printing");
      document.body.classList.add("is-printing");
      await waitFrame();

      const printed = waitAfterPrint();
      window.print();
      await printed;
    } catch (err) {
      console.warn(err);
      toast(t("exportPdfFail"));
    } finally {
      await cleanup();
    }
  }

  global.MolanEditor = {
    DEFAULT_CDN,
    create,
    toast,
    countWords,
    exportPdf,
    exportPng,
    escapeMdAlt,
    applyMermaidTheme,
    refreshMermaidDiagrams,
    refreshI18n,
    enhanceMermaidPreviews,
    watchMermaidPreviews,
    buildTableMarkdown,
    svgToPngBlob,
    copySvgAsPng,
    copyText: copyTextToClipboard,
    mermaidCopySource,
    find: {
      open: openFind,
      close: closeFind,
      next() { moveFind(1); },
      prev() { moveFind(-1); },
    },
    format: {
      bold() { return formatHotkeys.bold(); },
      italic() { return formatHotkeys.italic(); },
      link() { return formatHotkeys.link(); },
    },
    /** 对应顶栏阅读/编辑按钮；扩展经 toggleMode 消息调用 */
    toggleMode() {
      const modeBtn = document.getElementById("modeBtn");
      if (!modeBtn || modeBtn.hidden || modeBtn.disabled) return false;
      modeBtn.click();
      return true;
    },
    type: {
      open: openType,
      close: closeType,
    },
    prefs: {
      open: openHeaderPrefs,
      close: closeHeaderPrefs,
    },
    outline: {
      close: closeOutline,
    },
    source: {
      open: openSourceView,
      close: closeSourceView,
      toggle: toggleSourceView,
      isOpen: () => sourceOpen,
    },
  };

  applyStoredType();
  document.addEventListener("click", (e) => {
    const item = e.target?.closest?.("[data-export]");
    if (item && item.closest("#exportMenu")) {
      e.preventDefault();
      const kind = item.getAttribute("data-export");
      closeExportMenu();
      if (kind === "png") void exportPng();
      else void exportPdf();
      return;
    }
    if (e.target?.closest?.("#pdfBtn")) {
      e.preventDefault();
      toggleExportMenu();
      return;
    }
    if (!e.target?.closest?.(".export-prefs")) closeExportMenu();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && exportMenuIsOpen()) {
      e.preventDefault();
      closeExportMenu();
      document.getElementById("pdfBtn")?.focus();
      return;
    }
    // VS Code/Cursor：⌘/Ctrl+P 是 Quick Open，绝不能当成打印
    if (isUnsafePrintHost()) return;
    if (!isPrimaryModKey(e, "p")) return;
    if (e.defaultPrevented) return;
    if (!document.getElementById("editorWrap")?.classList.contains("visible")) return;
    e.preventDefault();
    void exportPdf();
  });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initFind();
      initType();
      initTheme();
      initHeaderPrefs();
      applyExportI18n();
    });
  } else {
    initFind();
    initType();
    initTheme();
    initHeaderPrefs();
    applyExportI18n();
  }
})(window);
