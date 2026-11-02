import * as vscode from "vscode";
import { USAGE_ENDPOINT, USAGE_WEBSITE_ID } from "./usage-config.js";
import {
  contentFeatures,
  createUsageReporter,
  hostKind,
  isUsageEventName,
  osKind,
} from "./usage-logic.mjs";

type TelemetryEnv = {
  telemetryLevel?: number;
  isTelemetryEnabled: boolean;
  machineId: string;
  language: string;
  appName: string;
  onDidChangeTelemetryEnabled?: (listener: (enabled: boolean) => unknown) => vscode.Disposable;
};

const USAGE_LEVEL = 3;

function telemetryEnv(): TelemetryEnv | undefined {
  try {
    return vscode.env as TelemetryEnv | undefined;
  } catch {
    return undefined;
  }
}

/** VS Code「使用情况」且墨览自己的开关打开时才允许。 */
export function usageAllowed(): boolean {
  try {
    if (vscode.workspace.getConfiguration("molan").get<boolean>("usageTelemetry") === false) return false;
  } catch {
    return false;
  }
  const env = telemetryEnv();
  if (!env) return false;
  if (typeof env.telemetryLevel === "number") return env.telemetryLevel >= USAGE_LEVEL;
  return env.isTelemetryEnabled === true;
}

function distinctId(): string {
  if (!usageAllowed()) return "";
  const compact = String(telemetryEnv()?.machineId || "").replace(/[^a-zA-Z0-9]/g, "");
  if (compact.length < 8) return "";
  return compact.slice(0, 32);
}

let extensionVersion = "";

const reporter = createUsageReporter({
  websiteId: USAGE_WEBSITE_ID,
  endpoint: USAGE_ENDPOINT,
  enabled: usageAllowed,
  distinctId,
  context: () => {
    const env = telemetryEnv();
    return {
      version: extensionVersion,
      host: hostKind(env?.appName || ""),
      os: osKind(process.platform),
      language: env?.language || "",
    };
  },
  send: async (url, body, headers) => {
    await fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
  },
});

export function startUsage(context: vscode.ExtensionContext): void {
  const version = (context.extension?.packageJSON as { version?: string } | undefined)?.version;
  extensionVersion = String(version || "");
  reporter.event("session");
  const env = telemetryEnv();
  if (env?.onDidChangeTelemetryEnabled) {
    context.subscriptions.push(
      env.onDidChangeTelemetryEnabled(() => {
        reporter.event("session");
      }),
    );
  }
}

export function usageEvent(name: string, dedupeKey?: string): void {
  if (!isUsageEventName(name)) return;
  reporter.event(name, dedupeKey);
}

/** 按文档去重。docKey 只留在本机，不会随事件发出。 */
export function usageNoteMarkdown(docKey: string, markdown: string): void {
  usageEvent("open", `open:${docKey}`);
  for (const feature of contentFeatures(markdown)) {
    usageEvent(feature, `${feature}:${docKey}`);
  }
}
