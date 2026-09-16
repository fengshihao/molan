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
