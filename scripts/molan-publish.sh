#!/usr/bin/env bash
# 发布墨览：腾讯云网站 + Cursor（Open VSX）；VS Code 商店打开管理页人工上传。
# 用法：
#   bash scripts/molan-publish.sh                 # 网站（若有 upload.sh）+ Open VSX + 打开 VS 商店页
#   bash scripts/molan-publish.sh --skip-site     # 仅打包 + Open VSX + 打开 VS 商店页
#   bash scripts/molan-publish.sh --extension-only # 同 --skip-site
#   pnpm molan:publish
#   pnpm molan:publish:extension
#
# 需要环境变量 OVSX_PAT（Open VSX 令牌，可写在 ~/.zshrc）。
# 网站同步脚本 apps/studio/deploy/upload.sh 在 .gitignore，需本机自行放置；
# 模板见 apps/studio/deploy.example/upload.sh.example
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXT_DIR="${ROOT}/apps/vscode-molan"
UPLOAD="${ROOT}/apps/studio/deploy/upload.sh"
UPLOAD_EXAMPLE="${ROOT}/apps/studio/deploy.example/upload.sh.example"
MARKET_URL="https://marketplace.visualstudio.com/manage/publishers/fengshihao"

SKIP_SITE=0
for arg in "$@"; do
  case "${arg}" in
    --skip-site | --extension-only)
      SKIP_SITE=1
      ;;
    -h | --help | help)
      sed -n '2,14p' "$0"
      exit 0
      ;;
    *)
      echo "未知参数：${arg}" >&2
      echo "用法：bash scripts/molan-publish.sh [--skip-site|--extension-only]" >&2
      exit 1
      ;;
  esac
done
if [[ "${MOLAN_SKIP_SITE:-}" == "1" ]]; then
  SKIP_SITE=1
fi

cd "${ROOT}"

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "需要 ${1}" >&2
    exit 1
  fi
}

need pnpm
need npx
need node

if [[ -z "${OVSX_PAT:-}" ]]; then
  echo "未设置 OVSX_PAT。请在本机导出 Open VSX 令牌后再运行。" >&2
  echo "  export OVSX_PAT=\"…\"   # https://open-vsx.org/user-settings/tokens" >&2
  exit 1
fi

VERSION="$(node -p "require('${EXT_DIR}/package.json').version")"
echo "==> 墨览 ${VERSION}"

echo "==> 0/4 跑测试（发布前必须通过）"
pnpm test
pnpm --filter molan-markdown check

if command -v git >/dev/null 2>&1 && git -C "${ROOT}" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  local_ahead="$(git -C "${ROOT}" rev-list --count "@{upstream}..HEAD" 2>/dev/null || echo 0)"
  if [[ "${local_ahead}" != "0" ]]; then
    echo "注意：本地比远程超前 ${local_ahead} 个提交。发版前建议先 git push。"
  fi
fi

echo "==> 1/4 打包 .vsix"
bash "${ROOT}/scripts/vscode-molan.sh" package
VSIX="$(ls -t "${EXT_DIR}"/molan-markdown-*.vsix | head -n 1)"
echo "    ${VSIX}"

if [[ "${SKIP_SITE}" == "1" ]]; then
  echo "==> 2/4 跳过网站同步（--skip-site）"
elif [[ ! -x "${UPLOAD}" ]]; then
  echo "==> 2/4 跳过网站同步（未找到可执行的 upload.sh）" >&2
  echo "    期望路径：${UPLOAD}" >&2
  echo "    该目录在 .gitignore，不会随 git 下发。若需同步 https://molan.guoyoutech.cn/：" >&2
  echo "      mkdir -p apps/studio/deploy" >&2
  echo "      cp ${UPLOAD_EXAMPLE} apps/studio/deploy/upload.sh" >&2
  echo "      # 编辑 SSH/rsync 目标后 chmod +x" >&2
  echo "    仅发扩展可改用：pnpm molan:publish:extension" >&2
else
  echo "==> 2/4 同步腾讯云 https://molan.guoyoutech.cn/"
  bash "${UPLOAD}"
fi

echo "==> 3/4 发布 Cursor / Open VSX"
set +e
OVSX_OUT="$(npx --yes ovsx publish "${VSIX}" -p "${OVSX_PAT}" 2>&1)"
OVSX_CODE=$?
set -e
printf '%s\n' "${OVSX_OUT}"
if [[ "${OVSX_CODE}" -ne 0 ]]; then
  if printf '%s' "${OVSX_OUT}" | grep -q "isn't active"; then
    echo "    Open VSX 已收到 ${VERSION}，正在激活，稍后可见。"
  else
    exit "${OVSX_CODE}"
  fi
fi
echo "    https://open-vsx.org/extension/fengshihao/molan-markdown"

echo "==> 4/4 打开 VS Code Marketplace（需人工上传）"
echo "    安装包：${VSIX}"
echo "    ${MARKET_URL}"
case "$(uname -s 2>/dev/null || echo unknown)" in
  Darwin) open "${MARKET_URL}" ;;
  MINGW* | MSYS* | CYGWIN*) cmd.exe /c start "" "${MARKET_URL}" ;;
  *) xdg-open "${MARKET_URL}" >/dev/null 2>&1 || true ;;
esac

echo "完成。"
