/**
 * 每份文档的阅读位置：预览滚到哪一块、块顶距滚动容器上沿多少像素。
 * 编码成 `b<块序号>o<偏移>` 字符串随消息往返，宿主按文档 URI 持久化，
 * 关掉再打开时滚回原处。块序号对内容增删最稳，偏移保留块内的细读位置。
 */

export type ReadPosition = {
  /** 预览正文里第一个可见顶层块的序号 */
  index: number;
  /** 该块顶边距滚动容器视口上沿的像素（长段读到一半时为负） */
  offset: number;
};

export function encodeReadPosition(pos: ReadPosition): string {
  if (!Number.isInteger(pos.index) || pos.index < 0) return "";
  if (!Number.isFinite(pos.offset)) return "";
  return `b${pos.index}o${Math.round(pos.offset)}`;
}

export function decodeReadPosition(raw: unknown): ReadPosition | null {
  if (typeof raw !== "string") return null;
  const match = /^b(\d+)o(-?\d+)$/.exec(raw.trim());
  if (!match) return null;
  const index = Number(match[1]);
  const offset = Number(match[2]);
  if (!Number.isInteger(index) || index < 0) return null;
  return { index, offset };
}

/** 预览态真正的滚动容器：#molanPreviewBody（CSS 固定 overflow:auto） */
export function findReadScroller(doc: Document): HTMLElement | null {
  const scroller =
    doc.getElementById("molanPreviewBody") ||
    doc.querySelector(".molan-preview > .vditor-reset");
  return scroller instanceof HTMLElement ? scroller : null;
}

export function topLevelReadBlocks(scroller: HTMLElement): Element[] {
  const blocks: Element[] = [];
  const children = scroller.children;
  for (let i = 0; i < children.length; i += 1) {
    const child = children[i];
    if (child instanceof HTMLElement && child.tagName !== "SCRIPT" && child.tagName !== "STYLE") {
      blocks.push(child);
    }
  }
  return blocks;
}

/** 记录当前阅读位置；预览未渲染（无正文块）时返回 null */
export function captureReadPosition(doc: Document): string | null {
  const scroller = findReadScroller(doc);
  if (!scroller) return null;
  const blocks = topLevelReadBlocks(scroller);
  if (!blocks.length) return null;
  const boxTop = scroller.getBoundingClientRect().top;
  let index = -1;
  for (let i = 0; i < blocks.length; i += 1) {
    const rect = blocks[i].getBoundingClientRect();
    // 第一个底边还在视口内的块 = 当前读到的那一块
    if (rect.bottom > boxTop + 1) {
      index = i;
      break;
    }
  }
  if (index < 0) index = blocks.length - 1;
  const rect = blocks[index].getBoundingClientRect();
  return encodeReadPosition({ index, offset: rect.top - boxTop });
}

/** 滚回记录的位置；正文尚未渲染返回 false，调用方可稍后重试 */
export function applyReadPosition(saved: string, doc: Document): boolean {
  const pos = decodeReadPosition(saved);
  if (!pos) return false;
  const scroller = findReadScroller(doc);
  if (!scroller) return false;
  const blocks = topLevelReadBlocks(scroller);
  if (!blocks.length) return false;
  const el = blocks[Math.min(pos.index, blocks.length - 1)];
  const boxTop = scroller.getBoundingClientRect().top;
  const rect = el.getBoundingClientRect();
  // 让目标块顶边落在视口上沿下方 offset 像素处
  const next = scroller.scrollTop + (rect.top - boxTop) - pos.offset;
  scroller.scrollTop = Math.max(0, next);
  return true;
}