# VS Code Marketplace 填表用

下面字段可直接粘贴。`package.json` 的 Publisher ID 已设为 `fengshihao`。

## 市场网页表单

| 字段 | 填写 |
|------|------|
| Publisher ID | `fengshihao` |
| Extension ID / name | `molan-markdown` |
| Display name / 显示名称 | 墨览 Markdown |
| Short description / 简短说明 | 打开即阅读，要点再编辑。所见即所得：主题、表格、Mermaid、公式。Open to read, click to edit. WYSIWYG with themes, tables, Mermaid, math. |
| Categories / 分类 | Other |
| Tags / 标签 | markdown, vditor, wysiwyg, 墨览, mermaid, typora |
| Version | 0.1.30 |
| License | MIT |
| Repository | https://github.com/fengshihao/molan.git |
| Homepage | https://fengshihao.github.io/molan/ |
| Bugs / Issues | https://github.com/fengshihao/molan/issues |
| Q&A | Marketplace（默认） |
| Gallery banner color | `#1E2A24`（深苔绿，暗色） |

## 资源文件（本目录）

| 用途 | 文件 | 规格 |
|------|------|------|
| 扩展图标（必填） | `icon.png` | 128×128 PNG |
| 高清原图（备用） | `media/icon-1024.png` | 1024×1024，市场网页若要更大图用这个 |
| 商店介绍动画 | https://molan.guoyoutech.cn/intro.gif | 1280×800，约 2MB；源文件 `media/intro.gif`，Nginx 限流并记访问日志 |
| 商店截图 | `media/screenshot.jpg` | 已压缩 JPEG，备用静帧 |
| 许可证 | `LICENSE` | MIT |
| 更新日志 | `CHANGELOG.md` | 0.1.30 |

完整介绍就是 `README.md`（面向普通用户，市场详情页会自动用它）。开发调试见 `DEV.md`。

商店 README 里的截图**不会**从 vsix 里读，而是去拉 README 里的公开 HTTPS 地址。介绍动画用 `https://molan.guoyoutech.cn/intro.gif`（已写进 README 和 `baseImagesUrl`）。服务器对这张 GIF 按 IP 限流，访问记在 `/var/log/nginx/molan.intro.log`；看统计：`bash apps/studio/deploy/intro-stats.sh`。

## 发布

日常发版用仓库根目录：

```bash
pnpm molan:publish
```

会打包 `.vsix`、同步腾讯云网站、发到 Open VSX（Cursor），并打开 [VS Code Marketplace 管理页](https://marketplace.visualstudio.com/manage/publishers/fengshihao) 让你人工上传。需要本机已设置 `OVSX_PAT`。

## 发布命令（手工）

1. 打开 https://marketplace.visualstudio.com/manage ，Publisher ID 为 `fengshihao`。
2. 在 Azure DevOps 建 PAT：Organization 选 **All accessible organizations**，Scope 选 **Marketplace → Manage**。
3. 本机或交给 Agent 发布：

```bash
cd apps/vscode-molan
pnpm compile
# 有令牌后：
npx @vscode/vsce publish --no-dependencies --baseContentUrl https://github.com/fengshihao/DesignWeave/blob/main/apps/vscode-molan --baseImagesUrl https://molan.guoyoutech.cn -p "$VSCE_PAT"
```

只打包不发布：

```bash
pnpm --filter molan-markdown package
```

Cursor 用户走 Open VSX（另一套账号）：https://open-vsx.org/ ，用 `npx ovsx publish molan-markdown-0.1.30.vsix -p "$OVSX_PAT"`。
