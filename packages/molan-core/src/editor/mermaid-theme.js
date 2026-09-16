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
