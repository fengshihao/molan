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
