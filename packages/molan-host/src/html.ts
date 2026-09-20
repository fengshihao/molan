export type HostHtmlVariant = "vscode" | "iframe";

export type HostHtmlAssets = {
  molanCss: string;
  vditorCss: string;
  vditorMethodJs: string;
  vditorLuteJs: string;
  vditorIconsJs: string;
  editorJs: string;
  bridgeJs: string;
  vditorCdn: string;
  linkBase?: string;
  /** iframe 模式可选 Google Fonts */
  googleFontsHref?: string;
};

export type RenderHostHtmlOptions = {
  variant: HostHtmlVariant;
  assets: HostHtmlAssets;
  nonce?: string;
  /** VS Code webview 需传入完整 CSP 字符串 */
  csp?: string;
  defaultTheme?: "night" | "hack" | "rose" | "xuan";
  statusRight?: string;
  title?: string;
  /** VS Code 反馈面板环境信息 */
  feedback?: { extensionVersion: string; editorVersion: string };
};

function scriptTag(src: string, nonce?: string, id?: string): string {
  const idAttr = id ? ` id="${id}"` : "";
  const nonceAttr = nonce ? ` nonce="${nonce}"` : "";
  return `<script${nonceAttr}${idAttr} src="${src}"></script>`;
}

function inlineScript(body: string, nonce?: string): string {
  const nonceAttr = nonce ? ` nonce="${nonce}"` : "";
  return `<script${nonceAttr}>${body}</script>`;
}

const HEADER_ACTIONS_LEAD = `
          <button class="icon-btn molan-find-btn" id="molanFindBtn" type="button" title="在文档中查找" aria-label="在文档中查找">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/>
              <path d="M20 20l-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
          <button class="icon-btn" id="copyBtn" type="button" title="复制原文" aria-label="复制原文">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2"/><rect x="4" y="8" width="12" height="12" rx="2"/></svg>
          </button>`;

const FEEDBACK_BTN = `
          <button class="icon-btn" id="feedbackBtn" type="button" title="反馈问题" aria-label="反馈问题" aria-haspopup="dialog" aria-controls="molanFeedback">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4.5 6.5h15A1.5 1.5 0 0 1 21 8v7.5a1.5 1.5 0 0 1-1.5 1.5H12l-4.5 3v-3H4.5A1.5 1.5 0 0 1 3 15.5V8A1.5 1.5 0 0 1 4.5 6.5z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
              <path d="M8 10.2h8M8 13h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </button>`;

const HEADER_ACTIONS_TRAIL = `
          <div class="export-prefs" id="exportPrefs">
            <button class="icon-btn" id="pdfBtn" type="button" title="导出" aria-label="导出" aria-expanded="false" aria-haspopup="menu" aria-controls="exportMenu">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 8H6.8A1.8 1.8 0 0 0 5 9.8v7.4A1.8 1.8 0 0 0 6.8 19h10.4a1.8 1.8 0 0 0 1.8-1.8V9.8A1.8 1.8 0 0 0 17.2 8H15"/><path d="M12 15V4"/><path d="M8.7 7.2 12 4l3.3 3.2"/></svg>
            </button>
            <div class="export-menu" id="exportMenu" hidden role="menu" aria-label="导出">
              <button type="button" role="menuitem" data-export="pdf">导出 PDF</button>
              <button type="button" role="menuitem" data-export="png">导出图片</button>
            </div>
          </div>
          <button class="icon-btn is-preview" id="modeBtn" type="button" title="编辑" aria-label="编辑">
            <svg class="icon-edit" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>
            <svg class="icon-preview" viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 12s3.8-7 9.5-7 9.5 7 9.5 7-3.8 7-9.5 7-9.5-7-9.5-7z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>`;

const FEEDBACK_DIALOG = `
  <div class="molan-feedback" id="molanFeedback" hidden aria-hidden="true">
    <div class="molan-feedback__backdrop" data-feedback-close tabindex="-1"></div>
    <div class="molan-feedback__panel" role="dialog" aria-modal="true" aria-labelledby="molanFeedbackHeading">
      <h3 id="molanFeedbackHeading">反馈</h3>
      <p class="molan-feedback__hint">填写后将打开 GitHub 新建 Issue，登录后即可提交。</p>
      <label class="molan-feedback__field">
        <span>类型</span>
        <select id="molanFeedbackKind">
          <option value="bug">问题 / Bug</option>
          <option value="idea">想法 / Idea</option>
        </select>
      </label>
      <label class="molan-feedback__field">
        <span>标题</span>
        <input id="molanFeedbackTitleInput" type="text" maxlength="200" placeholder="一句话说明" autocomplete="off" />
      </label>
      <label class="molan-feedback__field">
        <span>描述</span>
        <textarea id="molanFeedbackBody" rows="5" maxlength="4000" placeholder="复现步骤、期望与实际，或想法细节"></textarea>
      </label>
      <p class="molan-feedback__env" id="molanFeedbackEnv"></p>
      <div class="molan-feedback__actions">
        <button type="button" class="molan-feedback__btn" data-feedback-close>取消</button>
        <button type="button" class="molan-feedback__btn is-primary" id="molanFeedbackSubmit">打开 GitHub</button>
      </div>
    </div>
  </div>`;

const TYPE_PREFS = `
          <div class="type-prefs" id="typePrefs">
            <button class="icon-btn" id="typeBtn" type="button" title="调节字号、行距与字体" aria-label="排版" aria-expanded="false" aria-haspopup="dialog" aria-controls="typeMenu">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.6 19L8.2 5.5h1.7L14.5 19"/><path d="M5.4 13.6h7.2"/><path d="M16.4 19l2.6-8h1.1L22.6 19"/><path d="M17.5 15.6h4.1"/></svg>
            </button>
          </div>`;

const THEME_PREFS = `
          <div class="header-prefs" id="headerPrefs">
            <button class="icon-btn" id="headerPrefsBtn" type="button" title="界面配置" aria-label="界面配置" aria-expanded="false" aria-haspopup="dialog" aria-controls="headerPrefsMenu">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 7.5h16M4 16.5h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                <circle cx="9" cy="7.5" r="2.1" fill="currentColor"/>
                <circle cx="15" cy="16.5" r="2.1" fill="currentColor"/>
              </svg>
            </button>
            <div class="theme-menu" id="headerPrefsMenu" hidden role="dialog" aria-label="界面配置">
              <div class="type-head">纸面</div>
              <div class="theme-switch" id="themeSwitch" role="radiogroup" aria-label="界面样式">
                <button type="button" role="radio" data-theme="xuan" title="宣纸 · 暖色纸面" aria-label="宣纸" aria-checked="false">
                  <svg viewBox="0 0 32 32" aria-hidden="true"><circle class="theme-ring" cx="16" cy="16" r="14.25"/><circle class="theme-fill" cx="16" cy="16" r="10"/></svg>
                </button>
                <button type="button" role="radio" data-theme="night" title="墨夜 · 暗色夜读" aria-label="墨夜" aria-checked="false">
                  <svg viewBox="0 0 32 32" aria-hidden="true"><circle class="theme-ring" cx="16" cy="16" r="14.25"/><circle class="theme-fill" cx="16" cy="16" r="10"/></svg>
                </button>
                <button type="button" role="radio" data-theme="hack" title="终端 · 程序员" aria-label="终端" aria-checked="false">
                  <svg viewBox="0 0 32 32" aria-hidden="true"><circle class="theme-ring" cx="16" cy="16" r="14.25"/><circle class="theme-fill" cx="16" cy="16" r="10"/></svg>
                </button>
                <button type="button" role="radio" data-theme="rose" title="胭脂 · 柔粉纸面" aria-label="胭脂" aria-checked="false">
                  <svg viewBox="0 0 32 32" aria-hidden="true"><circle class="theme-ring" cx="16" cy="16" r="14.25"/><circle class="theme-fill" cx="16" cy="16" r="10"/></svg>
                </button>
                <button type="button" role="radio" data-theme="slate" title="青石 · 冷灰夜读" aria-label="青石" aria-checked="false">
                  <svg viewBox="0 0 32 32" aria-hidden="true"><circle class="theme-ring" cx="16" cy="16" r="14.25"/><circle class="theme-fill" cx="16" cy="16" r="10"/></svg>
                </button>
                <button type="button" role="radio" data-theme="mist" title="薄雾 · 冷白纸面" aria-label="薄雾" aria-checked="false">
                  <svg viewBox="0 0 32 32" aria-hidden="true"><circle class="theme-ring" cx="16" cy="16" r="14.25"/><circle class="theme-fill" cx="16" cy="16" r="10"/></svg>
                </button>
                <button type="button" role="radio" data-theme="cinnabar" title="朱砂 · 赭石纸面" aria-label="朱砂" aria-checked="false">
                  <svg viewBox="0 0 32 32" aria-hidden="true"><circle class="theme-ring" cx="16" cy="16" r="14.25"/><circle class="theme-fill" cx="16" cy="16" r="10"/></svg>
                </button>
              </div>
            </div>
          </div>`;

const LIGHTBOX = `
  <div class="lightbox" id="lightbox" aria-hidden="true">
    <div class="lightbox-panel" role="dialog" aria-modal="true" aria-label="流程图观看">
      <div class="lightbox-bar">
        <div>
          <strong>流程图观看</strong>
          <span class="hint">拖动平移 · 滚轮缩放 · Esc 关闭</span>
        </div>
        <div class="lightbox-actions">
          <button class="icon-btn" type="button" id="lightboxZoomOut" title="缩小" aria-label="缩小">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M8 11h6M21 21l-4.3-4.3"/></svg>
          </button>
          <button class="icon-btn" type="button" id="lightboxZoomIn" title="放大" aria-label="放大">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M11 8v6M8 11h6M21 21l-4.3-4.3"/></svg>
          </button>
          <button class="icon-btn" type="button" id="lightboxEdit" title="编辑流程图" aria-label="编辑流程图">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>
          </button>
          <button class="icon-btn" type="button" id="lightboxReset" title="复位" aria-label="复位">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/></svg>
          </button>
          <button class="icon-btn" type="button" id="lightboxCopyImage" title="复制图片" aria-label="复制图片">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="M3 16l5-4 4 3 3-2 6 5"/></svg>
          </button>
          <button class="icon-btn" type="button" id="lightboxClose" title="关闭" aria-label="关闭">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
          </button>
        </div>
      </div>
      <div class="lightbox-stage" id="lightboxStage">
        <div class="lightbox-canvas" id="lightboxCanvas"></div>
      </div>
    </div>
  </div>`;

export function renderHostHtml(options: RenderHostHtmlOptions): string {
  const {
    variant,
    assets,
    nonce,
    csp: cspContent,
    defaultTheme = variant === "iframe" ? "xuan" : "night",
    statusRight = variant === "iframe" ? "工作台 · 写回文档仓" : "VS Code · 写回原文件",
    title = "墨览",
    feedback = { extensionVersion: "", editorVersion: "" },
  } = options;

  const themeChecked = defaultTheme;
  const themeSwitchHtml = THEME_PREFS.replace(
    `data-theme="xuan" title="宣纸 · 暖色纸面" aria-label="宣纸" aria-checked="false"`,
    `data-theme="xuan" title="宣纸 · 暖色纸面" aria-label="宣纸" aria-checked="${themeChecked === "xuan"}"`,
  ).replace(
    `data-theme="night" title="墨夜 · 暗色夜读" aria-label="墨夜" aria-checked="false"`,
    `data-theme="night" title="墨夜 · 暗色夜读" aria-label="墨夜" aria-checked="${themeChecked === "night"}"`,
  );

  const readerTitleBlock =
    variant === "iframe"
      ? `<div class="reader-title">
          <div class="eyebrow" id="readerEyebrow">准备就绪</div>
          <h2 id="readerTitle">${title}</h2>
        </div>`
      : `<div class="reader-title">
          <h2 id="readerTitle">${title}</h2>
        </div>`;

  const headerActions =
    HEADER_ACTIONS_LEAD +
    (variant === "vscode" ? FEEDBACK_BTN : "") +
    HEADER_ACTIONS_TRAIL +
    (variant === "vscode" ? TYPE_PREFS : "") +
    themeSwitchHtml;

  const cspMeta = cspContent
    ? `<meta http-equiv="Content-Security-Policy" content="${cspContent}" />`
    : "";

  const googleFonts = assets.googleFontsHref
    ? `<link id="molan-fonts" rel="stylesheet" href="${assets.googleFontsHref}" />`
    : "";

  const readonlyStyle =
    variant === "iframe"
      ? `<style>
    html, body { height: 100%; margin: 0; }
    body.is-readonly #modeBtn { opacity: 0.72; }
  </style>`
      : "";

  const configScript = inlineScript(
    variant === "iframe"
      ? `window.__MOLAN_VDITOR_CDN__ = new URL(${JSON.stringify(assets.vditorCdn)}, document.baseURI).href.replace(/\\/$/, "");
    window.__MOLAN_LINK_BASE__ = ${JSON.stringify(assets.linkBase ?? "")};`
      : `window.__MOLAN_VDITOR_CDN__ = ${JSON.stringify(assets.vditorCdn)};
    window.__MOLAN_LINK_BASE__ = ${JSON.stringify(assets.linkBase ?? "")};
    window.__MOLAN_FEEDBACK__ = ${JSON.stringify({
      extensionVersion: feedback.extensionVersion || "",
      editorVersion: feedback.editorVersion || "",
    })};`,
    nonce,
  );

  const themeBootstrap = inlineScript(
    `(function () {
      try {
        var t = localStorage.getItem("molan-theme");
        if (t === "night" || t === "hack" || t === "rose" || t === "xuan") {
          document.documentElement.setAttribute("data-theme", t);
        }
      } catch (e) {}
    })();`,
    nonce,
  );

  return `<!DOCTYPE html>
<html lang="zh-CN" class="molan-host-vscode" data-theme="${defaultTheme}">
<head>
  <meta charset="UTF-8" />
  ${cspMeta}
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  ${themeBootstrap}
  <link rel="preload" href="${assets.vditorLuteJs}" as="script" />
  <link rel="preload" href="${assets.vditorMethodJs}" as="script" />
  <link rel="stylesheet" href="${assets.vditorCss}" />
  <link rel="stylesheet" href="${assets.molanCss}" />
  ${googleFonts}
  ${readonlyStyle}
</head>
<body class="molan-host-vscode">
  <div class="app">
    <main class="main">
      <header class="reader-header">
        ${readerTitleBlock}
        <div class="reader-actions">
${headerActions}
        </div>
      </header>
      <div class="reader-body">
        <div class="editor-wrap visible" id="editorWrap">
          <div class="molan-preview vditor-preview" id="molanPreview">
            <div class="vditor-reset" id="molanPreviewBody"></div>
          </div>
          <div id="vditor"></div>
        </div>
      </div>
      <footer class="status-bar">
        <span id="statusLeft">墨览</span>
        <span id="statusRight">${statusRight}</span>
      </footer>
    </main>
  </div>
  <div class="toast" id="toast" role="status"></div>
  ${LIGHTBOX}
  ${variant === "vscode" ? FEEDBACK_DIALOG : ""}
  ${configScript}
  ${scriptTag(assets.vditorIconsJs, nonce, "vditorIconScript")}
  ${scriptTag(assets.vditorMethodJs, nonce)}
  ${scriptTag(assets.editorJs, nonce)}
  ${scriptTag(assets.bridgeJs, nonce)}
</body>
</html>`;
}
