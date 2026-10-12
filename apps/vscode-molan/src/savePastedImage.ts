import * as vscode from "vscode";

function mimeToExtension(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes("jpeg") || m.includes("jpg")) return "jpg";
  if (m.includes("webp")) return "webp";
  if (m.includes("gif")) return "gif";
  return "png";
}

function escapeMdAlt(name: string): string {
  const base = name.replace(/\.[^.]+$/, "");
  return base.replace(/[[\]\n]/g, " ").trim() || "image";
}

function markdownImageRef(fileName: string): string {
  const href = /[\s<>]/.test(fileName) ? encodeURI(fileName) : fileName;
  return `![${escapeMdAlt(fileName)}](${href})`;
}

function pasteStamp(date: Date): string {
  return date.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
}

export async function savePastedImageBeside(
  documentUri: vscode.Uri,
  mime: string,
  bytes: Uint8Array,
): Promise<string> {
  if (documentUri.scheme !== "file") {
    throw new Error("need-saved-file");
  }
  const ext = mimeToExtension(mime);
  const dir = vscode.Uri.joinPath(documentUri, "..");
  const stamp = pasteStamp(new Date());
  for (let n = 0; n < 50; n += 1) {
    const fileName = n === 0 ? `paste-${stamp}.${ext}` : `paste-${stamp}-${n}.${ext}`;
    const target = vscode.Uri.joinPath(dir, fileName);
    try {
      await vscode.workspace.fs.stat(target);
    } catch {
      await vscode.workspace.fs.writeFile(target, bytes);
      return markdownImageRef(fileName);
    }
  }
  throw new Error("too-many-collisions");
}
