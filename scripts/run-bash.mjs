import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function isWslBash(bin) {
  const n = bin.replace(/\//g, "\\").toLowerCase();
  return n.endsWith("\\system32\\bash.exe") || n.endsWith("\\sysnative\\bash.exe");
}

function fromPath() {
  const exts =
    process.platform === "win32"
      ? (process.env.PATHEXT || ".EXE;.CMD;.BAT").split(";").filter(Boolean)
      : [""];
  const names =
    process.platform === "win32"
      ? ["bash.exe", "bash", ...exts.map((e) => `bash${e}`)]
      : ["bash"];
  const dirs = (process.env.PATH || "").split(path.delimiter).filter(Boolean);
  const out = [];
  const seen = new Set();
  for (const dir of dirs) {
    for (const name of names) {
      const candidate = path.join(dir, name);
      const key = candidate.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(candidate);
    }
  }
  return out;
}

function findBash() {
  if (process.env.BASH && fs.existsSync(process.env.BASH)) {
    return process.env.BASH;
  }

  const known =
    process.platform === "win32"
      ? [
          "C:\\Program Files\\Git\\bin\\bash.exe",
          "C:\\Program Files\\Git\\usr\\bin\\bash.exe",
          "C:\\Program Files (x86)\\Git\\bin\\bash.exe",
          path.join(process.env.LOCALAPPDATA || "", "Programs", "Git", "bin", "bash.exe"),
        ]
      : [];

  // Windows：优先 Git for Windows，避免 PATH 上的 WSL bash.exe
  if (process.platform === "win32") {
    for (const candidate of known) {
      if (candidate && fs.existsSync(candidate)) return candidate;
    }
  }

  for (const candidate of fromPath()) {
    if (!fs.existsSync(candidate) || isWslBash(candidate)) continue;
    return candidate;
  }

  for (const candidate of known) {
    if (candidate && fs.existsSync(candidate)) return candidate;
  }
  return null;
}

const scriptArg = process.argv[2];
if (!scriptArg) {
  console.error("用法：node scripts/run-bash.mjs <script.sh> [args...]");
  process.exit(1);
}

const bash = findBash();
if (!bash) {
  console.error(
    "找不到 bash。Windows 请安装 Git for Windows（自带 Git Bash），装完后重新打开终端再跑 pnpm dev。"
  );
  process.exit(1);
}

const script = path.isAbsolute(scriptArg) ? scriptArg : path.resolve(root, scriptArg);
const extra = process.argv.slice(3);
const child = spawn(bash, [script, ...extra], {
  stdio: "inherit",
  windowsHide: true,
  env: process.env,
  cwd: process.cwd(),
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
child.on("error", (err) => {
  const code = err && typeof err === "object" && "code" in err ? err.code : "";
  if (code === "ENOENT") {
    console.error(
      "找不到 bash。Windows 请安装 Git for Windows（自带 Git Bash），装完后重新打开终端再跑 pnpm dev。"
    );
  } else {
    console.error(err);
  }
  process.exit(1);
});
