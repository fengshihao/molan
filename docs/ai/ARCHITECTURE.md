# 架构与真源

## 产品形态

| 端 | 位置 | 说明 |
|----|------|------|
| 浏览器工作室 | `apps/studio` | `./molan try` |
| Cursor / VS Code 扩展 | `apps/vscode-molan` | `./molan package` / `publish` |
| 官网 | `site/` | GitHub Pages |
| DesignWeave 工作台 | 并列仓 `../DesignWeave` | `file:` 依赖 `@molan/host` |

共享包：

- `@molan/protocol` — 宿主协议 +（暂含）工作台 AG-UI 事件类型
- `@molan/core` — 编辑器 / CSS
- `@molan/host` — 壳与桥

## 发版

- 公开脚本：`scripts/molan-publish.sh`、`.github/workflows/publish-extension.yml`
- Token：GitHub Secrets `OVSX_PAT`（及可选 `VSCE_PAT`），**不要**写进仓库
- 网站运维脚本（SSH/rsync）仍在本机 gitignore 的 `apps/studio/deploy/`，与扩展发版无关

## DesignWeave

开发机需并列：

```text
Work/
  DesignWeave/
  molan/
```

工作台 `pnpm predev` 会 `pnpm build` 本仓并 sync 到 `apps/web/public/molan/`。
