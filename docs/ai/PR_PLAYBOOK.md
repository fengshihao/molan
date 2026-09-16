# PR Playbook（机器步骤）

## 1. 分支

```bash
git fetch origin
git checkout main
git pull --ff-only
git checkout -b docs/short-topic   # 或 site/…、chore/…
```

分支名：`docs/…` | `site/…` | `chore/…` | `ci/…`。避免 `fix/…` 除非修本仓脚本/站点缺陷。

## 2. 实现

- 只做 PR 标题能概括的一件事
- 不顺手重构无关文件
- 改官网时遵守 `.cursor/rules/molan-site.mdc`

## 3. 自检

```bash
npm run check
```

对照 [`CHECKLIST.md`](./CHECKLIST.md)。有失败先修，再提交。

## 4. 提交

```bash
git add -A
git status   # 确认无密钥、无意外大文件
git commit -m "$(cat <<'EOF'
简述为什么改。

EOF
)"
```

## 5. 推送与开 PR

```bash
git push -u origin HEAD
gh pr create --title "……" --body "$(cat <<'EOF'
## Summary
- …

## User-facing
- …（无则写 None）

## Test plan
- [ ] npm run check
- [ ] （如改 site）本地 npm run serve 看首屏 / try

## AI-assisted
- [ ] 是（已读 AGENTS.md + docs/ai/START.md）
- [ ] 否
EOF
)"
```

也可直接填 GitHub PR 模板（`.github/PULL_REQUEST_TEMPLATE.md`）。

## 6. 评审期待

- CI 绿
- 描述完整
- 文件数与主题匹配；过大 PR 会被要求拆分

## 编辑器相关改动

本仓不直接改内核。请：

1. 在 DesignWeave 开 PR / issue，或  
2. 本仓开 issue，标签 `needs-source-sync`，正文写清复现与期望
