#!/usr/bin/env node
/**
 * GitHub Release 说明：自上一枚 v* 标签到当前标签（或 HEAD）之间的 commit 主题汇总。
 *
 *   node scripts/release-notes-from-commits.mjs              # package.json 版本，写到 HEAD
 *   node scripts/release-notes-from-commits.mjs v0.1.38      # 指定标签
 *   node scripts/release-notes-from-commits.mjs v0.1.38 v0.1.37  # 显式范围（CI 可用）
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const extPkg = path.join(root, "apps/vscode-molan/package.json");

function git(args) {
  return execSync(`git ${args}`, { encoding: "utf8", cwd: root }).trim();
}

function listVersionTags() {
  const out = git("tag -l 'v*' --sort=-version:refname");
  return out ? out.split("\n").filter(Boolean) : [];
}

function normalizeTag(tag) {
  const t = tag.trim();
  return t.startsWith("v") ? t : `v${t}`;
}

function readPackageVersion() {
  const pkg = JSON.parse(fs.readFileSync(extPkg, "utf8"));
  return String(pkg.version);
}

const argTag = process.argv[2];
const argPrev = process.argv[3];

const currentRef = argTag
  ? normalizeTag(argTag)
  : normalizeTag(readPackageVersion());

const tags = listVersionTags();
let prevTag = argPrev ? normalizeTag(argPrev) : null;
if (!prevTag) {
  const idx = tags.indexOf(currentRef);
  if (idx >= 0 && idx + 1 < tags.length) {
    prevTag = tags[idx + 1];
  } else if (tags.length > 0 && tags[0] !== currentRef) {
    prevTag = tags[0];
  }
}

const tagExists = tags.includes(currentRef);
const logEnd = tagExists ? currentRef : "HEAD";
let range;
if (prevTag) {
  range = `${prevTag}..${logEnd}`;
} else {
  range = logEnd;
}

let subjects;
try {
  subjects = git(`log ${range} --pretty=format:%s --no-merges`);
} catch {
  console.error(`无法读取 git log（范围 ${range}）`);
  process.exit(1);
}

const skip = /^chore:\s*发布/i;
const lines = subjects
  .split("\n")
  .map((s) => s.trim())
  .filter(Boolean)
  .filter((s) => !skip.test(s));

if (lines.length === 0) {
  console.error(`范围 ${range} 内没有可展示的 commit（已跳过「chore: 发布」）`);
  process.exit(1);
}

const hasFix = lines.some((l) => /^(fix|修复)/i.test(l));
const heading = hasFix && lines.every((l) => /^(fix|修复)/i.test(l))
  ? "## 修复"
  : "## 更新";

const footer = "\n\n请 **Reload Window** 后打开 Markdown 文件体验。\n";
const bullets = lines.map((l) => `- ${l}`).join("\n");
process.stdout.write(`${heading}\n${bullets}${footer}`);
