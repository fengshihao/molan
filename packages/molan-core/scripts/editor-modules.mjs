import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** 拼接顺序必须与原 IIFE 一致：let/const 不能跨文件提前引用。 */
export const EDITOR_MODULES = [
  "load.js",
  "i18n.js",
  "mermaid-theme.js",
  "svg-fit.js",
  "lightbox.js",
  "svg-export.js",
  "mermaid-preview.js",
  "table.js",
  "source.js",
  "outline.js",
  "format-bar.js",
  "mermaid-bind.js",
  "find.js",
  "type.js",
  "theme-tweak.js",
  "theme.js",
  "image.js",
  "mermaid-editor.js",
  "markdown.js",
  "task.js",
  "ir.js",
  "insert.js",
  "selection.js",
  "create.js",
  "export.js",
];

export const EDITOR_BANNER = `/**
 * 墨览编辑器核心：Vditor 初始化、Mermaid 主题、流程图工具条与灯箱。
 * 源码在 src/editor/*，构建时拼接为 IIFE。浏览器工作室与 VSCode 扩展共用。
 */
`;

export function editorDir(packageRoot) {
  return join(packageRoot, "src", "editor");
}

export function readEditorBody(packageRoot) {
  return EDITOR_MODULES.map((name) =>
    readFileSync(join(editorDir(packageRoot), name), "utf8").replace(/\s+$/, ""),
  ).join("\n\n");
}

export function wrapEditorIife(body) {
  return `${EDITOR_BANNER}(function (global) {\n${body.replace(/\s+$/, "")}\n})(window);\n`;
}

export function packageRootFromHere() {
  return join(dirname(fileURLToPath(import.meta.url)), "..");
}
