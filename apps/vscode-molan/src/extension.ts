import * as vscode from "vscode";
import { MOLAN_ISSUES_CHOOSE } from "@molan/host";
import { MolanEditorProvider } from "./markdownEditorProvider";
import { startUsage, usageEvent } from "./usage";

export function activate(context: vscode.ExtensionContext): void {
  context.subscriptions.push(MolanEditorProvider.register(context));
  startUsage(context);

  context.subscriptions.push(
    vscode.commands.registerCommand("molan.openWith", async (uri?: vscode.Uri) => {
      const target = uri ?? getActiveEditorUri();
      if (!target) {
        void vscode.window.showWarningMessage("请先选择一个 Markdown 文件");
        return;
      }
      await vscode.commands.executeCommand("vscode.openWith", target, MolanEditorProvider.viewType);
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("molan.setAsDefault", async () => {
      const config = vscode.workspace.getConfiguration("workbench");
      const current = {
        ...(config.get<Record<string, string>>("editorAssociations") ?? {}),
      };
      current["*.md"] = MolanEditorProvider.viewType;
      current["*.markdown"] = MolanEditorProvider.viewType;
      current["*.mdown"] = MolanEditorProvider.viewType;
      current["*.mdx"] = MolanEditorProvider.viewType;
      await config.update("editorAssociations", current, vscode.ConfigurationTarget.Global);
      void vscode.window.showInformationMessage(
        "已将墨览设为 Markdown 默认编辑器。点击 .md 文件将用墨览打开。",
      );
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("molan.reopenAsText", async () => {
      const target = getActiveEditorUri();
      if (!target) {
        void vscode.window.showWarningMessage("当前没有可切换的 Markdown 文件");
        return;
      }
      await vscode.commands.executeCommand("vscode.openWith", target, "default");
    }),
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("molan.find", () => {
      usageEvent("find");
      MolanEditorProvider.postToActive("find");
    }),
    vscode.commands.registerCommand("molan.findNext", () => {
      usageEvent("find");
      MolanEditorProvider.postToActive("findNext");
    }),
    vscode.commands.registerCommand("molan.findPrev", () => {
      usageEvent("find");
      MolanEditorProvider.postToActive("findPrev");
    }),
    vscode.commands.registerCommand("molan.formatBold", () => {
      usageEvent("format");
      MolanEditorProvider.postToActive("formatBold");
    }),
    vscode.commands.registerCommand("molan.cut", () => MolanEditorProvider.postToActive("cut")),
    vscode.commands.registerCommand("molan.formatItalic", () => {
      usageEvent("format");
      MolanEditorProvider.postToActive("formatItalic");
    }),
    vscode.commands.registerCommand("molan.formatLink", () => {
      usageEvent("format");
      MolanEditorProvider.postToActive("formatLink");
    }),
    vscode.commands.registerCommand("molan.toggleMode", () => MolanEditorProvider.postToActive("toggleMode")),
    vscode.commands.registerCommand("molan.outlineToggle", () => {
      usageEvent("outline");
      MolanEditorProvider.postToActive("outlineToggle");
    }),
    vscode.commands.registerCommand("molan.reportFeedback", async () => {
      if (MolanEditorProvider.postToActive("openFeedback")) return;
      await vscode.env.openExternal(vscode.Uri.parse(MOLAN_ISSUES_CHOOSE));
    }),
  );
}

function getActiveEditorUri(): vscode.Uri | undefined {
  if (vscode.window.activeTextEditor?.document.uri) {
    return vscode.window.activeTextEditor.document.uri;
  }
  const tab = vscode.window.tabGroups.activeTabGroup.tabs.find((item) => item.isActive);
  const input = tab?.input as { uri?: vscode.Uri } | undefined;
  return input?.uri;
}

export function deactivate(): void {
  /* no-op */
}
