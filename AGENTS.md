# AGENTS.md — 墨览机器契约

> 本文件优先于聊天里的口头约定。人类一句话开工入口：[`docs/ai/START.md`](docs/ai/START.md)。

## 项目是什么

墨览（molan）是开源 Markdown 纸面工具：**打开即阅读，要点再编辑。**  
本仓库是**编辑器 / 扩展 / 工作室 / 官网**的真源。DesignWeave 工作台通过并列 `file:../molan` 引用 `@molan/host`。

## 默认允许改的路径

| 路径 | 用途 |
|------|------|
| `packages/**` | 协议 / 核心 / 宿主 |
| `apps/studio/**` | 浏览器工作室 |
| `apps/vscode-molan/**` | 扩展（勿提交 `.vsix`） |
| `site/**` | 官网（`site/try` 多为 sync 生成） |
| `docs/**`、`.github/**`、`scripts/**`、`bin/**`、根文档 | 门户与工具 |

## 开工步骤（强制）

1. 读本文件 + [`docs/ai/START.md`](docs/ai/START.md) + [`docs/ai/CHECKLIST.md`](docs/ai/CHECKLIST.md)
2. 一个 PR 一件事
3. `pnpm build && ./molan check`（改扩展再 `./molan package` 或 filter check）
4. 按 [`docs/ai/PR_PLAYBOOK.md`](docs/ai/PR_PLAYBOOK.md) 开 PR

## 检查命令

```bash
./molan              # local homepage
./molan try          # try studio
./molan docs         # contribute guide
./molan install      # extension
./molan check        # acceptance checks (required before PR)
./molan web          # online homepage
./molan sync -- --dw <DesignWeave>   # maintainers
./molan help
```

`./molan check` matches CI; do not push if it fails.

## Commit / PR 约定

- Commit：中文或英文均可，说明**为什么**；一行主题，必要时正文补充
- PR 标题：简短祈使句或「fix/docs/site: …」
- PR 正文必须含：摘要、对用户可见变化、Test plan
- 勾选是否由 AI 辅助；若是，写明读过哪些契约文件

## 官网视觉硬约束

改 `site/` 时遵守 `.cursor/rules/molan-site.mdc`：

- 墨夜青绿为默认品牌面，不用紫系 SaaS 渐变
- 首屏预算：品牌 + 一句 headline + 一句支撑 + CTA + 全宽纸面影像
- 禁止首屏统计条、功能卡片墙、浮层徽章
- 字体：Instrument Serif / Cormorant + DM Sans + JetBrains Mono；禁止默认 Inter/Roboto/Arial 堆作为品牌字体

## 安全

- 禁止提交密钥、token、私钥、`.env` 实值
- 安全问题走 [`SECURITY.md`](SECURITY.md)，不要公开 issue 贴利用细节

## 语言

- 文档默认中文；面向国际商店的扩展说明可中英并存
- 用户可见官网文案优先中文，关键句保留英文副标
