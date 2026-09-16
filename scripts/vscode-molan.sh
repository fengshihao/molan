#!/usr/bin/env bash
# 本地编译墨览 VS Code / Cursor 扩展（apps/vscode-molan）
# 兼容 macOS / Linux / Windows Git Bash
# 用法：
#   bash scripts/vscode-molan.sh            # 同步媒体并编译 TypeScript
#   bash scripts/vscode-molan.sh package    # 编译并生成 .vsix
#   bash scripts/vscode-molan.sh install    # 打包后安装到 Cursor / VS Code
#   bash scripts/vscode-molan.sh check      # 编译并跑检查
#   pnpm vscode:molan / pnpm vscode:molan:package / pnpm vscode:molan:install
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXT_DIR="${ROOT}/apps/vscode-molan"
ACTION="${1:-compile}"

cd "${ROOT}"

need_pnpm() {
  if ! command -v pnpm >/dev/null 2>&1; then
    echo "需要 pnpm（仓库 packageManager: pnpm@8.6.9）" >&2
    exit 1
  fi
}

ensure_deps() {
  need_pnpm
  node "${EXT_DIR}/scripts/ensure-deps.mjs"
}

latest_vsix() {
  local vsix=""
  vsix="$(ls -t "${EXT_DIR}"/molan-markdown-*.vsix 2>/dev/null | head -n 1 || true)"
  if [[ -z "${vsix}" ]]; then
    echo "未找到 ${EXT_DIR}/molan-markdown-*.vsix，请先 package" >&2
    exit 1
  fi
  echo "${vsix}"
}

install_cli() {
  if command -v cursor >/dev/null 2>&1; then
    echo "cursor"
    return 0
  fi
  if command -v code >/dev/null 2>&1; then
    echo "code"
    return 0
  fi
  echo ""
}

run_compile() {
  ensure_deps
  echo "==> 编译墨览扩展（molan-core/host 构建 + sync-media + tsc）"
  pnpm --filter molan-markdown compile
  echo "编译完成：${EXT_DIR}/out"
  echo "调试：仓库根目录按 F5（「运行墨览扩展」）"
  echo "装到本机：pnpm vscode:molan:install"
}

run_package() {
  ensure_deps
  echo "==> 打包墨览扩展 .vsix"
  pnpm --filter molan-markdown package
  echo "已生成：$(latest_vsix)"
}

run_install() {
  run_package
  local vsix cli
  vsix="$(latest_vsix)"
  cli="$(install_cli)"
  if [[ -z "${cli}" ]]; then
    echo "未找到 cursor / code 命令行。可手动安装：" >&2
    echo "  cursor --install-extension \"${vsix}\"" >&2
    echo "  code --install-extension \"${vsix}\"" >&2
    exit 1
  fi
  echo "==> 安装到 ${cli}"
  "${cli}" --install-extension "${vsix}" --force
  echo "已安装 ${vsix}"
  echo "请重载窗口后打开任意 .md 文件。"
}

run_check() {
  ensure_deps
  echo "==> 编译并检查墨览扩展"
  pnpm --filter molan-markdown check
}

case "${ACTION}" in
  compile)
    run_compile
    ;;
  package)
    run_package
    ;;
  install)
    run_install
    ;;
  check)
    run_check
    ;;
  -h|--help|help)
    sed -n '2,9p' "$0"
    ;;
  *)
    echo "未知命令：${ACTION}" >&2
    echo "用法：bash scripts/vscode-molan.sh [compile|package|install|check]" >&2
    exit 1
    ;;
esac
