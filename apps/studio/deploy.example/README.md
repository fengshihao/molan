# 墨览网站部署（本机私有）

`apps/studio/deploy/` 整目录在 `.gitignore`，**不会**随 git 克隆下来。只有维护者本机需要放 SSH/rsync 等脚本。

## 首次配置

```bash
mkdir -p apps/studio/deploy
cp apps/studio/deploy.example/upload.sh.example apps/studio/deploy/upload.sh
chmod +x apps/studio/deploy/upload.sh
# 编辑 upload.sh 里的服务器地址与目录
```

## 发布

| 命令 | 作用 |
|------|------|
| `pnpm molan:publish` | 打包 vsix →（若有 upload.sh）同步网站 → Open VSX → 打开 VS 商店页 |
| `pnpm molan:publish:extension` | **仅**打包 + Open VSX + 打开 VS 商店页，**不**要求 upload.sh |

没有 `deploy/upload.sh` 时，`pnpm molan:publish` 也会**自动跳过网站同步**并继续发 Open VSX（会打印提示，不再报错退出）。

## 环境变量

- `OVSX_PAT` — Open VSX 发布令牌（必需）
- `MOLAN_DEPLOY_HOST` / `MOLAN_DEPLOY_DIR` — 见 `upload.sh.example` 中的 rsync 目标（可选，也可直接改脚本）
