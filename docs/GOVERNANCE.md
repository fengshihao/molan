# 治理

墨览一期是个人维护的开源项目（GitHub：`fengshihao`）。

## 决策

- **日常 PR**：维护者审查后合并；CI 必须绿
- **真源迁移 / 破坏性变更**：先开 issue 讨论，标签 `needs-source-sync` 或 `epic`
- **发版扩展**：仍在 DesignWeave 的 `pnpm molan:publish` 流水线，直到二期迁仓

## 合并标准

1. `npm run check` 通过  
2. PR 模板字段完整  
3. 范围与标题一致  

## 发布节奏

- 本仓 `site/`：合并到 `main` 后由 GitHub Pages 发布（见 `.github/workflows/pages.yml`）
- 扩展商店：按需，不绑定本仓每次合并

## 行为准则执行

见 `CODE_OF_CONDUCT.md`。严重问题可私下联系仓库 Owner。
