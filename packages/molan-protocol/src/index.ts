import { z } from "zod";
import type { DocFocus } from "./docFocus.js";

/** 四款纸面主题 */
export const MolanThemeSchema = z.enum(["night", "hack", "rose", "xuan"]);
export type MolanTheme = z.infer<typeof MolanThemeSchema>;

/** 宿主向 iframe/webview 查询编辑器快照 */
export const MolanStateSchema = z.object({
  value: z.string(),
  dirty: z.boolean(),
  isPreview: z.boolean(),
});
export type MolanState = z.infer<typeof MolanStateSchema>;

/** `MolanEditor.create` 入参（浏览器侧运行时契约） */
export type EditorOptions = {
  elementId?: string;
  cdn?: string;
  linkBase?: string;
  defaultPreview?: boolean;
  lang?: string;
  placeholder?: string;
  previewActions?: unknown[];
  /** 墨览工作室：预览态选中文字也出格式条。工作台不要开，避免和 AI 引用框抢手势。 */
  previewFormatBar?: boolean;
  /** 工作台：标题旁出「问这一节」。墨览 / VS Code 不要开。 */
  sectionAsk?: boolean;
  onInput?: () => void;
  onCounter?: () => void;
  onSave?: () => void;
  onReady?: (api: EditorApi) => void;
  onSelection?: (focus: DocFocus) => void;
};

/** 编辑器实例 API（浏览器侧运行时契约） */
export type EditorApi = {
  getValue(): string;
  setValue(value: string, clearStack?: boolean): void | Promise<void>;
  setPreview(preview: boolean): boolean | Promise<boolean>;
  isPreview(): boolean;
  focus(): void;
  onPreviewChange(cb: (previewing: boolean) => void): () => void;
  onSelection?(cb: (focus: DocFocus) => void): () => void;
  clearSelection?(): void;
  expandToSection?(): void;
  getVditor?(): unknown;
};

const contentPayload = {
  value: z.string(),
  fileName: z.string(),
  readOnly: z.boolean().optional(),
  dirty: z.boolean().optional(),
};

/** 宿主 → 编辑器 iframe/webview */
export const HostToFrameMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("init"), ...contentPayload }),
  z.object({ type: z.literal("setContent"), ...contentPayload }),
  z.object({ type: z.literal("setReadOnly"), readOnly: z.boolean() }),
  z.object({ type: z.literal("saved") }),
  z.object({ type: z.literal("getState"), requestId: z.number() }),
  z.object({ type: z.literal("exitEdit") }),
  z.object({ type: z.literal("find") }),
  z.object({ type: z.literal("findNext") }),
  z.object({ type: z.literal("findPrev") }),
  z.object({ type: z.literal("clearSelection") }),
  z.object({ type: z.literal("expandSection") }),
  z.object({ type: z.literal("openFeedback") }),
]);
export type HostToFrameMessage = z.infer<typeof HostToFrameMessageSchema>;

/** 编辑器 iframe/webview → 宿主 */
export const FrameToHostMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ready") }),
  z.object({ type: z.literal("save"), value: z.string().optional() }),
  z.object({
    type: z.literal("change"),
    value: z.string(),
    dirty: z.boolean().optional(),
  }),
  z.object({ type: z.literal("previewChange"), isPreview: z.boolean() }),
  z.object({ type: z.literal("wantEdit") }),
  z.object({ type: z.literal("theme"), theme: MolanThemeSchema }),
  z.object({
    type: z.literal("state"),
    requestId: z.number(),
    value: z.string(),
    dirty: z.boolean(),
    isPreview: z.boolean(),
  }),
  z.object({ type: z.literal("openRelative"), value: z.string() }),
  z.object({ type: z.literal("openExternal"), value: z.string() }),
  z.object({ type: z.literal("copyText"), value: z.string() }),
  /** webview 把 Cmd/Ctrl+P 交回工作区 Quick Open，避免抢系统/IDE 快捷键 */
  z.object({ type: z.literal("quickOpen") }),
  z.object({
    type: z.literal("selection"),
    headingPath: z.array(z.string()),
    quote: z.string(),
    before: z.string().optional(),
    after: z.string().optional(),
    rect: z
      .object({
        top: z.number(),
        left: z.number(),
        bottom: z.number(),
        right: z.number(),
      })
      .nullable()
      .optional(),
  }),
]);
export type FrameToHostMessage = z.infer<typeof FrameToHostMessageSchema>;

export function parseHostToFrameMessage(data: unknown): HostToFrameMessage | null {
  const result = HostToFrameMessageSchema.safeParse(data);
  return result.success ? result.data : null;
}

export function parseFrameToHostMessage(data: unknown): FrameToHostMessage | null {
  const result = FrameToHostMessageSchema.safeParse(data);
  return result.success ? result.data : null;
}

export function isHostToFrameMessage(data: unknown): data is HostToFrameMessage {
  return HostToFrameMessageSchema.safeParse(data).success;
}

export function isFrameToHostMessage(data: unknown): data is FrameToHostMessage {
  return FrameToHostMessageSchema.safeParse(data).success;
}

export * from "./run.js";
export {
  emptyDocFocus,
  formatFocusChip,
  formatFocusPath,
  headingPathForQuoteInHtml,
  headingPathFromMarks,
  sectionForHeadingInHtml,
  stripPreviewText,
  surroundingQuote,
  type DocFocus,
  type FocusRect,
  type HeadingMark,
} from "./docFocus.js";
