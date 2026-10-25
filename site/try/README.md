# 墨览 · 本地 Markdown 工作室

所见即所得（Vditor IR，类 Typora）编辑本地 Markdown。打开文档默认**预览**（只阅读）；点顶栏「编辑」再改。公式、Mermaid 流程图、表格与任务列表均可编辑；Chrome / Edge 可写回原文件。预览时把鼠标移到段落左侧会出现「+」，点开即可插入标题、列表、代码、表格等，不必手写语法。

打开本目录下的 `index.html`（或用本地静态服务器）。侧栏「打开文件夹」会打开本地目录：Chrome / Edge 可写回原文件；Cursor 内置浏览器自动改用兼容选择。未选文件夹时，侧栏会列出 `demo/` 里的一份样例。公开教程：<https://molan.guoyoutech.cn/guide.html>。

侧栏设置可切换七种纸面：**宣纸**、**墨夜**（默认）、**终端**、**胭脂**、**青石**、**薄雾**、**朱砂**；并可用亮度 / 对比 / 强调色微调。设置里也可一键安装 VS Code / Cursor 插件。选择会记在本机。

打开文档后用 `Cmd/Ctrl+F` 在正文中查找（`Enter` / `F3` 下一个，`Shift+Enter` / `Shift+F3` 上一个，`Esc` 关闭）。页面自带查找栏，会拦住浏览器的查找快捷键，避免搜到侧栏。

界面语言按浏览器自动选择，也可在侧栏手动切换：简体中文、繁體中文、English、日本語、한국어、Español、Français、Deutsch、Português、Русский、العربية。

```bash
pnpm molan            # 停旧后启动，本机 http://127.0.0.1:5500/ ，局域网用本机 IP
pnpm molan:stop       # 仅停止
MOLAN_PORT=5600 pnpm molan   # 自定义端口
MOLAN_BIND=127.0.0.1 pnpm molan   # 只允许本机访问
./molan e2e           # 浏览器回归（自动装 Chromium / vendor，无需手配）
```

介绍动画与教程截图（需浏览器；同样走自动 Chromium）：

```bash
MOLAN_URL=http://127.0.0.1:5500/ node apps/studio/scripts/record-studio-intro.mjs
```

```text
index.html        页面结构
guide.html        浏览器工作室教程（含介绍动画与截图）
studio-intro.gif  工作室介绍动画
demo/             内置样例文档
scripts/          录制介绍动画
molan.css         纸面样式与 Vditor 主题（浏览器与 VS Code 共用）
molan-i18n.js     界面多语言
molan-aphorisms.js 开卷一则：无署名短句（中文自撰 + 宋词 + 公版歌词；其他语言哲人句）
molan-editor.js   编辑器核心 IIFE（由 `packages/molan-core/src/editor/*` 构建）
molan-app.js      仅浏览器：选文件夹、侧栏、写回本地
serve.mjs         本地静态服务（gzip + 缓存头）
vendor/vditor     裁剪后的 Vditor（`pnpm molan` / 编译扩展时同步，不上 CDN）
```

## VS Code / Cursor 扩展

编译扩展时把 `molan.css` 和 `molan-editor.js` 拷进 webview，点击 Markdown 即可打开。见 [`apps/vscode-molan/README.md`](../../apps/vscode-molan/README.md)。

网站发布走仓库根目录 `pnpm molan:publish`（若本机有 `deploy/upload.sh` 会同步到 https://molan.guoyoutech.cn/；没有则自动跳过，见 [`deploy.example/README.md`](deploy.example/README.md)）。只发扩展商店：`pnpm molan:publish:extension`。只更新网站、不发商店时，运行本机 `deploy/upload.sh`。
