/**
 * 墨览浏览器工作室：选文件夹、侧栏、写回本地文件。
 * 编辑器核心见 molan-editor.js。
 */
(() => {
  const pickBtn = document.getElementById("pickBtn");
  const dirInput = document.getElementById("dirInput");
  const searchInput = document.getElementById("searchInput");
  const fileList = document.getElementById("fileList");
  const welcome = document.getElementById("welcome");
  const welcomePickBtn = document.getElementById("welcomePickBtn");
  const aphorismText = document.getElementById("aphorismText");
  const editorWrap = document.getElementById("editorWrap");
  const readerBody = document.getElementById("readerBody");
  const readerTitle = document.getElementById("readerTitle");
  const statusLeft = document.getElementById("statusLeft");
  const statusRight = document.getElementById("statusRight");
  const saveBtn = document.getElementById("saveBtn");
  const copyBtn = document.getElementById("copyBtn");
  const pdfBtn = document.getElementById("pdfBtn");
  const modeBtn = document.getElementById("modeBtn");
  const findBtn = document.getElementById("molanFindBtn");
  const typeBtn = document.getElementById("typeBtn");
  const reloadBtn = document.getElementById("reloadBtn");

  const toast = (msg) => window.MolanEditor.toast(msg);
  const countWords = (text) => window.MolanEditor.countWords(text);
  const t = (key, vars) => (window.MolanI18n ? window.MolanI18n.t(key, vars) : key);
  const locale = () => (window.MolanI18n ? window.MolanI18n.locale() : "zh-CN");

  const prefsToggle = document.getElementById("prefsToggle");
  const prefsMenu = document.getElementById("prefsMenu");
  let prefsToken = 0;

  function prefsOpen() {
    return !!(prefsMenu && !prefsMenu.hidden && prefsMenu.classList.contains("is-open"));
  }

  function openPrefs() {
    if (!prefsToggle || !prefsMenu) return;
    prefsToken += 1;
    prefsMenu.hidden = false;
    prefsMenu.classList.remove("is-out");
    void prefsMenu.offsetWidth;
    prefsMenu.classList.add("is-open");
    prefsToggle.setAttribute("aria-expanded", "true");
  }

  function closePrefs() {
    if (!prefsToggle || !prefsMenu || prefsMenu.hidden || prefsMenu.classList.contains("is-out")) return;
    const token = prefsToken + 1;
    prefsToken = token;
    prefsMenu.classList.remove("is-open");
    prefsMenu.classList.add("is-out");
    prefsToggle.setAttribute("aria-expanded", "false");
    const finish = () => {
      if (token !== prefsToken) return;
      prefsMenu.hidden = true;
      prefsMenu.classList.remove("is-out");
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finish();
      return;
    }
    prefsMenu.addEventListener("animationend", (e) => {
      if (e.target === prefsMenu) finish();
    }, { once: true });
    window.setTimeout(finish, 280);
  }

  function togglePrefs() {
    if (prefsOpen()) closePrefs();
    else openPrefs();
  }

  prefsToggle?.addEventListener("click", (e) => {
    e.stopPropagation();
    togglePrefs();
  });
  prefsMenu?.addEventListener("click", (e) => e.stopPropagation());
  document.addEventListener("click", () => closePrefs());
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePrefs();
  });

  function isCursorBrowser() {
    const ua = navigator.userAgent || "";
    if (/Cursor\//i.test(ua) || /\bElectron\b/i.test(ua)) return true;
    if (typeof window.acquireVsCodeApi === "function") return true;
    try {
      const origins = location.ancestorOrigins;
      if (origins) {
        for (let i = 0; i < origins.length; i++) {
          if (/vscode|cursor/i.test(origins[i] || "")) return true;
        }
      }
    } catch (_) { /* ignore */ }
    return false;
  }

  function isDebugMode() {
    try {
      const q = new URLSearchParams(location.search);
      if (q.has("debug") && q.get("debug") !== "0") return true;
    } catch (_) { /* ignore */ }
    try {
      return localStorage.getItem("molan-debug") === "1";
    } catch (_) {
      return false;
    }
  }

  const allowCompatPicker = isCursorBrowser() || isDebugMode();

  let files = [];
  let activePath = null;
  let folderName = "";
  let currentFolderId = null;
  let recentFolders = [];
  let folderSource = null; // "fs-access" | "legacy" | "demo"
  let folderHandle = null;
  let reloading = false;
  let dirty = false;
  let baselineText = "";
  let editorApi = null;
  let editorReady = null;
  let pendingOpenPath = null;
  let openSeq = 0;
  let applyingRemote = false;

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  const DB_NAME = "molan-viewer";
  const DB_STORE = "folders";
  const MAX_RECENT = 30;
  const SCAN_MAX_DEPTH = 6;
  const SCAN_MAX_FILES = 500;
  const SCAN_MAX_ENTRIES = 3000;
  const SCAN_SKIP_DIRS = new Set([
    "node_modules", "bower_components", "jspm_packages",
    "dist", "build", "coverage", "vendor", "target",
    "__pycache__", "venv",
  ]);

  function openDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(DB_STORE)) {
          db.createObjectStore(DB_STORE, { keyPath: "id" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbAllFolders() {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readonly");
      const req = tx.objectStore(DB_STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbPutFolder(record) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).put(record);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function idbDeleteFolder(id) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DB_STORE, "readwrite");
      tx.objectStore(DB_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function refreshRecentFolders() {
    try {
      const all = await idbAllFolders();
      recentFolders = all.sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));
    } catch (err) {
      console.warn(err);
      recentFolders = [];
    }
  }

  async function rememberDirectoryHandle(handle) {
    const all = await idbAllFolders();
    let record = null;
    for (const rec of all) {
      if (rec.handle && typeof rec.handle.isSameEntry === "function") {
        try {
          if (await rec.handle.isSameEntry(handle)) {
            record = rec;
            break;
          }
        } catch (_) { /* ignore */ }
      }
    }
    if (!record) {
      record = {
        id: crypto.randomUUID(),
        name: handle.name,
        source: "fs-access",
        handle,
        lastUsed: Date.now(),
        fileCount: files.length || 0,
      };
    } else {
      record.name = handle.name;
      record.handle = handle;
      record.source = "fs-access";
      record.lastUsed = Date.now();
      record.fileCount = files.length || record.fileCount || 0;
    }
    await idbPutFolder(record);
    currentFolderId = record.id;
    await pruneRecentFolders();
    await refreshRecentFolders();
    return record;
  }

  async function rememberLegacyFolder(name, fileCount) {
    const id = "legacy:" + name;
    const all = await idbAllFolders();
    const existing = all.find((r) => r.id === id) || {
      id,
      name,
      source: "legacy",
      handle: null,
    };
    existing.lastUsed = Date.now();
    existing.fileCount = fileCount;
    existing.name = name;
    await idbPutFolder(existing);
    currentFolderId = existing.id;
    await pruneRecentFolders();
    await refreshRecentFolders();
  }

  async function pruneRecentFolders() {
    const all = await idbAllFolders();
    if (all.length <= MAX_RECENT) return;
    const sorted = all.sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));
    await Promise.all(sorted.slice(MAX_RECENT).map((r) => idbDeleteFolder(r.id)));
  }

  async function touchCurrentFolder(fileCount) {
    if (!currentFolderId) return;
    try {
      const all = await idbAllFolders();
      const rec = all.find((r) => r.id === currentFolderId);
      if (!rec) return;
      rec.lastUsed = Date.now();
      if (typeof fileCount === "number") rec.fileCount = fileCount;
      await idbPutFolder(rec);
      await refreshRecentFolders();
    } catch (err) {
      console.warn(err);
    }
  }

  async function ensurePermission(handle, mode = "readwrite") {
    let state = "prompt";
    if (typeof handle.queryPermission === "function") {
      state = await handle.queryPermission({ mode });
    }
    if (state !== "granted" && typeof handle.requestPermission === "function") {
      state = await handle.requestPermission({ mode });
    }
    return state === "granted";
  }

  async function reopenRecentFolder(id) {
    const rec = recentFolders.find((r) => r.id === id) || (await idbAllFolders()).find((r) => r.id === id);
    if (!rec) {
      toast(t("recordMissing"));
      return;
    }
    if (rec.handle) {
      try {
        const ok = await ensurePermission(rec.handle, "readwrite");
        if (!ok) {
          toast(t("needPermission"));
          return;
        }
        statusLeft.textContent = t("openingName", { name: rec.name });
        await loadFromDirectoryHandle(rec.handle);
        return;
      } catch (err) {
        console.warn(err);
        toast(t("cannotOpenDirect"));
        return;
      }
    }
    toast(t("needReselect", { name: rec.name }));
    openCompatPicker();
  }

  function unloadLibrary() {
    files = [];
    folderName = "";
    folderSource = null;
    folderHandle = null;
    currentFolderId = null;
    if (searchInput?.value) searchInput.value = "";
    statusLeft.textContent = "";
    statusRight.textContent = "";
    showWelcome();
  }

  let removingFolder = false;

  async function removeRecentFolder(id, e) {
    e?.stopPropagation?.();
    if (removingFolder) return;
    const closingCurrent = currentFolderId === id;
    if (closingCurrent && !confirmDiscardIfDirty()) return;
    removingFolder = true;
    const row = e?.target?.closest?.(".recent-row")
      || fileList.querySelector(`[data-remove-recent="${CSS.escape(id)}"]`)?.closest(".recent-row");
    const docs = closingCurrent ? fileList.querySelector(".doc-list") : null;
    try {
      await Promise.all([
        idbDeleteFolder(id),
        animateLeave(row),
        animateLeave(docs),
      ]);
      if (closingCurrent) unloadLibrary();
      await refreshRecentFolders();
      renderSidebarList();
      toast(t("removedRecent"));
    } finally {
      removingFolder = false;
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function isMarkdown(name) {
    return /\.(md|markdown|mdx|mdown)$/i.test(name);
  }

  function dirname(p) {
    const n = String(p || "").replace(/\\/g, "/");
    const i = n.lastIndexOf("/");
    return i === -1 ? "" : n.slice(0, i);
  }

  function decodeHrefPart(s) {
    try {
      return decodeURIComponent(s);
    } catch (_) {
      return s;
    }
  }

  function resolveRelativePath(fromFile, rel) {
    let raw = decodeHrefPart(String(rel || "").trim()).replace(/\\/g, "/");
    raw = raw.replace(/^\.\//, "").replace(/^\/+/, "");
    const base = dirname(fromFile);
    const parts = (base ? base.split("/") : []).concat(raw.split("/"));
    const out = [];
    for (const part of parts) {
      if (!part || part === ".") continue;
      if (part === "..") {
        if (out.length) out.pop();
        continue;
      }
      out.push(part);
    }
    return out.join("/");
  }

  function findLocalMarkdown(resolved) {
    const norm = String(resolved || "").replace(/\\/g, "/").replace(/^\.\//, "");
    if (!norm) return null;
    const leaf = norm.split("/").pop() || "";
    if (!isMarkdown(leaf)) return null;
    const lower = norm.toLowerCase();
    const exact = files.find((f) => f.path === norm)
      || files.find((f) => f.path.replace(/\\/g, "/").toLowerCase() === lower);
    if (exact) return exact;
    const dir = dirname(activePath || "");
    const sameDir = files.filter((f) => dirname(f.path) === dir && f.name.toLowerCase() === leaf.toLowerCase());
    if (sameDir.length === 1) return sameDir[0];
    const unique = files.filter((f) => f.name.toLowerCase() === leaf.toLowerCase());
    return unique.length === 1 ? unique[0] : null;
  }

  function studioHref(href) {
    const raw = String(href || "").trim();
    if (!raw || /^(mailto:|tel:|javascript:)/i.test(raw)) return raw;
    if (!/^https?:/i.test(raw)) return raw;
    try {
      const u = new URL(raw);
      if (u.origin === window.location.origin) {
        const leaf = decodeHrefPart(u.pathname.split("/").pop() || "");
        if (isMarkdown(leaf)) return leaf + (u.hash || "");
      }
    } catch (_) { /* keep original */ }
    return raw;
  }

  function parseEditorHref(href) {
    const raw = studioHref(href);
    if (!raw || /^javascript:/i.test(raw)) return { kind: "ignore" };
    if (/^(https?:|mailto:|tel:)/i.test(raw)) return { kind: "external", href: raw };
    if (raw.startsWith("#")) return { kind: "hash", hash: raw.slice(1) };
    const hashIdx = raw.indexOf("#");
    const pathAndQuery = hashIdx >= 0 ? raw.slice(0, hashIdx) : raw;
    const hash = hashIdx >= 0 ? raw.slice(hashIdx + 1) : "";
    const qIdx = pathAndQuery.indexOf("?");
    const filePart = qIdx >= 0 ? pathAndQuery.slice(0, qIdx) : pathAndQuery;
    return { kind: "local", rel: filePart, hash };
  }

  function hrefFromClick(e) {
    const a = e.target.closest?.("a[href]");
    if (a && editorWrap?.contains(a)) return a.getAttribute("href") || "";
    return "";
  }

  function scrollToDocHash(hash) {
    const id = decodeHrefPart(String(hash || "").replace(/^#/, ""));
    if (!id || !editorWrap) return;
    const esc = (window.CSS && CSS.escape) ? CSS.escape(id) : id.replace(/"/g, '\\"');
    const el = editorWrap.querySelector(`#${esc}`)
      || editorWrap.querySelector(`[name="${esc}"]`)
      || [...editorWrap.querySelectorAll("h1,h2,h3,h4,h5,h6")].find((h) => {
        const text = (h.textContent || "").trim();
        return h.id === id || text === id || text === id.replace(/-/g, " ");
      });
    el?.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }

  async function openLocalMarkdownLink(rel, hash) {
    const resolved = resolveRelativePath(activePath || "", rel);
    const file = findLocalMarkdown(resolved) || findLocalMarkdown(decodeHrefPart(rel).replace(/^\.\//, ""));
    if (!file) {
      toast(t("linkNotInFolder", { name: decodeHrefPart(rel).split("/").pop() || rel }));
      return;
    }
    if (file.path !== activePath) {
      await openFile(file.path);
      if (activePath !== file.path) return;
    }
    if (hash) {
      await wait(80);
      scrollToDocHash(hash);
    }
  }

  function canWriteActive() {
    const file = files.find((f) => f.path === activePath);
    return !!(file && file.handle);
  }

  function syncActiveDirtyMark() {
    if (!activePath) return;
    const btn = fileList.querySelector(`.file-item[data-path="${CSS.escape(activePath)}"]`);
    const nameEl = btn?.querySelector(".file-name");
    if (!nameEl) return;
    const file = files.find((f) => f.path === activePath);
    if (!file) return;
    const next = dirty ? `${file.name} ·` : file.name;
    if (nameEl.textContent !== next) nameEl.textContent = next;
  }

  function prefersReducedMotion() {
    try {
      return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch (_) {
      return false;
    }
  }

  function animateLeave(el) {
    if (!el) return Promise.resolve();
    if (prefersReducedMotion()) {
      el.classList.add("is-leaving");
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        el.removeEventListener("transitionend", onEnd);
        resolve();
      };
      const onEnd = (ev) => {
        if (ev.target !== el) return;
        finish();
      };
      el.addEventListener("transitionend", onEnd);
      void el.offsetHeight;
      el.classList.add("is-leaving");
      setTimeout(finish, 680);
    });
  }

  function replayMotion(el, className) {
    if (!el || prefersReducedMotion()) return;
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
  }

  function labelAction(el, label) {
    if (!el || label == null) return;
    el.title = label;
    el.setAttribute("aria-label", label);
  }

  function isCompatSaveMode() {
    return folderSource === "legacy";
  }

  function syncSaveButton() {
    if (!saveBtn) return;
    const show = !!(activePath && dirty && isCompatSaveMode());
    saveBtn.hidden = !show;
    saveBtn.disabled = !show;
    saveBtn.classList.toggle("is-dirty", show);
    if (!show) return;
    saveBtn.dataset.kind = "download";
    labelAction(saveBtn, t("saveDownloadHint"));
  }

  function setDirty(next) {
    dirty = !!next;
    if (activePath && isCompatSaveMode()) {
      saveBtn.dataset.kind = "download";
      labelAction(saveBtn, t("saveDownloadHint"));
    }
    syncSaveButton();
    syncActiveDirtyMark();
    syncModeButton();
  }

  function syncHeaderDocButtons(show) {
    const source = document.getElementById("sourceViewPrefs");
    if (source) source.hidden = !show;
    if (!show) window.MolanEditor?.source?.close?.();
    const history = document.getElementById("historyPrefs");
    if (history) history.hidden = !show;
    const outline = document.getElementById("outlinePrefs");
    if (!outline) return;
    if (!show) window.MolanEditor?.outline?.close?.(true);
    outline.hidden = !show;
  }

  function syncModeButton() {
    if (!modeBtn) return;
    const preview = !!(editorApi?.isPreview?.());
    modeBtn.classList.toggle("is-preview", preview);
    labelAction(modeBtn, preview ? t("modeEdit") : t("modePreview"));
    modeBtn.hidden = !activePath;
    if (!activePath) {
      syncSaveButton();
      copyBtn.hidden = true;
      if (pdfBtn) pdfBtn.hidden = true;
      if (findBtn) findBtn.hidden = true;
      if (typeBtn) typeBtn.hidden = true;
      if (reloadBtn) reloadBtn.hidden = true;
      syncHeaderDocButtons(false);
      const formatBar = document.getElementById("molanFormatBar");
      if (formatBar) formatBar.hidden = true;
      return;
    }
    copyBtn.hidden = false;
    if (pdfBtn) pdfBtn.hidden = false;
    if (findBtn) findBtn.hidden = false;
    if (typeBtn) typeBtn.hidden = false;
    if (reloadBtn) reloadBtn.hidden = false;
    syncHeaderDocButtons(true);
    syncSaveButton();
  }

  function paintStatus(text) {
    const modeHint = folderSource === "legacy" ? t("downloadToDisk") : (dirty ? t("unsaved") : t("synced"));
    statusRight.textContent = `${t("wordCount", { n: countWords(text) })} · ${modeHint}`;
  }

  function updateStatusRight() {
    if (!activePath || !editorApi) {
      statusRight.textContent = folderSource === "legacy"
        ? t("compatImport")
        : (folderName || t("localOffline"));
      return;
    }
    try {
      paintStatus(editorApi.getValue());
    } catch (_) {
      statusRight.textContent = dirty ? t("unsaved") : t("localOffline");
    }
  }

  let editorIdleTimer = 0;
  function scheduleEditorIdleWork() {
    clearTimeout(editorIdleTimer);
    editorIdleTimer = setTimeout(() => {
      if (applyingRemote || !editorApi || !activePath) return;
      try {
        const text = editorApi.getValue();
        const nextDirty = text !== baselineText;
        if (nextDirty !== dirty) setDirty(nextDirty);
        paintStatus(text);
      } catch (_) { /* ignore */ }
    }, 180);
  }

  function onEditorInput() {
    if (applyingRemote || !activePath) return;
    scheduleEditorIdleWork();
  }

  async function ensureFileText(entry) {
    if (entry.handle) {
      const file = await entry.handle.getFile();
      entry.text = await file.text();
      entry.size = file.size;
      return entry.text;
    }
    if (entry.text != null) return entry.text;
    if (entry.fileRef) {
      entry.text = await entry.fileRef.text();
      return entry.text;
    }
    entry.text = "";
    return entry.text;
  }

  function isSkippedDirName(name) {
    const n = String(name || "");
    if (!n || n === "." || n === "..") return true;
    if (n.startsWith(".")) return true;
    return SCAN_SKIP_DIRS.has(n.toLowerCase());
  }

  function pathHasSkippedDir(relPath, ignoreFirst) {
    const parts = String(relPath || "").replace(/\\/g, "/").split("/");
    const end = parts.length - 1;
    const start = ignoreFirst ? 1 : 0;
    for (let i = start; i < end; i++) {
      if (isSkippedDirName(parts[i])) return true;
    }
    return false;
  }

  function relativeDirDepth(relPath) {
    const parts = String(relPath || "").replace(/\\/g, "/").split("/").filter(Boolean);
    return Math.max(0, parts.length - 2);
  }

  function noteScanLimits(truncated) {
    if (!truncated) return;
    toast(t("scanLimited", { depth: SCAN_MAX_DEPTH, max: SCAN_MAX_FILES }));
  }

  async function collectFromDirectoryHandle(rootHandle) {
    const out = [];
    let entries = 0;
    let truncated = false;

    async function walk(dirHandle, base, depth) {
      if (out.length >= SCAN_MAX_FILES || entries >= SCAN_MAX_ENTRIES) {
        truncated = true;
        return;
      }
      for await (const [name, handle] of dirHandle.entries()) {
        if (out.length >= SCAN_MAX_FILES || entries >= SCAN_MAX_ENTRIES) {
          truncated = true;
          return;
        }
        entries += 1;
        if (entries % 40 === 0) await wait(0);
        const path = base ? `${base}/${name}` : name;
        if (handle.kind === "directory") {
          if (isSkippedDirName(name)) continue;
          if (depth >= SCAN_MAX_DEPTH) {
            truncated = true;
            continue;
          }
          await walk(handle, path, depth + 1);
        } else if (handle.kind === "file" && isMarkdown(name)) {
          out.push({ path, name, dir: base || ".", size: 0, handle });
        }
      }
    }

    await walk(rootHandle, "", 0);
    return { files: out, truncated };
  }

  async function loadFromDirectoryHandle(handle) {
    folderHandle = handle;
    folderName = handle.name;
    folderSource = "fs-access";
    statusLeft.textContent = t("scanning");
    const collected = await collectFromDirectoryHandle(handle);
    setFiles(collected.files);
    noteScanLimits(collected.truncated);
    try {
      await rememberDirectoryHandle(handle);
      await touchCurrentFolder(collected.files.length);
      renderSidebarList();
    } catch (err) {
      console.warn(err);
    }
  }

  async function loadFromFileList(fileListObj) {
    const all = fileListObj || [];
    const mdFiles = [];
    let truncated = false;
    let seen = 0;
    const total = all.length || 0;
    statusLeft.textContent = t("scanning");
    for (let i = 0; i < total; i++) {
      if (i % 400 === 0) await wait(0);
      const f = all[i];
      const rel = f.webkitRelativePath || f.name || "";
      if (pathHasSkippedDir(rel, true)) continue;
      seen += 1;
      if (seen > SCAN_MAX_ENTRIES) {
        truncated = true;
        break;
      }
      const leaf = rel.split("/").pop() || f.name;
      if (!isMarkdown(leaf)) continue;
      if (relativeDirDepth(rel) > SCAN_MAX_DEPTH) {
        truncated = true;
        continue;
      }
      if (mdFiles.length >= SCAN_MAX_FILES) {
        truncated = true;
        break;
      }
      mdFiles.push(f);
    }
    if (!mdFiles.length) {
      toast(all.length ? t("noMarkdown") : t("noFilesSelected"));
      statusLeft.textContent = t("noMarkdownRead");
      noteScanLimits(truncated);
      return;
    }
    const firstRel = mdFiles[0].webkitRelativePath || mdFiles[0].name;
    folderName = firstRel.split("/")[0] || t("folderLabel");
    folderSource = "legacy";
    folderHandle = null;
    const list = mdFiles.map((file) => {
      const rel = file.webkitRelativePath || file.name;
      const parts = rel.split("/");
      return {
        path: rel,
        name: parts[parts.length - 1],
        dir: parts.slice(0, -1).join("/") || ".",
        size: file.size,
        fileRef: file,
      };
    });
    setFiles(list);
    rememberLegacyFolder(folderName, list.length)
      .then(() => renderSidebarList())
      .catch((err) => console.warn(err));
    if (truncated) noteScanLimits(true);
    else toast(t("compatEditable"));
  }

  function openCompatPicker() {
    dirInput.value = "";
    statusLeft.textContent = t("pickInDialog");
    dirInput.click();
  }

  function wantsDemo() {
    try {
      const q = new URLSearchParams(location.search);
      if (q.has("demo") && q.get("demo") !== "0") return true;
    } catch (_) { /* ignore */ }
    return false;
  }

  const SAMPLE_DOC = "实例演示.md";

  async function fetchSampleFiles() {
    const folder = t("demoFolder");
    const res = await fetch("./demo/" + encodeURIComponent(SAMPLE_DOC));
    if (!res.ok) throw new Error(SAMPLE_DOC);
    const text = await res.text();
    return {
      folder,
      list: [{
        path: `${folder}/${SAMPLE_DOC}`,
        name: SAMPLE_DOC,
        dir: folder,
        size: new Blob([text]).size,
        text,
      }],
    };
  }

  async function seedSampleLibrary() {
    if (files.length) return;
    try {
      const { folder, list } = await fetchSampleFiles();
      folderName = folder;
      folderSource = "demo";
      folderHandle = null;
      currentFolderId = null;
      files = list;
      renderSidebarList();
    } catch (err) {
      console.warn(err);
    }
  }

  async function loadDemoLibrary() {
    if (!confirmDiscardIfDirty()) return;
    await seedSampleLibrary();
    const path = files[0]?.path;
    if (path) openFile(path);
  }

  function setFiles(list, openPath) {
    files = list.sort((a, b) => a.path.localeCompare(b.path, locale()));
    searchInput.value = "";
    statusLeft.textContent = files.length ? t("indexed", { n: files.length }) : t("noMarkdown");
    statusRight.textContent = folderSource === "legacy"
      ? t("compatImport")
      : (folderName || t("localOffline"));
    dirty = false;
    baselineText = "";
    activePath = null;
    openSeq += 1;
    applyingRemote = false;
    renderSidebarList();
    const preferred = openPath && files.some((f) => f.path === openPath) ? openPath : null;
    if (preferred) openFile(preferred);
    else if (files.length) openFile(files[0].path);
    else {
      showWelcome();
      toast(t("noDocsInFolder"));
    }
  }

  async function reloadLibrary() {
    if (reloading) return;
    if (folderSource !== "fs-access" || !folderHandle) {
      toast(t("reloadNeedReselect"));
      return;
    }
    if (!confirmDiscardIfDirty()) return;
    reloading = true;
    reloadBtn?.classList.add("is-busy");
    if (reloadBtn) reloadBtn.disabled = true;
    const keepPath = activePath;
    statusLeft.textContent = t("reloading");
    try {
      const ok = await ensurePermission(folderHandle, "readwrite");
      if (!ok) {
        toast(t("needPermission"));
        return;
      }
      const collected = await collectFromDirectoryHandle(folderHandle);
      files = collected.files.sort((a, b) => a.path.localeCompare(b.path, locale()));
      statusRight.textContent = folderName || t("localOffline");
      renderSidebarList();
      try {
        await rememberDirectoryHandle(folderHandle);
        await touchCurrentFolder(files.length);
      } catch (err) {
        console.warn(err);
      }
      if (keepPath && files.some((f) => f.path === keepPath)) {
        await openFile(keepPath, { force: true });
      } else if (keepPath) {
        toast(t("reloadFileGone", { name: keepPath.split("/").pop() }));
        if (files.length) await openFile(files[0].path, { force: true });
        else showWelcome();
      } else if (files.length) {
        await openFile(files[0].path, { force: true });
      } else {
        showWelcome();
        toast(t("noDocsInFolder"));
        noteScanLimits(collected.truncated);
        return;
      }
      toast(t("reloaded", { n: files.length }));
      noteScanLimits(collected.truncated);
    } catch (err) {
      console.warn(err);
      statusLeft.textContent = t("reloadFail");
      toast(t("reloadFail"));
    } finally {
      reloading = false;
      reloadBtn?.classList.remove("is-busy");
      if (reloadBtn) reloadBtn.disabled = false;
    }
  }

  function syncLibraryVisibility() {
    const hasLibrary = files.length > 0 || recentFolders.length > 0;
    const showSearch = files.length > 5;
    const sidebar = document.querySelector(".sidebar");
    const toolbar = document.querySelector(".toolbar");
    const searchWrap = searchInput?.closest(".search-wrap");
    sidebar?.classList.toggle("is-compact", !hasLibrary);
    toolbar?.classList.toggle("has-search", showSearch);
    if (fileList) fileList.hidden = !hasLibrary;
    if (searchWrap) {
      if (!showSearch && searchInput?.value) searchInput.value = "";
      if (!showSearch && document.activeElement === searchInput) searchInput.blur();
      searchWrap.setAttribute("aria-hidden", showSearch ? "false" : "true");
      if (searchInput) searchInput.tabIndex = showSearch ? 0 : -1;
    }
  }

  const PICK_HINT_KEY = "molan-pick-hint-seen";

  function pickHintSeen() {
    try { return localStorage.getItem(PICK_HINT_KEY) === "1"; } catch (_) { return false; }
  }

  function markPickHintSeen() {
    try { localStorage.setItem(PICK_HINT_KEY, "1"); } catch (_) { /* ignore */ }
    pickBtn.classList.remove("is-hint");
  }

  function syncOpenHint() {
    const idle = !files.length && recentFolders.length === 0 && !pickHintSeen();
    pickBtn.classList.toggle("is-hint", idle);
  }

  const ICON_FOLDER = `<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M2.25 4.75A1.5 1.5 0 0 1 3.75 3.25h2.2c.28 0 .55.11.75.31L8 4.9h4.25a1.5 1.5 0 0 1 1.5 1.5v5.85a1.5 1.5 0 0 1-1.5 1.5H3.75a1.5 1.5 0 0 1-1.5-1.5V4.75Z" stroke="currentColor" stroke-width="1.35" stroke-linejoin="round"/></svg>`;
  const ICON_DOC = `<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4.25 2.5h5.2L11.75 5v8.5h-7.5V2.5Z" stroke="currentColor" stroke-width="1.35" stroke-linejoin="round"/><path d="M9.45 2.5V5h2.3" stroke="currentColor" stroke-width="1.35" stroke-linejoin="round"/></svg>`;

  function renderRecentSection(q) {
    const matched = recentFolders.filter((r) => !q || (r.name || "").toLowerCase().includes(q));
    if (!matched.length) return "";
    const writeHint = files.length
      ? (folderSource === "fs-access" ? t("canWriteBack") : t("willDownload"))
      : "";
    let html = `<div class="recent-list">`;
    for (const r of matched) {
      const current = r.id === currentFolderId;
      const n = current && files.length ? files.length : r.fileCount;
      const count = typeof n === "number" ? t("docsCount", { n }) : "";
      const name = r.name || t("unnamed");
      const title = current && writeHint ? `${name} · ${writeHint}` : name;
      html += `<div class="recent-row">
        <button class="recent-item${current ? " is-current" : ""}" type="button" data-recent-id="${escapeHtml(r.id)}" title="${escapeHtml(title)}">
          <span class="file-icon file-icon-folder" aria-hidden="true">${ICON_FOLDER}</span>
          <span class="file-name">${escapeHtml(name)}</span>
          ${count ? `<span class="file-count">${escapeHtml(count)}</span>` : ""}
        </button>
        <button class="recent-remove" type="button" data-remove-recent="${escapeHtml(r.id)}" title="${escapeHtml(t("removeRecord"))}">×</button>
      </div>`;
    }
    html += `</div>`;
    return html;
  }

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function renderSidebarList() {
    syncLibraryVisibility();
    syncOpenHint();
    const q = searchInput.value.trim().toLowerCase();
    const recentHtml = renderRecentSection(q);
    const filtered = files.filter((f) => !q || f.path.toLowerCase().includes(q) || f.name.toLowerCase().includes(q));

    if (!files.length) {
      fileList.innerHTML = recentHtml;
      return;
    }

    let html = recentHtml;
    if (!filtered.length) {
      html += `<div class="empty-side"><p>${t("noMatch", { q: escapeHtml(searchInput.value) })}</p></div>`;
      fileList.innerHTML = html;
      return;
    }

    const groups = new Map();
    for (const f of filtered) {
      const key = f.dir === "." || f.dir === folderName
        ? t("rootDir")
        : f.dir.replace(new RegExp("^" + escapeRegExp(folderName) + "/?"), "") || t("rootDir");
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(f);
    }
    html += `<div class="doc-list"><div class="doc-list-body">`;
    for (const [group, items] of groups) {
      if (group !== t("rootDir")) html += `<div class="file-group-title">${escapeHtml(group)}</div>`;
      for (const f of items) {
        const dirtyMark = f.path === activePath && dirty ? " ·" : "";
        html += `<button class="file-item${f.path === activePath ? " active" : ""}" type="button" data-path="${escapeHtml(f.path)}" title="${escapeHtml(f.path)}"><span class="file-icon file-icon-doc" aria-hidden="true">${ICON_DOC}</span><span class="file-name">${escapeHtml(f.name)}${dirtyMark}</span></button>`;
      }
    }
    html += `</div></div>`;
    fileList.innerHTML = html;
  }

  function setActiveFileItem(path) {
    fileList.querySelectorAll(".file-item.active").forEach((el) => el.classList.remove("active"));
    const next = fileList.querySelector(`.file-item[data-path="${CSS.escape(path)}"]`);
    if (next) next.classList.add("active");
  }

  function showWelcome() {
    if (welcome) welcome.hidden = false;
    document.querySelector(".main")?.classList.add("is-idle");
    readerBody?.classList.remove("is-editing");
    editorWrap.classList.remove("visible");
    syncSaveButton();
    copyBtn.hidden = true;
    if (pdfBtn) pdfBtn.hidden = true;
    if (modeBtn) modeBtn.hidden = true;
    if (findBtn) findBtn.hidden = true;
    if (typeBtn) typeBtn.hidden = true;
    if (reloadBtn) reloadBtn.hidden = true;
    syncHeaderDocButtons(false);
    const formatBar = document.getElementById("molanFormatBar");
    if (formatBar) formatBar.hidden = true;
    readerTitle.textContent = "墨览";
    activePath = null;
    dirty = false;
    baselineText = "";
    applyingRemote = false;
    clearTimeout(editorIdleTimer);
    window.MolanEditor.type?.close();
    syncOpenHint();
    scheduleAphorismCycle();
  }

  function aphorismStorageKeys() {
    const lang = window.MolanI18n ? window.MolanI18n.getLang() : "zh";
    return {
      order: "molan-aphorism-order:" + lang,
      pos: "molan-aphorism-pos:" + lang,
    };
  }
  const APHORISM_HOLD_MS = 10000;
  let aphorismTimer = 0;
  let aphorismCycle = 0;
  let inkSegmenter = null;
  try {
    inkSegmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  } catch (_) { /* ignore */ }

  function welcomeVisible() {
    return !!(welcome && !welcome.hidden && !readerBody?.classList.contains("is-editing") && !document.hidden);
  }

  function stopAphorismCycle() {
    window.clearTimeout(aphorismTimer);
    window.clearTimeout(aphorismCycle);
  }

  function scheduleAphorismCycle() {
    window.clearTimeout(aphorismCycle);
    if (!welcomeVisible()) return;
    aphorismCycle = window.setTimeout(() => {
      if (!welcomeVisible()) return;
      advanceAphorism(true);
    }, APHORISM_HOLD_MS);
  }

  function aphorismList() {
    const lang = window.MolanI18n ? window.MolanI18n.getLang() : "zh";
    const list = window.MolanAphorisms ? window.MolanAphorisms.list(lang) : [];
    return list.length ? list : [];
  }

  function shuffleOrder(n, avoidFirst) {
    const arr = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    if (n > 1 && avoidFirst != null && arr[0] === avoidFirst) {
      const k = 1 + Math.floor(Math.random() * (n - 1));
      [arr[0], arr[k]] = [arr[k], arr[0]];
    }
    return arr;
  }

  function readAphorismState(n) {
    let order = [];
    let pos = 0;
    try {
      const keys = aphorismStorageKeys();
      order = JSON.parse(localStorage.getItem(keys.order) || "[]");
      pos = Number(localStorage.getItem(keys.pos) || "0");
    } catch (_) { /* ignore */ }
    const valid = Array.isArray(order) && order.length === n && order.every((i) => i >= 0 && i < n);
    if (!valid) {
      const last = Array.isArray(order) && order.length ? order[Math.min(Math.max(pos, 0), order.length - 1)] : null;
      order = shuffleOrder(n, last);
      pos = 0;
    } else if (!Number.isFinite(pos) || pos < 0 || pos >= order.length) {
      pos = 0;
    }
    return { order, pos };
  }

  function writeAphorismState(order, pos) {
    try {
      const keys = aphorismStorageKeys();
      localStorage.setItem(keys.order, JSON.stringify(order));
      localStorage.setItem(keys.pos, String(pos));
    } catch (_) { /* ignore */ }
  }

  function prefersReducedMotion() {
    return window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function isVerticalAphorism() {
    const lang = document.documentElement.lang || "";
    return lang === "zh-CN" || lang === "zh-TW" || lang === "ja";
  }

  function inkChars(text) {
    if (inkSegmenter) {
      return Array.from(inkSegmenter.segment(text), (s) => s.segment);
    }
    return Array.from(text);
  }

  function columnCount(n) {
    if (n <= 5) return 1;
    if (n <= 19) return 2;
    if (n <= 32) return 3;
    return 4;
  }

  function splitColumns(parts, cols) {
    const sizes = [];
    const base = Math.floor(parts.length / cols);
    let extra = parts.length % cols;
    for (let c = 0; c < cols; c++) {
      sizes.push(base + (extra > 0 ? 1 : 0));
      if (extra > 0) extra--;
    }
    const columns = [];
    let i = 0;
    for (const size of sizes) {
      columns.push(parts.slice(i, i + size));
      i += size;
    }
    return columns;
  }

  function columnStagger(cols, index, seed) {
    const patterns = {
      2: [0.12, 1.42],
      3: [0.28, 1.58, 0.62],
      4: [0.18, 1.48, 0.52, 1.12],
    };
    const row = patterns[cols] || [0.2, 1.2];
    const wobble = ((seed + index * 19) % 9) * 0.07;
    return `${((row[index] || 0.4) + wobble).toFixed(2)}em`;
  }

  function fillInkInline(el, parts) {
    const frag = document.createDocumentFragment();
    parts.forEach((ch, i) => {
      const span = document.createElement("span");
      span.className = "ink-ch";
      span.style.setProperty("--i", String(Math.min(i, 40)));
      span.textContent = ch === " " ? "\u00a0" : ch;
      frag.appendChild(span);
    });
    el.replaceChildren(frag);
  }

  function fillInkColumns(el, parts) {
    const cols = columnCount(parts.length);
    if (cols === 1) {
      fillInkInline(el, parts);
      return;
    }
    const columns = splitColumns(parts, cols);
    const seed = parts.reduce((s, ch) => s + ch.charCodeAt(0), 0);
    const frag = document.createDocumentFragment();
    let i = 0;
    columns.forEach((col, c) => {
      const wrap = document.createElement("span");
      wrap.className = "ink-col";
      wrap.style.setProperty("--stagger", columnStagger(cols, c, seed));
      wrap.style.setProperty("--nudge", `${(((seed >> (c * 3)) & 7) - 3) * 0.06}em`);
      col.forEach((ch) => {
        const span = document.createElement("span");
        span.className = "ink-ch";
        span.style.setProperty("--i", String(Math.min(i, 40)));
        span.textContent = ch === " " ? "\u00a0" : ch;
        wrap.appendChild(span);
        i += 1;
      });
      frag.appendChild(wrap);
    });
    el.replaceChildren(frag);
  }

  function wrapLatinLines(text) {
    const words = text.trim().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const n = words.reduce((s, w) => s + w.length, 0) + Math.max(0, words.length - 1);
    let maxLen = 32;
    if (n <= 26) maxLen = Math.max(n, 12);
    else if (n <= 48) maxLen = 24;
    else if (n <= 72) maxLen = 30;
    const lines = [];
    let cur = [];
    let len = 0;
    for (const word of words) {
      const add = (cur.length ? 1 : 0) + word.length;
      if (cur.length && len + add > maxLen) {
        lines.push(cur);
        cur = [word];
        len = word.length;
      } else {
        cur.push(word);
        len += add;
      }
    }
    if (cur.length) lines.push(cur);
    return lines;
  }

  function lineIndent(index, seed) {
    const pattern = [0.08, 1.38, 0.42, 1.72, 0.78, 1.12];
    const wobble = ((seed + index * 13) % 8) * 0.05;
    return `${(pattern[index % pattern.length] + wobble).toFixed(2)}em`;
  }

  function fillInkLines(el, text) {
    const lines = wrapLatinLines(text);
    const seed = Array.from(text).reduce((s, ch) => s + ch.charCodeAt(0), 0);
    const frag = document.createDocumentFragment();
    let i = 0;
    lines.forEach((words, li) => {
      const line = document.createElement("span");
      line.className = "ink-line";
      line.style.setProperty("--indent", lineIndent(li, seed));
      words.forEach((word, wi) => {
        if (wi) {
          const sp = document.createElement("span");
          sp.className = "ink-ch ink-sp";
          sp.style.setProperty("--i", String(Math.min(i, 40)));
          sp.textContent = "\u00a0";
          line.appendChild(sp);
          i += 1;
        }
        inkChars(word).forEach((ch) => {
          const span = document.createElement("span");
          span.className = "ink-ch";
          span.style.setProperty("--i", String(Math.min(i, 40)));
          span.textContent = ch;
          line.appendChild(span);
          i += 1;
        });
      });
      frag.appendChild(line);
    });
    el.replaceChildren(frag);
  }

  function fillInk(el, text) {
    const parts = inkChars(text);
    const vertical = isVerticalAphorism();
    const stacked = vertical && columnCount(parts.length) > 1;
    el.classList.toggle("is-vertical", stacked);
    el.classList.toggle("is-lined", !vertical);
    if (stacked) fillInkColumns(el, parts);
    else if (vertical) fillInkInline(el, parts);
    else fillInkLines(el, text);
  }

  function inkOutMs(el) {
    const n = el.querySelectorAll(".ink-ch").length || 8;
    return Math.min(3000, 1640 + Math.min(n, 28) * 56);
  }

  function paintAphorism(animate) {
    const list = aphorismList();
    if (!aphorismText || !list.length) return;
    const { order, pos } = readAphorismState(list.length);
    const idx = order[pos] ?? 0;
    const text = list[idx] || list[0];
    const motion = animate && !prefersReducedMotion();
    const apply = () => {
      fillInk(aphorismText, text);
      aphorismText.classList.remove("is-out");
      aphorismText.classList.remove("is-in");
      if (motion) {
        void aphorismText.offsetWidth;
        aphorismText.classList.add("is-in");
      }
      scheduleAphorismCycle();
    };
    window.clearTimeout(aphorismTimer);
    const current = (aphorismText.textContent || "").replace(/\u00a0/g, " ");
    if (motion && current && current !== text) {
      aphorismText.classList.remove("is-in");
      aphorismText.classList.add("is-out");
      aphorismTimer = window.setTimeout(apply, inkOutMs(aphorismText));
    } else {
      apply();
    }
  }

  function advanceAphorism(animate) {
    const list = aphorismList();
    if (!list.length) return;
    let { order, pos } = readAphorismState(list.length);
    const last = order[pos];
    pos += 1;
    if (pos >= order.length) {
      order = shuffleOrder(list.length, last);
      pos = 0;
    }
    writeAphorismState(order, pos);
    paintAphorism(animate);
  }

  function initAphorism() {
    const list = aphorismList();
    if (!list.length) return;
    let hadPos = false;
    try { hadPos = localStorage.getItem(aphorismStorageKeys().pos) != null; } catch (_) { /* ignore */ }
    if (hadPos) advanceAphorism(true);
    else {
      writeAphorismState(shuffleOrder(list.length), 0);
      paintAphorism(true);
    }
  }

  function confirmDiscardIfDirty() {
    if (!dirty) return true;
    return window.confirm(t("confirmDiscard"));
  }

  function ensureVditor() {
    if (editorApi) return Promise.resolve(editorApi);
    if (editorReady) return editorReady;

    editorReady = window.MolanEditor.create({
      elementId: "vditor",
      cdn: window.MolanEditor.DEFAULT_CDN,
      placeholder: t("placeholder"),
      previewFormatBar: true,
      lang: window.MolanI18n ? window.MolanI18n.vditorLang() : "zh_CN",
      onInput: () => onEditorInput(),
      onCounter: () => {
        if (applyingRemote || editorApi?.isPreview?.()) return;
        scheduleEditorIdleWork();
      },
      onSave: () => { saveActiveFile(); },
      onReady: (api) => {
        editorApi = api;
        if (pendingOpenPath) {
          const path = pendingOpenPath;
          pendingOpenPath = null;
          openFile(path, { force: true });
        }
      },
    }).then((api) => {
      editorApi = api;
      api.onPreviewChange?.(() => syncModeButton());
      return api;
    });

    return editorReady;
  }

  async function openFile(path, opts = {}) {
    const file = files.find((f) => f.path === path);
    if (!file) return;
    if (!opts.force && path === activePath) return;
    if (!opts.force && !confirmDiscardIfDirty()) return;

    const seq = ++openSeq;
    applyingRemote = true;
    clearTimeout(editorIdleTimer);
    stopAphorismCycle();
    if (welcome) welcome.hidden = true;
    document.querySelector(".main")?.classList.remove("is-idle");
    readerBody?.classList.add("is-editing");
    editorWrap.classList.add("visible");
    syncSaveButton();
    copyBtn.hidden = false;
    if (pdfBtn) pdfBtn.hidden = false;
    if (modeBtn) modeBtn.hidden = false;
    if (findBtn) findBtn.hidden = false;
    if (typeBtn) typeBtn.hidden = false;
    if (reloadBtn) reloadBtn.hidden = false;
    syncHeaderDocButtons(true);
    statusLeft.textContent = t("openingName", { name: file.name });

    await ensureVditor();
    if (seq !== openSeq) return;

    try {
      const text = await ensureFileText(file);
      if (seq !== openSeq) return;

      activePath = path;
      setActiveFileItem(path);
      readerTitle.textContent = file.name.replace(/\.(md|markdown|mdx|mdown)$/i, "");
      baselineText = text;
      await editorApi.setPreview(true);
      await editorApi.setValue(text, true);
      setDirty(false);
      statusLeft.textContent = `${file.name} · ${((file.size || text.length) / 1024).toFixed(1)} KB`;
      paintStatus(text);
      syncModeButton();
      if (!editorApi.isPreview()) {
        // 编辑态：等 Vditor undoDelay(200) + 流程图增强(400)，避免 setValue 往返被当成一次编辑。
        await wait(480);
        if (seq !== openSeq) return;
        baselineText = editorApi.getValue();
      }
      applyingRemote = false;
      setDirty(false);
      updateStatusRight();
    } catch (err) {
      console.warn(err);
      if (seq !== openSeq) return;
      applyingRemote = false;
      statusLeft.textContent = t("readFail");
      toast(t("readFailToast"));
    }
  }

  function downloadMarkdown(filename, text) {
    const blob = new Blob([text], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || "document.md";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function saveActiveFile() {
    if (!activePath || !editorApi) return;
    const file = files.find((f) => f.path === activePath);
    if (!file) return;

    const text = editorApi.getValue();
    statusLeft.textContent = t("saving");

    try {
      if (file.handle) {
        const ok = await ensurePermission(file.handle, "readwrite");
        if (!ok) {
          toast(t("noWritePermission"));
          downloadMarkdown(file.name, text);
          baselineText = text;
          file.text = text;
          setDirty(false);
          updateStatusRight();
          statusLeft.textContent = `${file.name} · ${t("downloaded")}`;
          return;
        }
        const writable = await file.handle.createWritable();
        await writable.write(text);
        await writable.close();
        file.text = text;
        file.size = new Blob([text]).size;
        baselineText = text;
        setDirty(false);
        updateStatusRight();
        statusLeft.textContent = `${file.name} · ${t("saved")}`;
        toast(t("wroteBack"));
        renderSidebarList();
        return;
      }

      downloadMarkdown(file.name, text);
      file.text = text;
      baselineText = text;
      setDirty(false);
      updateStatusRight();
      statusLeft.textContent = `${file.name} · ${t("downloaded")}`;
      toast(t("compatDownloaded"));
      renderSidebarList();
    } catch (err) {
      console.warn(err);
      statusLeft.textContent = t("saveFail");
      toast(t("saveFail"));
    }
  }

  async function pickFolder() {
    if (!confirmDiscardIfDirty()) return;
    statusLeft.textContent = t("openingPicker");
    const canUseDirectoryPicker = typeof window.showDirectoryPicker === "function";
    if (allowCompatPicker || !canUseDirectoryPicker) {
      if (!canUseDirectoryPicker) toast(t("browserCompat"));
      openCompatPicker();
      return;
    }
    try {
      await loadFromDirectoryHandle(await showDirectoryPicker({ mode: "readwrite" }));
    } catch (err) {
      if (err && err.name === "AbortError") {
        statusLeft.textContent = t("cancelled");
        return;
      }
      console.warn(err);
      statusLeft.textContent = t("useCompat");
      toast(t("dirApiUnavailable"));
      openCompatPicker();
    }
  }

  pickBtn.addEventListener("click", () => {
    markPickHintSeen();
    pickFolder();
  });

  welcomePickBtn?.addEventListener("click", () => {
    markPickHintSeen();
    pickFolder();
  });

  aphorismText?.addEventListener("click", () => advanceAphorism(true));
  aphorismText?.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      advanceAphorism(true);
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopAphorismCycle();
    else scheduleAphorismCycle();
  });

  dirInput.addEventListener("change", () => {
    if (!confirmDiscardIfDirty()) {
      dirInput.value = "";
      return;
    }
    if (dirInput.files && dirInput.files.length) void loadFromFileList(dirInput.files);
  });

  let searchTimer = 0;
  searchInput.addEventListener("input", () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => renderSidebarList(), 80);
  });

  fileList.addEventListener("click", (e) => {
    const removeBtn = e.target.closest("[data-remove-recent]");
    if (removeBtn) {
      removeRecentFolder(removeBtn.getAttribute("data-remove-recent"), e);
      return;
    }
    const recentBtn = e.target.closest("[data-recent-id]");
    if (recentBtn) {
      if (!confirmDiscardIfDirty()) return;
      reopenRecentFolder(recentBtn.getAttribute("data-recent-id"));
      return;
    }
    const btn = e.target.closest(".file-item");
    if (!btn) return;
    const path = btn.dataset.path;
    openFile(path);
  });

  saveBtn.addEventListener("click", () => saveActiveFile());

  if (findBtn && !findBtn.dataset.bound) {
    findBtn.dataset.bound = "1";
    findBtn.addEventListener("click", () => {
      window.MolanEditor.find?.open();
    });
  }

  reloadBtn?.addEventListener("click", () => {
    void reloadLibrary();
  });

  modeBtn?.addEventListener("click", async () => {
    if (!editorApi || !activePath) return;
    const nextPreview = !editorApi.isPreview();
    await editorApi.setPreview(nextPreview);
    syncModeButton();
    replayMotion(editorWrap, "is-mode");
    if (!nextPreview) {
      try { editorApi.focus(); } catch (_) { /* ignore */ }
    }
  });

  editorWrap?.addEventListener("click", (e) => {
    if (e.defaultPrevented || e.button !== 0) return;
    const href = hrefFromClick(e);
    if (!href) return;
    const parsed = parseEditorHref(href);
    if (parsed.kind === "ignore") {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (parsed.kind === "external") {
      e.preventDefault();
      e.stopPropagation();
      window.open(parsed.href, "_blank", "noopener,noreferrer");
      return;
    }
    if (parsed.kind === "hash") {
      e.preventDefault();
      e.stopPropagation();
      scrollToDocHash(parsed.hash);
      return;
    }
    if (parsed.kind === "local") {
      e.preventDefault();
      e.stopPropagation();
      const leaf = decodeHrefPart(parsed.rel).split("/").pop() || "";
      if (isMarkdown(leaf)) {
        void openLocalMarkdownLink(parsed.rel, parsed.hash);
        return;
      }
      toast(t("linkNotInFolder", { name: leaf || parsed.rel }));
    }
  }, true);

  copyBtn.addEventListener("click", async () => {
    if (!editorApi) return;
    try {
      const copy = window.MolanEditor?.copyText;
      if (typeof copy === "function") await copy(editorApi.getValue());
      else await navigator.clipboard.writeText(editorApi.getValue());
      replayMotion(copyBtn, "is-pulse");
      toast(t("copiedMd"));
    } catch {
      toast(t("copyFail"));
    }
  });

  document.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if ((e.metaKey || e.ctrlKey) && key === "s") {
      e.preventDefault();
      saveActiveFile();
    }
    if (welcome && !welcome.hidden && e.key === "ArrowRight") {
      const tag = (e.target && e.target.tagName) || "";
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag)) return;
      e.preventDefault();
      advanceAphorism(true);
    }
  });

  window.addEventListener("beforeunload", (e) => {
    if (!dirty) return;
    e.preventDefault();
    e.returnValue = "";
  });

  function fillLangSelect() {
    const sel = document.getElementById("langSelect");
    if (!sel || !window.MolanI18n) return;
    sel.innerHTML = "";
    window.MolanI18n.langs.forEach((lang) => {
      const opt = document.createElement("option");
      opt.value = lang.id;
      opt.textContent = lang.name;
      sel.appendChild(opt);
    });
    sel.value = window.MolanI18n.getLang();
  }

  function refreshUiCopy() {
    window.MolanI18n?.applyDom();
    if (!activePath) {
      readerTitle.textContent = "墨览";
    } else {
      const file = files.find((f) => f.path === activePath);
      if (file) {
        readerTitle.textContent = file.name.replace(/\.(md|markdown|mdx|mdown)$/i, "");
      }
      setDirty(dirty);
    }
    syncModeButton();
    if (files.length) {
      statusLeft.textContent = t("indexed", { n: files.length });
    } else if (!activePath) {
      statusLeft.textContent = "";
    }
    updateStatusRight();
    renderSidebarList();
    paintAphorism(false);
    try { window.MolanEditor.refreshI18n?.(); } catch (_) { /* ignore */ }
  }

  fillLangSelect();
  window.MolanI18n?.applyDom();
  showWelcome();
  initAphorism();
  const langSelect = document.getElementById("langSelect");
  if (langSelect) {
    langSelect.addEventListener("change", () => {
      window.MolanI18n.setLang(langSelect.value);
      refreshUiCopy();
      toast(t("langSwitched", { name: window.MolanI18n.meta().name }));
    });
  }

  refreshRecentFolders()
    .then(() => seedSampleLibrary())
    .then(() => {
      renderSidebarList();
      if (wantsDemo()) return loadDemoLibrary();
    })
    .catch((err) => console.warn(err));
})();
