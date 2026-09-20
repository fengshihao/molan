import * as vscode from "vscode";
import { renderHostHtml } from "@molan/host";
import type { FrameToHostMessage, HostToFrameMessage } from "@molan/protocol";

function asFrameMessage(raw: unknown): FrameToHostMessage | null {
  if (!raw || typeof raw !== "object" || !("type" in raw)) return null;
  const type = (raw as { type?: unknown }).type;
  if (typeof type !== "string") return null;
  return raw as FrameToHostMessage;
}

export class MolanDocument implements vscode.CustomDocument {
  readonly uri: vscode.Uri;
  content: string;
  restoredFromBackup = false;
  private readonly _onDidDispose = new vscode.EventEmitter<void>();
  readonly onDidDispose = this._onDidDispose.event;

  constructor(uri: vscode.Uri, content: string) {
    this.uri = uri;
    this.content = content;
  }

  static async create(
    uri: vscode.Uri,
    backupId: string | undefined,
  ): Promise<MolanDocument> {
    const source = backupId ? vscode.Uri.parse(backupId) : uri;
    const data = await vscode.workspace.fs.readFile(source);
    const content = new TextDecoder("utf-8").decode(data);
    const document = new MolanDocument(uri, content);
    document.restoredFromBackup = Boolean(backupId);
    return document;
  }

  dispose(): void {
    this._onDidDispose.fire();
    this._onDidDispose.dispose();
  }
}

export class MolanEditorProvider implements vscode.CustomEditorProvider<MolanDocument> {
  static readonly viewType = "molan.markdownEditor";
  private static instance: MolanEditorProvider | undefined;

  private readonly _onDidChangeCustomDocument =
    new vscode.EventEmitter<vscode.CustomDocumentContentChangeEvent<MolanDocument>>();
  readonly onDidChangeCustomDocument = this._onDidChangeCustomDocument.event;

  private readonly panels = new Map<string, vscode.WebviewPanel>();

  static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new MolanEditorProvider(context);
    MolanEditorProvider.instance = provider;
    return vscode.window.registerCustomEditorProvider(
      MolanEditorProvider.viewType,
      provider,
      {
        webviewOptions: { retainContextWhenHidden: true },
        supportsMultipleEditorsPerDocument: false,
      },
    );
  }

  static postToActive(type: "find" | "findNext" | "findPrev" | "openFeedback"): boolean {
    const provider = MolanEditorProvider.instance;
    if (!provider) return false;
    for (const panel of provider.panels.values()) {
      if (panel.active) {
        void panel.webview.postMessage({ type });
        return true;
      }
    }
    return false;
  }

  constructor(private readonly context: vscode.ExtensionContext) {}

  async openCustomDocument(
    uri: vscode.Uri,
    openContext: vscode.CustomDocumentOpenContext,
    _token: vscode.CancellationToken,
  ): Promise<MolanDocument> {
    const document = await MolanDocument.create(uri, openContext.backupId);
    if (document.restoredFromBackup) {
      queueMicrotask(() => this._onDidChangeCustomDocument.fire({ document }));
    }
    return document;
  }

  async resolveCustomEditor(
    document: MolanDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken,
  ): Promise<void> {
    const key = document.uri.toString();
    this.panels.set(key, webviewPanel);

    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: this.getLocalRoots(document),
    };
    webviewPanel.webview.html = this.getHtml(webviewPanel.webview, document);

    const fileName = this.fileName(document.uri);
    let ready = false;

    const sendInit = () => {
      const msg: HostToFrameMessage = {
        type: "init",
        value: document.content,
        fileName,
        dirty: document.restoredFromBackup,
      };
      void webviewPanel.webview.postMessage(msg);
    };

    const changeSub = webviewPanel.webview.onDidReceiveMessage(async (raw) => {
      const msg = asFrameMessage(raw);
      if (!msg) return;
      if (msg.type === "ready") {
        ready = true;
        sendInit();
        return;
      }
      if (msg.type === "change") {
        // Vditor setValue/getValue 往返可能规范化 Markdown；webview 已过滤，这里再挡一层。
        if (msg.value === document.content) return;
        document.content = msg.value;
        this._onDidChangeCustomDocument.fire({ document });
        return;
      }
      if (msg.type === "save") {
        await vscode.commands.executeCommand("workbench.action.files.save");
        return;
      }
      if (msg.type === "quickOpen") {
        await vscode.commands.executeCommand("workbench.action.quickOpen");
        return;
      }
      if (msg.type === "openRelative") {
        await this.openRelativeMarkdown(document.uri, msg.value);
        return;
      }
      if (msg.type === "openExternal") {
        await vscode.env.openExternal(vscode.Uri.parse(msg.value));
        return;
      }
      if (msg.type === "copyText") {
        await vscode.env.clipboard.writeText(msg.value);
      }
    });

    const watcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(vscode.Uri.joinPath(document.uri, ".."), this.fileName(document.uri)),
    );
    const reloadIfClean = async () => {
      const panel = this.panels.get(key);
      if (!panel) return;
      const data = await vscode.workspace.fs.readFile(document.uri);
      const text = new TextDecoder("utf-8").decode(data);
      if (text === document.content) return;
      // 有未保存更改时不覆盖正在编辑的内容
      const dirty = vscode.window.tabGroups.all
        .flatMap((g) => g.tabs)
        .some((tab) => {
          const input = tab.input as { uri?: vscode.Uri } | undefined;
          return input?.uri?.toString() === key && tab.isDirty;
        });
      if (dirty) return;
      document.content = text;
      if (ready) {
        const msg: HostToFrameMessage = {
          type: "setContent",
          value: text,
          fileName,
          dirty: false,
        };
        void panel.webview.postMessage(msg);
      }
    };
    watcher.onDidChange(() => { void reloadIfClean(); });

    webviewPanel.onDidDispose(() => {
      changeSub.dispose();
      watcher.dispose();
      this.panels.delete(key);
    });
  }

  async saveCustomDocument(
    document: MolanDocument,
    _cancellation: vscode.CancellationToken,
  ): Promise<void> {
    await this.writeFile(document.uri, document.content);
    const panel = this.panels.get(document.uri.toString());
    if (panel) {
      const msg: HostToFrameMessage = { type: "saved" };
      void panel.webview.postMessage(msg);
    }
  }

  async saveCustomDocumentAs(
    document: MolanDocument,
    destination: vscode.Uri,
    _cancellation: vscode.CancellationToken,
  ): Promise<void> {
    await this.writeFile(destination, document.content);
  }

  async revertCustomDocument(
    document: MolanDocument,
    _cancellation: vscode.CancellationToken,
  ): Promise<void> {
    const data = await vscode.workspace.fs.readFile(document.uri);
    document.content = new TextDecoder("utf-8").decode(data);
    const panel = this.panels.get(document.uri.toString());
    if (panel) {
      const msg: HostToFrameMessage = {
        type: "setContent",
        value: document.content,
        fileName: this.fileName(document.uri),
        dirty: false,
      };
      void panel.webview.postMessage(msg);
    }
  }

  async backupCustomDocument(
    document: MolanDocument,
    context: vscode.CustomDocumentBackupContext,
    _cancellation: vscode.CancellationToken,
  ): Promise<vscode.CustomDocumentBackup> {
    await this.writeFile(context.destination, document.content);
    return {
      id: context.destination.toString(),
      delete: async () => {
        try {
          await vscode.workspace.fs.delete(context.destination);
        } catch {
          /* ignore */
        }
      },
    };
  }

  private async writeFile(uri: vscode.Uri, text: string): Promise<void> {
    await vscode.workspace.fs.writeFile(uri, new TextEncoder().encode(text));
  }

  private fileName(uri: vscode.Uri): string {
    const parts = uri.path.split("/");
    return parts[parts.length - 1] || uri.path;
  }

  private async openRelativeMarkdown(from: vscode.Uri, href: string): Promise<void> {
    const pathPart = href.split("#")[0].split("?")[0].trim();
    if (!pathPart) return;
    const segments = pathPart.replace(/\\/g, "/").split("/").filter((s) => s && s !== ".");
    if (!segments.length) return;
    const target = vscode.Uri.joinPath(from, "..", ...segments);
    try {
      await vscode.workspace.fs.stat(target);
    } catch {
      void vscode.window.showWarningMessage(`找不到「${this.fileName(target)}」`);
      return;
    }
    await vscode.commands.executeCommand("vscode.openWith", target, MolanEditorProvider.viewType);
  }

  private getLocalRoots(document: MolanDocument): vscode.Uri[] {
    const roots = [vscode.Uri.joinPath(this.context.extensionUri, "media")];
    if (vscode.workspace.workspaceFolders?.length) {
      roots.push(...vscode.workspace.workspaceFolders.map((folder) => folder.uri));
    }
    roots.push(vscode.Uri.joinPath(document.uri, ".."));
    return roots;
  }

  private getHtml(webview: vscode.Webview, document: MolanDocument): string {
    const nonce = getNonce();
    const media = vscode.Uri.joinPath(this.context.extensionUri, "media");
    const vditorRoot = vscode.Uri.joinPath(media, "vditor");
    const molanCss = webview.asWebviewUri(vscode.Uri.joinPath(media, "molan.css"));
    const vditorCss = webview.asWebviewUri(vscode.Uri.joinPath(vditorRoot, "dist", "index.css"));
    const vditorMethodJs = webview.asWebviewUri(vscode.Uri.joinPath(vditorRoot, "dist", "method.min.js"));
    const vditorLuteJs = webview.asWebviewUri(vscode.Uri.joinPath(vditorRoot, "dist", "js", "lute", "lute.min.js"));
    const vditorIconsJs = webview.asWebviewUri(vscode.Uri.joinPath(vditorRoot, "dist", "js", "icons", "ant.js"));
    const editorJs = webview.asWebviewUri(vscode.Uri.joinPath(media, "molan-editor.js"));
    const bridgeJs = webview.asWebviewUri(vscode.Uri.joinPath(media, "vscode-bridge.js"));
    const vditorCdn = webview.asWebviewUri(vditorRoot).toString();
    const linkBase = `${webview.asWebviewUri(vscode.Uri.joinPath(document.uri, "..")).toString()}/`;
    const csp = [
      `default-src 'none'`,
      `img-src ${webview.cspSource} data: blob: https: http:`,
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `font-src ${webview.cspSource} data:`,
      `script-src ${webview.cspSource} 'nonce-${nonce}' 'unsafe-eval'`,
      `connect-src ${webview.cspSource}`,
      `worker-src ${webview.cspSource} blob:`,
      `child-src blob:`,
    ].join("; ");

    return renderHostHtml({
      variant: "vscode",
      nonce,
      csp,
      defaultTheme: "night",
      statusRight: "VS Code · 写回原文件",
      feedback: {
        extensionVersion: String(this.context.extension.packageJSON.version ?? ""),
        editorVersion: vscode.version,
      },
      assets: {
        molanCss: molanCss.toString(),
        vditorCss: vditorCss.toString(),
        vditorMethodJs: vditorMethodJs.toString(),
        vditorLuteJs: vditorLuteJs.toString(),
        vditorIconsJs: vditorIconsJs.toString(),
        editorJs: editorJs.toString(),
        bridgeJs: bridgeJs.toString(),
        vditorCdn,
        linkBase,
      },
    });
  }
}

function getNonce(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";
  for (let i = 0; i < 32; i += 1) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
}
