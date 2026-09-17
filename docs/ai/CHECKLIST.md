# 提交前清单（与 CI 同源）

AI 与人类在开 PR 前逐项确认。`npm run check` 自动覆盖标了「脚本」的项。

## 范围

- [ ] 一件事一个 PR
- [ ] 改动落在允许路径（见 AGENTS.md）
- [ ] 未在本仓「发明」第二份编辑器真源

## 质量

- [ ] **脚本** `npm run check` / `./molan check` 通过
- [ ] 改了 `apps/studio/**`、编辑器核心或扩展 UI 时：**脚本** `./molan e2e` 通过（自动装 Chromium，无需手配）
- [ ] 无密钥 / `.env` 实值 / 私钥
- [ ] 无意外 >2MB 的新二进制（介绍动图更新除外，需在 PR 说明）
- [ ] **脚本** `site/index.html`、`site/try/index.html` 存在且含关键标记
- [ ] 外链（商店、GitHub）未故意写错

## PR 描述

- [ ] Summary
- [ ] User-facing（或 None）
- [ ] Test plan
- [ ] AI-assisted 勾选

## 官网专项（若改了 site/）

- [ ] 首屏仍是：品牌 + 一句 + 短句 + CTA + 纸面影像
- [ ] 未加入统计条 / 卡片墙 / 浮层徽章
- [ ] 默认主题仍是墨夜气质，非紫渐变
- [ ] 移动宽度下 CTA 可点、文字不溢出

## 文档专项（若改了 docs/）

- [ ] 链接相对路径有效
- [ ] 与 AGENTS.md 不冲突；冲突时先改 AGENTS
