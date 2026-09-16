# 可复制提示词

把「意图」换成你的目标，整段发给 AI。

## 通用开工

```text
读 AGENTS.md 和 docs/ai/START.md。帮我给 https://github.com/fengshihao/molan 做贡献：〈意图〉。
请你自己克隆（如需要）、改代码、跑 ./molan 检查、开 PR。
```

## 改官网文案

```text
读 AGENTS.md 与 .cursor/rules/molan-site.mdc。只改 site/index.html（及必要 css）文案：〈具体句子〉。保持首屏预算与墨夜气质。npm run check 后开 PR。
```

## 加 / 修试读返回链

```text
检查 site/try/ 与 site/index.html 的互链。确保从试读能回官网首页，从首页能进试读。尽量少改 sync 生成的大文件；优先改壳或首页。npm run check。
```

## 补文档

```text
在 docs/ai/ 或 docs/user/ 补充：〈主题〉。与 ARCHITECTURE / AGENTS 保持一致，不要鼓励双写内核。npm run check。
```

## 报告扩展 Bug（开 issue，不改代码）

```text
用 .github/ISSUE_TEMPLATE 里的 bug 模板，整理复现：环境（Cursor/VS Code 版本）、扩展版本、步骤、期望、实际。不要猜测内核补丁；标签建议 bug。
```

## 提议迁码范围（讨论）

```text
开 issue 标签 needs-source-sync / epic，列出希望从 DesignWeave 迁入本仓的路径与动机。不要直接开始大迁移 PR。
```

## 维护者：刷新 try 镜像

```text
在本机 DesignWeave 与 molan 并列时运行：npm run sync -- --dw ../DesignWeave。检查 git status，确认仅 site/try 与 site/assets 预期变化，开 chore 同步 PR，Test plan 含 npm run check 与试读页打开。
```
