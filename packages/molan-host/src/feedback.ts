/** 墨览反馈 → GitHub Issue 预填 URL */

export const MOLAN_ISSUES_CHOOSE =
  "https://github.com/fengshihao/molan/issues/new/choose";

export const MOLAN_ISSUES_NEW = "https://github.com/fengshihao/molan/issues/new";

export type FeedbackKind = "bug" | "idea";

export type FeedbackEnv = {
  extensionVersion: string;
  editorVersion: string;
};

export type FeedbackDraft = {
  kind: FeedbackKind;
  title: string;
  body: string;
  env: FeedbackEnv;
};

const MAX_FIELD = 1800;

function trimField(text: string, max = MAX_FIELD): string {
  const t = text.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

function envLine(env: FeedbackEnv): string {
  const ext = env.extensionVersion.trim() || "unknown";
  const ide = env.editorVersion.trim() || "unknown";
  return `扩展 ${ext} · 编辑器 ${ide}`;
}

/** 拼 GitHub Issue Form 预填 URL（字段 id 对齐 .github/ISSUE_TEMPLATE） */
export function buildFeedbackIssueUrl(draft: FeedbackDraft): string {
  const title = trimField(draft.title, 200);
  const body = trimField(draft.body);
  const version = envLine(draft.env);
  const params = new URLSearchParams();

  if (draft.kind === "bug") {
    params.set("template", "bug.yml");
    params.set("title", title.startsWith("bug:") ? title : `bug: ${title}`);
    params.set("surface", "VS Code / Cursor 扩展");
    params.set("version", version);
    params.set("steps", body);
    params.set("expected", "（请补充期望行为）");
    params.set("actual", "（请补充实际行为；详见上方步骤）");
  } else {
    params.set("template", "idea.yml");
    params.set("title", title.startsWith("idea:") ? title : `idea: ${title}`);
    params.set("intent", title);
    params.set("scope", "不确定");
    params.set("detail", `${body}\n\n---\n环境：${version}`);
  }

  return `${MOLAN_ISSUES_NEW}?${params.toString()}`;
}
