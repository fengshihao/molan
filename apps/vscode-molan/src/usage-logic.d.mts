export const USAGE_EVENT_NAMES: readonly string[];

export function isUsageEventName(name: string): boolean;

export function hostKind(appName: string): "cursor" | "vscode" | "other";

export function osKind(platform: string): "darwin" | "win32" | "linux" | "other";

export function contentFeatures(markdown: string): Array<"mermaid" | "math" | "table">;

export function createUsageReporter(options: {
  websiteId: string;
  endpoint: string;
  enabled: () => boolean;
  distinctId: () => string;
  context: () => { version?: string; host?: string; os?: string; language?: string };
  send: (url: string, body: unknown, headers: Record<string, string>) => Promise<unknown>;
}): {
  event: (name: string, dedupeKey?: string) => void;
};
