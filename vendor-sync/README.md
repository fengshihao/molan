# vendor-sync

本目录说明「从 DesignWeave 镜像到本仓」的约定，不存放第二套手改内核。

## 命令

```bash
npm run sync -- --dw /absolute/or/relative/path/to/DesignWeave
```

若未传 `--dw`，脚本依次尝试：

1. 环境变量 `DESIGNWEAVE_ROOT`
2. 与本仓并列的 `../DesignWeave`

## 同步内容

| 来源（DesignWeave） | 目标（本仓） |
|---------------------|--------------|
| `tools/markdown-viewer/` 工作室静态资源 | `site/try/` |
| `intro.gif` / `studio-intro.gif` 等 | `site/assets/` |

同步后的 `site/try/**` 视为生成物：功能修复应在 DesignWeave 完成后再 sync。

## 不要做的事

- 在 `site/try` 里长期手改编辑器逻辑又不回灌真源
- 把整份 `packages/molan-core` 源码复制进来当可编辑树（等待二期正式迁移）
