# 墨览 · molan

**打开即阅读，要点再编辑。**

<p align="center">
  <img src="site/assets/intro.gif" alt="墨览：打开即阅读，要点再编辑" width="720" />
</p>

开源 Markdown 纸面：浏览器工作室、Cursor / VS Code 扩展、以及 DesignWeave 工作台共用的编辑器核心。

## 立刻用

```bash
git clone https://github.com/fengshihao/molan.git
cd molan
pnpm install
pnpm build
./molan              # local site
./molan try          # studio
./molan install      # marketplace extension
./molan help
```

网上试读：[GitHub Pages](https://fengshihao.github.io/molan/try/) · [molan.guoyoutech.cn](https://molan.guoyoutech.cn/)  
扩展：`fengshihao.molan-markdown`

## 仓库结构

```text
packages/molan-protocol   @molan/protocol
packages/molan-core       @molan/core
packages/molan-host       @molan/host
apps/studio               浏览器工作室
apps/vscode-molan         VS Code / Cursor 扩展
site/                     官网
```

## 用 AI 贡献

见 https://fengshihao.github.io/molan/docs/ — 复制准备环境提示发给 AI，再说你想改什么；验收：`./molan check`。

## 发版（维护者）

```bash
./molan package          # .vsix
./molan publish          # Open VSX（需 OVSX_PAT）
```

GitHub Actions：打 `v*` tag 或手动跑 `Publish extension`；Secrets 里配置 `OVSX_PAT`（不要把 token 写进仓库）。VS Marketplace 可继续人工上传 artifact。

## DesignWeave

工作台并列 clone 本仓，用 `file:../molan` 依赖。详见 [`docs/ai/ARCHITECTURE.md`](docs/ai/ARCHITECTURE.md)。

## 许可

[MIT](LICENSE)
