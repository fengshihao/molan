# 对 AI 说这句话就能开工

把下面整段复制到 Cursor / Claude / 其他编程代理（只改最后一句意图）：

```text
你在 fengshihao/molan 仓库。先读 AGENTS.md 与 docs/ai/START.md、docs/ai/CHECKLIST.md、docs/ai/PR_PLAYBOOK.md。
一期默认只改 site/**、docs/**、.github/**、scripts/** 与根文档。
编辑器内核真源在 DesignWeave；不要在本仓重写 molan-core。
改完必须 npm run check 通过，再按 PR_PLAYBOOK 开 PR。
我要为墨览贡献：〈用一句话写清楚你想做什么〉
```

## 人类最少要提供什么

- **一件事**：例如「把首页 CTA 文案改短」「给 try 页加返回官网链接」「补充 PROMPTS 里的 bug 模板」
- **不要**同时要求「迁完整代码 + 重做官网 + 改扩展发版」——拆成多个 PR

## AI 读完后应立刻做的事

1. `git status` / 看当前分支，基于最新 `main`
2. 需要看效果时先 `./molan`（自动打开浏览器）
3. 确认改动落在允许路径
4. 实现最小改动
5. `npm run check`
6. 按 playbook 提交并开 PR（若环境允许）

## 相关

- 场景模板：[PROMPTS.md](./PROMPTS.md)
- 架构与真源：[ARCHITECTURE.md](./ARCHITECTURE.md)
- 人读摘要：[../CONTRIBUTING.md](../CONTRIBUTING.md)
