# AGENTS.md — 墨览机器契约

> 本文件优先于聊天里的口头约定。人类一句话开工入口：[`docs/ai/START.md`](docs/ai/START.md)。

## 项目是什么

墨览（molan）是开源 Markdown 纸面工具：**打开即阅读，要点再编辑。**  
本仓库一期职责：官网、文档、贡献规矩、试读镜像。  
编辑器行为与扩展发版的真源在 DesignWeave，见 [`docs/ai/ARCHITECTURE.md`](docs/ai/ARCHITECTURE.md)。

## 默认允许改的路径

| 路径 | 用途 |
|------|------|
| `site/**` | 官网与试读壳 |
| `docs/**` | 人读 / AI 读文档 |
| `.github/**` | Issue / PR / CI |
| `.cursor/rules/**` | Cursor 规则 |
| `scripts/**` | 检查与同步脚本 |
| `README.md`、`AGENTS.md`、`CONTRIBUTING.md` 等根文档 | 门户文案 |

## 默认不要改（除非 issue 声明迁码例外）

- `site/try/**` 内由 `npm run sync` 生成的工作室资产（应改 DesignWeave 后同步）
- 在本仓「重写」编辑器内核、Vditor 裁剪、扩展 `package.json` 发版逻辑

若任务需要改编辑器行为：开 issue 打上 `needs-source-sync`，或直接向 DesignWeave 提 PR，并在本仓文档交叉链接。

## 开工步骤（强制）

1. 读本文件 + [`docs/ai/START.md`](docs/ai/START.md) + [`docs/ai/CHECKLIST.md`](docs/ai/CHECKLIST.md)
2. 一个 PR 一件事；优先小改动
3. 改完运行：`npm run check`
4. 按 [`docs/ai/PR_PLAYBOOK.md`](docs/ai/PR_PLAYBOOK.md) 开 PR；模板字段填全

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
