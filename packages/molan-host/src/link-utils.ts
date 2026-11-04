const MD_LINK = /\.(md|markdown|mdx|mdown)([?#]|$)/i;
const URI_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const WINDOWS_DRIVE = /^[a-z]:[\\/]/i;

/** 行号定位。行、列都是 1-based，和 `#L516` / `#L516C3` 一致。 */
export type LineLocation = {
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
};

function hasUriScheme(value: string): boolean {
  return URI_SCHEME.test(value) && !WINDOWS_DRIVE.test(value);
}

export function isMarkdownHref(href: string): boolean {
  const pathPart = String(href || "").split("#")[0].split("?")[0];
  return MD_LINK.test(pathPart);
}

/** webview 把本地文件解析成的资源地址，点开不能当外链丢给浏览器。 */
export function isVscodeResourceHref(href: string): boolean {
  return (
    /vscode-resource\.vscode-cdn\.net/i.test(href) ||
    /^vscode-resource:/i.test(href) ||
    /^vscode-webview-resource:/i.test(href)
  );
}

/**
 * 相对路径、绝对路径、file:，以及已经展开成 webview 资源地址的本地文件。
 * 纯锚点、mailto、外站 http 不算。
 */
export function isLocalResourceHref(href: string, resolvedRelative = ""): boolean {
  const raw = String(href || "").trim();
  if (!raw || raw.startsWith("#") || raw.startsWith("//")) return false;
  if (/^(?:mailto|tel|javascript|data|blob):/i.test(raw)) return false;
  if (isVscodeResourceHref(raw) || /^file:/i.test(raw)) return true;
  if (hasUriScheme(raw)) {
    if (!/^https?:/i.test(raw)) return false;
    const rel = String(resolvedRelative || "").trim();
    if (!rel || rel.startsWith("#") || hasUriScheme(rel) || rel === raw) return false;
    return true;
  }
  return true;
}

/** 交给宿主打开的路径：能还原成相对路径时优先相对路径，远程工作区才对得上。 */
export function localLinkToOpen(href: string, resolvedRelative: string): string {
  const rel = String(resolvedRelative || "").trim();
  const raw = String(href || "").trim();
  if (rel && !hasUriScheme(rel)) return rel;
  if (raw && !hasUriScheme(raw)) return raw;
  return rel || raw;
}

/** `#L516`、`#L516C3`、`#L516-L520`、`#516`。 */
export function parseLineFragment(fragment: string): LineLocation | null {
  const raw = fragment.trim().replace(/^#/, "");
  if (!raw) return null;
  const ranged = /^L(\d+)(?:C(\d+))?(?:-L(\d+)(?:C(\d+))?)?$/i.exec(raw);
  if (ranged) {
    const line = Number(ranged[1]);
    if (!Number.isFinite(line) || line < 1) return null;
    const column = ranged[2] ? Number(ranged[2]) : 1;
    const endLine = ranged[3] ? Number(ranged[3]) : line;
    const endColumn = ranged[4] ? Number(ranged[4]) : ranged[3] ? 1 : column;
    return {
      line,
      column: Math.max(1, column),
      endLine: Math.max(line, endLine),
      endColumn: Math.max(1, endColumn),
    };
  }
  const plain = /^(\d+)$/.exec(raw);
  if (!plain) return null;
  const line = Number(plain[1]);
  if (!Number.isFinite(line) || line < 1) return null;
  return { line, column: 1, endLine: line, endColumn: 1 };
}

/** 拆出文件路径和行号。支持 `#L516`，也支持 `file.go:516`。 */
export function splitLocalLink(href: string): { path: string; location: LineLocation | null } {
  const trimmed = String(href || "").trim();
  const hashAt = trimmed.indexOf("#");
  const beforeHash = (hashAt >= 0 ? trimmed.slice(0, hashAt) : trimmed).trim();
  const hash = hashAt >= 0 ? trimmed.slice(hashAt) : "";
  const queryAt = beforeHash.indexOf("?");
  let path = (queryAt >= 0 ? beforeHash.slice(0, queryAt) : beforeHash).trim();
  let location = parseLineFragment(hash);
  if (!location && path && !hasUriScheme(path)) {
    const suffix = /:(\d+)(?::(\d+))?$/.exec(path);
    if (suffix && suffix.index > 0) {
      const line = Number(suffix[1]);
      const column = suffix[2] ? Number(suffix[2]) : 1;
      if (line >= 1) {
        location = { line, column, endLine: line, endColumn: column };
        path = path.slice(0, suffix.index);
      }
    }
  }
  return { path, location };
}

/**
 * 从 webview 资源 URL 取出文件系统路径。
 * 相对路径解析失败时的退路；远程工作区仍应优先用相对当前文档的路径。
 */
export function filesystemPathFromWebviewHref(href: string): string | null {
  const raw = String(href || "").trim();
  if (!isVscodeResourceHref(raw)) return null;
  const match = raw.match(/^https?:\/\/[^/?#]+(\/[^?#]*)/i) || raw.match(/^(?:vscode-resource|vscode-webview-resource):(\/[^?#]*)/i);
  if (!match) return null;
  let pathname = match[1];
  try {
    pathname = decodeURIComponent(pathname);
  } catch {
    /* 保持原样 */
  }
  const embedded = pathname.match(/^\/(file|vscode-remote|vscode-vfs)\/{2,}(.*)$/i);
  if (embedded) {
    const rest = embedded[2];
    pathname = rest.startsWith("/") || WINDOWS_DRIVE.test(rest) ? rest : `/${rest}`;
  }
  if (WINDOWS_DRIVE.test(pathname)) return pathname;
  if (/^\/[a-zA-Z]:[\\/]/.test(pathname)) return pathname.slice(1);
  if (pathname.startsWith("/") && pathname.length > 1) return pathname;
  return null;
}

export function relativeToLinkBase(href: string, linkBase: string): string {
  const raw = String(href || "").trim();
  if (!raw || !linkBase) return raw;
  try {
    const target = new URL(raw, linkBase);
    const base = new URL(linkBase);
    if (target.origin !== base.origin) return raw;
    const tParts = decodeURIComponent(target.pathname).split("/").filter(Boolean);
    const bParts = decodeURIComponent(base.pathname).split("/").filter(Boolean);
    let i = 0;
    while (i < tParts.length && i < bParts.length && tParts[i] === bParts[i]) i += 1;
    const rel = [...Array(bParts.length - i).fill(".."), ...tParts.slice(i)].join("/");
    return rel + target.search + target.hash;
  } catch {
    return raw.startsWith(linkBase) ? raw.slice(linkBase.length) : raw;
  }
}

export function isExternalHttp(href: string, linkBase: string): boolean {
  if (!/^https?:/i.test(href)) return false;
  if (!linkBase) return true;
  try {
    return new URL(href, linkBase).origin !== new URL(linkBase).origin;
  } catch {
    return true;
  }
}

export function stripMarkdownExtension(fileName: string): string {
  return fileName.replace(/\.(md|markdown|mdx|mdown)$/i, "");
}
