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
