# 墨览 · molan

<p align="center">
  <img src="site/assets/favicon.png" alt="molan" width="72" height="72" />
</p>

<p align="center">
  <strong>打开即阅读，要点再编辑。</strong><br />
  Open to read. Click to edit.
</p>

<p align="center">
  <a href="https://fengshihao.github.io/molan/"><img src="https://img.shields.io/badge/website-GitHub%20Pages-1E2A24?style=flat-square" alt="Website" /></a>
  <a href="https://fengshihao.github.io/molan/try/"><img src="https://img.shields.io/badge/try-studio-7EB89A?style=flat-square" alt="Try studio" /></a>
  <a href="https://open-vsx.org/extension/fengshihao/molan-markdown"><img src="https://img.shields.io/badge/Open%20VSX-molan--markdown-444?style=flat-square" alt="Open VSX" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-8A9A90?style=flat-square" alt="MIT" /></a>
</p>

<p align="center">
  <img src="site/assets/intro.gif" alt="墨览：打开即阅读，要点再编辑" width="720" />
</p>

开源 Markdown 纸面：浏览器工作室、Cursor / VS Code 扩展、以及 DesignWeave 工作台共用的编辑器核心。

**官网（可切换简中 / 繁中 / English / 日本語 / 한국어）** → https://fengshihao.github.io/molan/

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
site/                     官网（Pages）
```

## 用 AI 贡献

见 https://fengshihao.github.io/molan/docs/ — 复制准备环境提示发给 AI，再说你想改什么；验收：`./molan check`（改工作室/编辑器再加 `./molan e2e`）。

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
