/** 预览区文内 `#标题` 锚点：解析 fragment 并滚到对应标题。 */

export function decodeFragment(raw: string): string {
  const part = String(raw || "").replace(/^#/, "").trim();
  if (!part) return "";
  try {
    return decodeURIComponent(part.replace(/\+/g, " "));
  } catch {
    return part;
  }
}

export function normalizeFragmentKey(value: string): string {
  return String(value || "")
    .replace(/^user-content-/, "")
    .trim()
    .toLowerCase();
}

export function headingPlainKey(text: string): string {
  return String(text || "")
    .replace(/[`*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const HEADING_SELECTOR =
  ".molan-preview h1, .molan-preview h2, .molan-preview h3, .molan-preview h4, .molan-preview h5, .molan-preview h6, " +
  ".vditor-reset h1, .vditor-reset h2, .vditor-reset h3, .vditor-reset h4, .vditor-reset h5, .vditor-reset h6";

export function findPreviewHeadingTarget(root: ParentNode, fragment: string): HTMLElement | null {
  const id = decodeFragment(fragment);
  if (!id) return null;
  const want = normalizeFragmentKey(id);

  const tryId = (candidate: string): HTMLElement | null => {
    if (!candidate) return null;
    try {
      const el = root.querySelector(`#${CSS.escape(candidate)}`);
      if (el instanceof HTMLElement) return el;
    } catch {
      /* ignore invalid selector */
    }
    return null;
  };

  for (const cand of [id, id.toLowerCase()]) {
    const hit = tryId(cand);
    if (hit) return hit;
  }

  const headings = root.querySelectorAll(HEADING_SELECTOR);
  for (let i = 0; i < headings.length; i += 1) {
    const h = headings[i];
    if (!(h instanceof HTMLElement)) continue;
    if (h.id && normalizeFragmentKey(h.id) === want) return h;
    const plain = headingPlainKey(h.textContent || "");
    if (plain === want || normalizeFragmentKey(plain) === want) return h;
  }
  return null;
}

export function scrollPreviewToFragment(fragment: string, doc: Document = document): boolean {
  const wrap = doc.getElementById("editorWrap") || doc.querySelector(".editor-wrap");
  const root = wrap || doc.body;
  const hash = fragment.startsWith("#") ? fragment : `#${fragment}`;
  const el = findPreviewHeadingTarget(root, hash);
  if (!el) return false;
  el.scrollIntoView({ block: "start", behavior: "smooth" });
  return true;
}
