const MD_LINK = /\.(md|markdown|mdx|mdown)([?#]|$)/i;

export function isMarkdownHref(href: string): boolean {
  const pathPart = String(href || "").split("#")[0].split("?")[0];
  return MD_LINK.test(pathPart);
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
