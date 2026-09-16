export type HeadingMark = {
  level: number;
  text: string;
};

export type FocusRect = {
  top: number;
  left: number;
  bottom: number;
  right: number;
};

export type DocFocus = {
  headingPath: string[];
  quote: string;
  before?: string;
  after?: string;
  rect?: FocusRect | null;
};

export function stripPreviewText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** 按标题层级收成路径：后出现的同级或更高级会顶掉栈顶。 */
export function headingPathFromMarks(marks: HeadingMark[]): string[] {
  const stack: HeadingMark[] = [];
  for (const mark of marks) {
    if (!mark.text || mark.level < 1 || mark.level > 6) continue;
    while (stack.length && stack[stack.length - 1].level >= mark.level) {
      stack.pop();
    }
    stack.push(mark);
  }
  return stack.map((m) => m.text);
}

/**
 * 用预览 HTML 里引文出现的位置，收集它前面的标题再收成路径。
 * 不依赖 DOM，方便单测「用户故事下的一句」。
 */
export function headingPathForQuoteInHtml(html: string, quote: string): string[] {
  const needle = quote.trim();
  if (!needle) return [];
  const idx = html.indexOf(needle);
  if (idx < 0) return [];
  const before = html.slice(0, idx);
  const marks: HeadingMark[] = [];
  const re = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(before))) {
    const text = stripPreviewText(match[2] || "");
    if (text) marks.push({ level: Number(match[1]), text });
  }
  return headingPathFromMarks(marks);
}

export function emptyDocFocus(): DocFocus {
  return { headingPath: [], quote: "", before: "", after: "", rect: null };
}

/** 从整篇纯文本里切出引文前后各一段，给模型当定位上下文。 */
export function surroundingQuote(
  full: string,
  quote: string,
  radius = 240,
): { before: string; after: string } {
  const hay = full.replace(/\s+/g, " ").trim();
  const needle = quote.replace(/\s+/g, " ").trim();
  if (!hay || !needle) return { before: "", after: "" };
  const idx = hay.indexOf(needle);
  if (idx < 0) return { before: "", after: "" };
  return {
    before: hay.slice(Math.max(0, idx - radius), idx).trim(),
    after: hay.slice(idx + needle.length, idx + needle.length + radius).trim(),
  };
}

type HtmlHeading = {
  level: number;
  text: string;
  start: number;
  end: number;
};

function listHtmlHeadings(html: string): HtmlHeading[] {
  const headings: HtmlHeading[] = [];
  const re = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    const text = stripPreviewText(match[2] || "");
    if (!text) continue;
    headings.push({
      level: Number(match[1]),
      text,
      start: match.index,
      end: match.index + match[0].length,
    });
  }
  return headings;
}

/**
 * 点标题选整节：该标题到下一同级/更高级之前的纯文本，路径含祖先 + 自身。
 * 不依赖 DOM，方便单测「点用户故事」。
 */
export function sectionForHeadingInHtml(html: string, headingText: string): DocFocus {
  const needle = headingText.replace(/\s+/g, " ").trim();
  if (!needle) return emptyDocFocus();
  const headings = listHtmlHeadings(html);
  const idx = headings.findIndex((h) => h.text === needle);
  if (idx < 0) return emptyDocFocus();
  const current = headings[idx];
  let sectionEnd = html.length;
  for (let i = idx + 1; i < headings.length; i += 1) {
    if (headings[i].level <= current.level) {
      sectionEnd = headings[i].start;
      break;
    }
  }
  const quote = stripPreviewText(html.slice(current.start, sectionEnd));
  const marks = headings.slice(0, idx + 1).map((h) => ({ level: h.level, text: h.text }));
  return { headingPath: headingPathFromMarks(marks), quote };
}

export function formatFocusPath(headingPath: string[]): string {
  return headingPath.map((p) => p.trim()).filter(Boolean).join(" / ") || "（整篇）";
}

/** 底条 / 气泡芯片：`章节路径 · 「摘录前 24 字…」`。无引文则空串。 */
export function formatFocusChip(focus: Pick<DocFocus, "headingPath" | "quote">): string {
  const quote = focus.quote.replace(/\s+/g, " ").trim();
  if (!quote) return "";
  const excerpt = quote.slice(0, 24) + (quote.length > 24 ? "…" : "");
  return `${formatFocusPath(focus.headingPath)} · 「${excerpt}」`;
}
