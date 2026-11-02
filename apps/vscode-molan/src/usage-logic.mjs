/** 匿名功能事件。不要把路径、正文或工作区名放进来。 */
export const USAGE_EVENT_NAMES = [
  "session",
  "open",
  "edit",
  "outline",
  "find",
  "format",
  "table",
  "mermaid",
  "math",
  "theme",
];

const USAGE_EVENT_SET = new Set(USAGE_EVENT_NAMES);
const DATA_KEYS = new Set(["version", "host", "os"]);

export function isUsageEventName(name) {
  return USAGE_EVENT_SET.has(name);
}

export function hostKind(appName) {
  const name = String(appName || "").toLowerCase();
  if (name.includes("cursor")) return "cursor";
  if (name.includes("code")) return "vscode";
  return "other";
}

export function osKind(platform) {
  if (platform === "darwin" || platform === "win32" || platform === "linux") return platform;
  return "other";
}

/** 文档里出现过的排版能力。只返回功能名。 */
export function contentFeatures(markdown) {
  const text = String(markdown || "");
  const found = [];
  if (/(^|\n)[ \t]{0,3}(`{3,}|~{3,})[ \t]*mermaid\b/i.test(text)) found.push("mermaid");
  if (
    /(^|\n)[ \t]{0,3}(`{3,}|~{3,})[ \t]*(math|latex|katex)\b/i.test(text) ||
    /\$\$[\s\S]{1,2000}?\$\$/.test(text) ||
    /\\\[[\s\S]{1,2000}?\\\]/.test(text) ||
    /\\\([\s\S]{1,500}?\\\)/.test(text)
  ) {
    found.push("math");
  }
  if (/(^|\n)\|[^\n]*\|[^\n]*\n[ \t]*\|?[ \t]*:?-{3,}:?[ \t]*\|/.test(text)) found.push("table");
  return found;
}

function compactData(data) {
  const out = {};
  if (!data) return out;
  for (const key of DATA_KEYS) {
    const value = data[key];
    if (value == null || value === "") continue;
    out[key] = String(value).slice(0, 64);
  }
  return out;
}

/**
 * @param {{
 *   websiteId: string,
 *   endpoint: string,
 *   enabled: () => boolean,
 *   distinctId: () => string,
 *   context: () => { version?: string, host?: string, os?: string, language?: string },
 *   send: (url: string, body: unknown, headers: Record<string, string>) => Promise<unknown>,
 * }} options
 */
export function createUsageReporter(options) {
  const seen = new Set();
  return {
    event(name, dedupeKey) {
      if (!options.websiteId || !isUsageEventName(name)) return;
      if (!options.enabled()) return;
      const key = dedupeKey || name;
      if (seen.has(key)) return;
      const id = String(options.distinctId() || "");
      if (id.length < 8 || id.length > 50) return;
      const ctx = options.context() || {};
      seen.add(key);
      const version = String(ctx.version || "0").slice(0, 32);
      const body = {
        type: "event",
        payload: {
          website: options.websiteId,
          hostname: "extension.molan",
          language: String(ctx.language || ""),
          referrer: "",
          url: `/${name}`,
          title: name,
          name,
          id,
          data: compactData({
            version,
            host: ctx.host,
            os: ctx.os,
          }),
        },
      };
      void Promise.resolve(
        options.send(options.endpoint, body, {
          "Content-Type": "application/json",
          "User-Agent": `Mozilla/5.0 (compatible; Molan/${version})`,
        }),
      ).catch(() => {});
    },
  };
}
