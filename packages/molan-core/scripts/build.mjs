import { cpSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readEditorBody, wrapEditorIife } from "./editor-modules.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src");
const dist = join(root, "dist");
const viewer = join(root, "..", "..", "apps", "studio");

mkdirSync(dist, { recursive: true });

const editorJs = wrapEditorIife(readEditorBody(root));
writeFileSync(join(dist, "molan-editor.js"), editorJs);
cpSync(join(src, "molan.css"), join(dist, "molan.css"));

// 工作室仍吃单文件 IIFE；构建产物回写 apps/studio
for (const file of ["molan-editor.js", "molan.css"]) {
  const from = join(dist, file);
  const studioCopy = join(viewer, file);
  try {
    const next = readFileSync(from);
    const prev = readFileSync(studioCopy);
    if (!next.equals(prev)) cpSync(from, studioCopy);
  } catch {
    cpSync(from, studioCopy);
  }
}

writeFileSync(
  join(dist, "index.d.ts"),
  `export type { EditorApi, EditorOptions } from "@molan/protocol";\n`,
);

console.log("built @molan/core → dist/（editor 由 src/editor/* 拼接）");
