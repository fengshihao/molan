# 对 AI 说这句话就能开工

## 给人看的两步

1. **开工**：打开 Cursor（不必先自己克隆），把下面提示词发给 AI，只改高亮意图那一句。克隆、读文档、改代码、运行、检查都让 AI 做。
2. **验收**：看 AI 是否报告 `./molan 检查` 通过；再让它 `./molan` / `./molan 试读`，你肉眼确认。

## 复制给 AI

```text
帮我给开源项目墨览（https://github.com/fengshihao/molan）做贡献：〈用一句话写清楚你想做什么〉。
请你自己：克隆仓库（若本地还没有）、读 AGENTS.md 与 docs/ai/START.md、docs/ai/CHECKLIST.md，按规矩改代码；需要预览时运行 ./molan；改完必须 ./molan 检查 通过，再按 docs/ai/PR_PLAYBOOK.md 开 PR。
一期默认只改 site/**、docs/**、.github/**、scripts/**、bin/** 与根文档。编辑器内核真源在 DesignWeave，不要在本仓重写 molan-core。
```

## 人类最少要提供什么

- **一件事**：例如「增加一个书签的功能」「把首页某句文案改短」
- 不要一次塞好几个大需求

## AI 做完后人类怎么验

问 AI「检查过了吗？」或自己在仓库里：

```bash
./molan 检查      # 必须通过
./molan           # 打开官网看一眼
./molan 试读      # 如有需要
```

细则清单见 [CHECKLIST.md](./CHECKLIST.md)。开 PR 步骤见 [PR_PLAYBOOK.md](./PR_PLAYBOOK.md)。
