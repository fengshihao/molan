import { z } from "zod";

/**
 * 托付层事件：形状对齐 AG-UI 子集，传输对齐 AgentScope Service
 * （POST 立刻返回 runId，再 GET stream?after=seq 重放 + 直播）。
 * 产品扩展走 CUSTOM.name = trust | hint | file。
 */

export const AGUI_EVENT_TYPES = [
  "RUN_STARTED",
  "TEXT_MESSAGE_START",
  "TEXT_MESSAGE_CONTENT",
  "TEXT_MESSAGE_END",
  "TOOL_CALL_START",
  "TOOL_CALL_END",
  "CUSTOM",
  "RUN_ERROR",
  "RUN_FINISHED",
] as const;

export const AguiEventTypeSchema = z.enum(AGUI_EVENT_TYPES);
export type AguiEventType = z.infer<typeof AguiEventTypeSchema>;

export const AguiRoleSchema = z.enum(["user", "assistant", "system"]);
export type AguiRole = z.infer<typeof AguiRoleSchema>;

export const AguiRunResultSchema = z.enum(["success", "error", "cancelled"]);
export type AguiRunResult = z.infer<typeof AguiRunResultSchema>;

export const CUSTOM_EVENT_NAMES = ["trust", "hint", "file", "focus"] as const;
export type CustomEventName = (typeof CUSTOM_EVENT_NAMES)[number];

export const AguiEventSchema = z.object({
  seq: z.number(),
  type: AguiEventTypeSchema,
  runId: z.string().optional(),
  threadId: z.string().optional(),
  messageId: z.string().optional(),
  role: AguiRoleSchema.optional(),
  delta: z.string().optional(),
  toolCallId: z.string().optional(),
  toolCallName: z.string().optional(),
  name: z.string().optional(),
  value: z.record(z.string(), z.unknown()).optional(),
  message: z.string().optional(),
  result: AguiRunResultSchema.optional(),
  mode: z.string().optional(),
});
export type AguiEvent = z.infer<typeof AguiEventSchema>;

const AGUI_TYPE_SET = new Set<string>(AGUI_EVENT_TYPES);

export type StoredRunEvent = {
  seq: number;
  type: string;
  payload: Record<string, unknown>;
  runId?: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

/** 把 SSE 帧 / 库里的旧事件名（trust、progress、text…）收成 AG-UI。 */
export function toAguiEvent(input: StoredRunEvent): AguiEvent {
  const payload = input.payload || {};
  const runId = str(payload.runId, input.runId || "");
  const seq = input.seq;
  const type = input.type;

  if (AGUI_TYPE_SET.has(type)) {
    const parsed = AguiEventSchema.safeParse({
      ...payload,
      seq,
      type,
      runId,
    });
    if (parsed.success) return parsed.data;
    return { ...payload, seq, type: type as AguiEventType, runId };
  }

  switch (type) {
    case "trust":
      return { seq, type: "CUSTOM", runId, name: "trust", value: payload };
    case "progress":
      return {
        seq,
        type: "CUSTOM",
        runId,
        name: "hint",
        value: { text: str(payload.text) },
      };
    case "text":
      return {
        seq,
        type: "TEXT_MESSAGE_CONTENT",
        runId,
        role: "assistant",
        messageId: `assistant-${runId || "local"}`,
        delta: str(payload.text),
      };
    case "tool":
      return {
        seq,
        type: "TOOL_CALL_START",
        runId,
        toolCallId: `tool-${runId || "local"}-${seq}`,
        toolCallName: str(payload.name, "工具"),
      };
    case "file":
      return {
        seq,
        type: "CUSTOM",
        runId,
        name: "file",
        value: { path: str(payload.path) },
      };
    case "error":
      return { seq, type: "RUN_ERROR", runId, message: str(payload.message, "失败") };
    case "done":
      return {
        seq,
        type: "RUN_FINISHED",
        runId,
        result: payload.ok ? "success" : payload.cancelled ? "cancelled" : "error",
      };
    case "you":
      return {
        seq,
        type: "TEXT_MESSAGE_CONTENT",
        runId,
        role: "user",
        messageId: `user-${runId || "local"}`,
        delta: str(payload.text),
      };
    default:
      return { seq, type: "CUSTOM", runId, name: type, value: payload };
  }
}

export function parseSseData(type: string, data: unknown, fallbackRunId?: string): AguiEvent | null {
  const payload = asRecord(data);
  const seq = Number(payload.seq);
  if (!Number.isFinite(seq) || seq < 0) return null;
  return toAguiEvent({
    seq,
    type: str(payload.type, type),
    payload,
    runId: fallbackRunId,
  });
}

export type ChatBlock =
  | { id: string; kind: "text"; text: string }
  | { id: string; kind: "hint"; text: string }
  | { id: string; kind: "tool"; name: string; path?: string; detail?: string }
  | { id: string; kind: "file"; path: string }
  | { id: string; kind: "trust"; text: string }
  | { id: string; kind: "error"; text: string }
  | { id: string; kind: "status"; text: string; result?: AguiRunResult };

const TOOL_INPUT_KEYS = ["file_path", "path", "file", "target_file", "pattern", "glob", "query"] as const;

/** 只留路径/检索词，丢掉 Write 的整篇 content。 */
export function pickToolInput(input: unknown): Record<string, string> {
  const rec = asRecord(input);
  const out: Record<string, string> = {};
  for (const key of TOOL_INPUT_KEYS) {
    const value = rec[key];
    if (typeof value === "string" && value.trim()) out[key] = value.trim();
  }
  return out;
}

export function summarizeToolInput(
  name: string,
  value?: Record<string, unknown>
): { path?: string; detail?: string } {
  const picked = pickToolInput(value);
  const path = picked.file_path || picked.path || picked.file || picked.target_file;
  const pattern = picked.pattern || picked.glob || picked.query;
  if (path && pattern && (name === "Grep" || name === "Glob")) {
    return { path, detail: `${pattern} · ${path}` };
  }
  if (path) return { path, detail: path };
  if (pattern) return { detail: pattern };
  return {};
}

export type ChatTurn = {
  runId: string;
  you?: string;
  focus?: { headingPath: string[]; quote: string; file?: string };
  blocks: ChatBlock[];
};

const STATUS_TEXT: Record<AguiRunResult, string> = {
  success: "这一轮结束。",
  error: "这一轮没有成功结束。",
  cancelled: "这一轮已取消。",
};

function upsertText(turn: ChatTurn, id: string, text: string): void {
  const existing = turn.blocks.find((b) => b.kind === "text" && b.id === id);
  if (existing && existing.kind === "text") {
    existing.text = text;
    return;
  }
  turn.blocks.push({ id, kind: "text", text });
}

/** 把事件流折成一轮一轮气泡（人右、助手左、工具/文件/提示为块）。 */
export function reduceAguiEvents(events: AguiEvent[]): ChatTurn[] {
  const turns = new Map<string, ChatTurn>();
  const order: string[] = [];
  const buffers = new Map<string, { runId: string; role: AguiRole; text: string }>();

  const ensure = (runId: string): ChatTurn => {
    const id = runId || "local";
    let turn = turns.get(id);
    if (!turn) {
      turn = { runId: id, blocks: [] };
      turns.set(id, turn);
      order.push(id);
    }
    return turn;
  };

  for (const ev of events) {
    const runId = ev.runId || "local";
    const turn = ensure(runId);
    switch (ev.type) {
      case "RUN_STARTED":
        break;
      case "TEXT_MESSAGE_START": {
        const messageId = ev.messageId || `${runId}-${ev.role || "assistant"}`;
        buffers.set(messageId, {
          runId,
          role: ev.role || "assistant",
          text: "",
        });
        break;
      }
      case "TEXT_MESSAGE_CONTENT": {
        const role = ev.role || "assistant";
        const messageId = ev.messageId || `${runId}-${role}`;
        const prev = buffers.get(messageId) || { runId, role, text: "" };
        const incoming = ev.delta || "";
        prev.role = role;
        if (!(role !== "user" && prev.text && incoming === prev.text)) {
          prev.text += incoming;
        }
        buffers.set(messageId, prev);
        if (role === "user") turn.you = prev.text;
        else upsertText(turn, messageId, prev.text);
        break;
      }
      case "TEXT_MESSAGE_END":
        break;
      case "TOOL_CALL_START": {
        const id = ev.toolCallId || `tool-${ev.seq}`;
        if (!turn.blocks.some((b) => b.kind === "tool" && b.id === id)) {
          const summary = summarizeToolInput(ev.toolCallName || "", ev.value);
          turn.blocks.push({
            id,
            kind: "tool",
            name: ev.toolCallName || "工具",
            ...summary,
          });
        }
        break;
      }
      case "TOOL_CALL_END":
        break;
      case "CUSTOM": {
        const value = ev.value || {};
        if (ev.name === "trust") {
          turn.blocks.push({
            id: `trust-${ev.seq}`,
            kind: "trust",
            text: str(value.text),
          });
        } else if (ev.name === "hint") {
          const text = str(value.text);
          if (text) {
            turn.blocks.push({ id: `hint-${ev.seq}`, kind: "hint", text });
          }
        } else if (ev.name === "focus") {
          const quote = str(value.quote).replace(/\s+/g, " ").trim();
          if (quote) {
            const headingPath = Array.isArray(value.headingPath)
              ? value.headingPath
                  .filter((p): p is string => typeof p === "string")
                  .map((p) => p.replace(/\s+/g, " ").trim())
                  .filter(Boolean)
              : [];
            const file = str(value.file).trim();
            turn.focus = {
              headingPath,
              quote,
              ...(file ? { file } : {}),
            };
          }
        } else if (ev.name === "file") {
          const path = str(value.path);
          const already =
            !path ||
            turn.blocks.some(
              (b) =>
                (b.kind === "file" && b.path === path) ||
                (b.kind === "tool" && b.path === path)
            );
          if (!already) {
            turn.blocks.push({ id: `file-${ev.seq}`, kind: "file", path });
          }
        }
        break;
      }
      case "RUN_ERROR":
        turn.blocks.push({
          id: `err-${ev.seq}`,
          kind: "error",
          text: ev.message || "失败",
        });
        break;
      case "RUN_FINISHED": {
        const result = ev.result || "success";
        turn.blocks.push({
          id: `done-${ev.seq}`,
          kind: "status",
          text: STATUS_TEXT[result],
          result,
        });
        break;
      }
    }
  }

  return order.map((id) => turns.get(id)!);
}

export function maxSeq(events: Array<{ seq: number }>): number {
  return events.reduce((max, ev) => (ev.seq > max ? ev.seq : max), 0);
}

export function eventKey(ev: Pick<AguiEvent, "runId" | "seq">): string {
  return `${ev.runId || "local"}:${ev.seq}`;
}

export function mergeAguiEvents(prev: AguiEvent[], incoming: AguiEvent[]): AguiEvent[] {
  const seen = new Set(prev.map(eventKey));
  const next = [...prev];
  for (const ev of incoming) {
    const key = eventKey(ev);
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(ev);
  }
  return next;
}

export type AguiEmit = {
  type: AguiEventType;
  payload: Record<string, unknown>;
};

export function userMessageId(runId: string): string {
  return `user-${runId}`;
}

export function assistantMessageId(runId: string): string {
  return `assistant-${runId}`;
}

/** 后台发出去的载荷，和前端 toAguiEvent / reducer 对得上。 */
export const agui = {
  runStarted(threadId: string, mode?: string): AguiEmit {
    return {
      type: "RUN_STARTED",
      payload: { threadId, ...(mode ? { mode } : {}) },
    };
  },
  textStart(messageId: string, role: AguiRole): AguiEmit {
    return { type: "TEXT_MESSAGE_START", payload: { messageId, role } };
  },
  textDelta(messageId: string, role: AguiRole, delta: string): AguiEmit {
    return { type: "TEXT_MESSAGE_CONTENT", payload: { messageId, role, delta } };
  },
  textEnd(messageId: string, role: AguiRole): AguiEmit {
    return { type: "TEXT_MESSAGE_END", payload: { messageId, role } };
  },
  toolStart(
    toolCallId: string,
    toolCallName: string,
    input?: Record<string, unknown>
  ): AguiEmit {
    const value = pickToolInput(input);
    return {
      type: "TOOL_CALL_START",
      payload: {
        toolCallId,
        toolCallName,
        ...(Object.keys(value).length ? { value } : {}),
      },
    };
  },
  toolEnd(toolCallId: string, toolCallName: string): AguiEmit {
    return { type: "TOOL_CALL_END", payload: { toolCallId, toolCallName } };
  },
  custom(name: CustomEventName, value: Record<string, unknown>): AguiEmit {
    return { type: "CUSTOM", payload: { name, value } };
  },
  error(message: string): AguiEmit {
    return { type: "RUN_ERROR", payload: { message } };
  },
  finished(result: AguiRunResult, extra: Record<string, unknown> = {}): AguiEmit {
    return { type: "RUN_FINISHED", payload: { result, ...extra } };
  },
};
