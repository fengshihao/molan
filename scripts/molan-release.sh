#!/usr/bin/env bash
# 一步发版：自检 → 打标签 v{package.json 版本} → 推送，由 CI 打 GitHub Release + Open VSX。
# Release 说明来自 commit 汇总（scripts/release-notes-from-commits.mjs）。
#
#   ./molan release
#   ./molan release --dry-run
#
# 发版前请已在 main 上合并功能，且 apps/vscode-molan/package.json 版本号已递增。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXT_DIR="${ROOT}/apps/vscode-molan"
DRY_RUN=0

for arg in "$@"; do
  case "${arg}" in
    --dry-run | -n) DRY_RUN=1 ;;
    -h | --help | help)
      sed -n '2,10p' "$0"
      exit 0
      ;;
    *)
      echo "未知参数：${arg}（支持 --dry-run）" >&2
      exit 1
      ;;
  esac
done

cd "${ROOT}"

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "需要 ${1}" >&2
    exit 1
  }
}
need git
need node
need pnpm

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "不在 git 仓库内" >&2
  exit 1
fi

BRANCH="$(git branch --show-current)"
if [[ "${BRANCH}" != "main" ]]; then
  echo "请在 main 分支发版（当前：${BRANCH}）" >&2
  exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
  echo "工作区有未提交改动，请先 commit 或 stash" >&2
  git status -sb
  exit 1
fi

VERSION="$(node -p "require('${EXT_DIR}/package.json').version")"
TAG="v${VERSION}"

if git rev-parse "${TAG}" >/dev/null 2>&1; then
  echo "标签 ${TAG} 已存在，请先把 package.json 版本号调高再发版" >&2
  exit 1
fi

echo "==> 版本 ${VERSION}（将创建标签 ${TAG}）"
echo "==> Release 说明预览："
node "${ROOT}/scripts/release-notes-from-commits.mjs" "${TAG}" || true
echo ""

echo "==> 跑检查"
pnpm test
pnpm --filter molan-markdown check
node "${ROOT}/scripts/check-pr.mjs"
node "${ROOT}/scripts/smoke-site.mjs"

if [[ "${DRY_RUN}" == "1" ]]; then
  echo "==> --dry-run：未创建标签。确认后执行：./molan release"
  exit 0
fi

echo "==> 创建并推送 ${TAG}"
git tag -a "${TAG}" -m "墨览 ${TAG}"
git push origin "${TAG}"

echo ""
echo "已推送 ${TAG}。CI 会打包 .vsix、创建 GitHub Release（说明来自 commit）、并尝试发 Open VSX。"
echo "跟踪：https://github.com/fengshihao/molan/actions/workflows/publish-extension.yml"
