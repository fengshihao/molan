#!/usr/bin/env bash
# 从录屏生成官网教程用 demo GIF（需本机 ffmpeg）。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${1:-$HOME/Downloads/molan.mp4}"
ASSETS="$ROOT/site/assets"
TRY="$ROOT/site/try"

if [[ ! -f "$SRC" ]]; then
  echo "找不到视频: $SRC" >&2
  exit 1
fi

make_gif() {
  local start="$1" dur="$2" out="$3"
  ffmpeg -y -ss "$start" -i "$SRC" -t "$dur" \
    -vf "fps=5,scale=960:-2:flags=lanczos,split[s0][s1];[s0]palettegen=stats_mode=diff:max_colors=128[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" \
    -loop 0 "$out"
}

# start duration — 与 guide.html 中四段演示对应
make_gif 30 11 "$ASSETS/demo-theme.gif"
make_gif 55 10 "$ASSETS/demo-spacing.gif"
make_gif 84 12 "$ASSETS/demo-table.gif"
make_gif 116 11 "$ASSETS/demo-flowchart.gif"

cp "$ASSETS"/demo-*.gif "$TRY/"
echo "已写入 site/assets 与 site/try"
