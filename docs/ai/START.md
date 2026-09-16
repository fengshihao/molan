# 对 AI 说这句话就能开工

## 给人看的两步

1. **开工**：把下面提示词发给 AI（只改最后一句意图）
2. **验收**：在仓库里跑 `./molan 检查`；再 `./molan` / `./molan 试读` 肉眼看效果

## 复制给 AI

```text
你在 fengshihao/molan 仓库。先读 AGENTS.md 与 docs/ai/START.md、docs/ai/CHECKLIST.md。
一期默认只改 site/**、docs/**、.github/**、scripts/**、bin/** 与根文档。
编辑器内核真源在 DesignWeave；不要在本仓重写 molan-core。
改完必须 ./molan 检查 通过，再按 docs/ai/PR_PLAYBOOK.md 开 PR。
我要为墨览贡献：〈用一句话写清楚你想做什么〉
```

## 人类最少要提供什么

- **一件事**：例如「把首页 CTA 文案改短」
- 不要一次塞好几个大需求

## AI 做完后人类怎么验

```bash
./molan 检查      # 必须通过
./molan           # 打开官网看一眼
./molan 试读      # 如有需要
```

细则清单见 [CHECKLIST.md](./CHECKLIST.md)。开 PR 步骤见 [PR_PLAYBOOK.md](./PR_PLAYBOOK.md)。
