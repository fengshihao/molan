# 墨览 · molan

**打开即阅读，要点再编辑。**

Open to read. Click to edit.

类 Typora 的所见即所得 Markdown：默认预览，点「编辑」再改；公式、Mermaid、表格、七种纸面。同一套体验覆盖浏览器工作室与 Cursor / VS Code 扩展。

<p align="center">
  <img src="site/assets/intro.gif" alt="墨览：打开即阅读，要点再编辑" width="720" />
</p>

## 立刻体验

| 入口 | 链接 |
|------|------|
| **试读工作室** | [官网试读](https://fengshihao.github.io/molan/try/) · [正式域名](https://molan.guoyoutech.cn/) |
| **Cursor / Open VSX** | [`fengshihao.molan-markdown`](https://open-vsx.org/extension/fengshihao/molan-markdown) |
| **VS Code Marketplace** | [墨览 Markdown](https://marketplace.visualstudio.com/items?itemName=fengshihao.molan-markdown) |
| **给 AI 的开工白** | [`docs/ai/START.md`](docs/ai/START.md) |

```text
扩展 ID：fengshihao.molan-markdown
```

## 本地一键体验

克隆后，在仓库目录里：

```bash
./molan
```

会启动本机预览并自动打开浏览器。

```bash
./molan 试读      # 打开试读工作室
./molan 安装      # 安装 Cursor / VS Code 扩展
./molan 网上      # 打开网上主页
./molan 帮助
```

Windows 可用：`node bin/molan.mjs` 或 `npm run molan`。

## 用一句话开始贡献

把下面整段复制给 Cursor / Claude / Codex（把括号里换成你的意图）：

```text
读 AGENTS.md 和 docs/ai/START.md。我要为墨览贡献：〈一句话〉。
按 docs/ai/PR_PLAYBOOK.md 改、跑 npm run check、开 PR。
```

详细模板见 [`docs/ai/PROMPTS.md`](docs/ai/PROMPTS.md)。人类摘要见 [`CONTRIBUTING.md`](CONTRIBUTING.md)。

## 仓库现在是什么（一期）

本仓是墨览的**开源门户**：正式官网、面向 AI 的贡献契约、CI 规矩、试读体验。

编辑器内核与扩展的**代码真源**仍在 [DesignWeave](https://github.com/fengshihao/DesignWeave)（`packages/molan-*`、`apps/vscode-molan`、`tools/markdown-viewer`）。本仓通过 `npm run sync` 镜像试读资产。完整迁码是二期。

关系说明：[`docs/ai/ARCHITECTURE.md`](docs/ai/ARCHITECTURE.md)。

## 能力速览

- 预览优先；未改动关闭不询问保存
- 纸面：宣纸、墨夜、终端、胭脂、青石、薄雾、朱砂
- 表格、数学公式、任务列表、代码块、Mermaid
- 导出 PDF / 图片；多语言界面
- 浏览器可打开本地文件夹写回（Chrome / Edge）

## 许可

[MIT](LICENSE)
