# 对 AI 说这句话就能开工

## 给人看的两步

1. **准备环境**：复制贡献页上的提示发给 AI（不必自己克隆）。AI 克隆、读说明、跑 `./molan`。
2. **再说意图 + 验收**：环境就绪后告诉 AI 想改什么；确认 `./molan check` 通过，再 `./molan` / `./molan try` 肉眼看。

## 复制给 AI（准备环境）

```text
帮我准备开源项目墨览（https://github.com/fengshihao/molan）的贡献环境：请你自己克隆仓库、读 AGENTS.md 和 docs/ai/START.md，需要时运行 ./molan。准备好后告诉我，我再说想贡献什么。
```

## 环境就绪后对 AI 说

```text
我要贡献：〈一件事〉。按 AGENTS.md 与 docs/ai/CHECKLIST.md 改；改完必须 ./molan check 通过，再按 docs/ai/PR_PLAYBOOK.md 开 PR。
一期默认只改 site/**、docs/**、.github/**、scripts/**、bin/** 与根文档。不要重写 DesignWeave 里的编辑器内核。
```

## AI 做完后人类怎么验

```bash
./molan check
./molan
./molan try
```

细则：[CHECKLIST.md](./CHECKLIST.md) · [PR_PLAYBOOK.md](./PR_PLAYBOOK.md)
