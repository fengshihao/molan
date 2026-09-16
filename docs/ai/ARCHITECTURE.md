# 架构与真源（一期）

## 产品形态

| 端 | 用户怎么用 | 一期本仓状态 |
|----|------------|--------------|
| 浏览器工作室 | 打开文件夹，预览/编辑本地 Markdown | `site/try/` 镜像；真源 DesignWeave `tools/markdown-viewer` |
| Cursor / VS Code 扩展 | 点击 `.md` 用墨览打开 | 商店已发布；源码在 DesignWeave `apps/vscode-molan` |
| DesignWeave 工作台 | 同页 inline 挂载 | 不在本仓范围 |

共享包（皆在 DesignWeave）：

- `packages/molan-core` — 编辑器 / CSS 真源
- `packages/molan-host` — 壳与桥
- `packages/molan-protocol` — 宿主协议

## 本仓职责边界

```text
人类 / AI
   │
   ▼
fengshihao/molan     ← 官网、契约、CI、试读镜像（本仓）
   │  npm run sync
   ▼
DesignWeave          ← 编辑器与扩展真源、现网 publish
   │
   ▼
Marketplace / Open VSX / molan.guoyoutech.cn
```

## 同步

```bash
npm run sync -- --dw /path/to/DesignWeave
```

脚本把工作室静态资源拷入 `site/try/`，并刷新 `site/assets/` 中的介绍动图。详见 [`vendor-sync/README.md`](../../vendor-sync/README.md)。

## 二期（尚未开始）

- 将 `molan-core` / `host` / `protocol`、扩展、工作室完整迁入本仓
- DesignWeave 改为依赖本仓发布物或 git submodule/subtree
- 扩展 `package.json` 的 `repository` 指向本仓

一期禁止提前制造双写真源。
