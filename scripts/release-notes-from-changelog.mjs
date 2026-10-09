#!/usr/bin/env node
/**
 * Print GitHub Release notes for an extension version from apps/vscode-molan/CHANGELOG.md.
 * Usage: node scripts/release-notes-from-changelog.mjs 0.1.37
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const changelogPath = path.join(root, "apps/vscode-molan/CHANGELOG.md");

const version = process.argv[2]?.replace(/^v/, "");
if (!version) {
  console.error("用法: node scripts/release-notes-from-changelog.mjs <version>");
  process.exit(1);
}

const text = fs.readFileSync(changelogPath, "utf8");
const header = `## ${version}`;
const start = text.indexOf(header);
if (start === -1) {
  console.error(`在 CHANGELOG 中未找到 ${header}`);
  process.exit(1);
}

const afterHeader = text.indexOf("\n", start) + 1;
const rest = text.slice(afterHeader);
const next = rest.search(/\n## /);
const body = (next === -1 ? rest : rest.slice(0, next)).trim();

const lines = body
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line.startsWith("- "))
  .map((line) => line.slice(2));

if (lines.length === 0) {
  console.error(`版本 ${version} 下没有列表条目`);
  process.exit(1);
}

const heading =
  lines.length === 1 && /修复|修/.test(lines[0])
    ? "## 修复"
    : lines.length === 1
      ? "## 更新"
      : "## 更新";

const footer = "\n\n请 **Reload Window** 后打开 Markdown 文件体验。\n";
process.stdout.write(
  `${heading}\n${lines.map((l) => `- ${l}`).join("\n")}${footer}`,
);
