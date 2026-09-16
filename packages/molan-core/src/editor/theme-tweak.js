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
