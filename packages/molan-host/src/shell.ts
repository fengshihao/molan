/** Web 工作台 inline 模式：reader-header + 编辑器区 + 底栏 + 灯箱（无 iframe） */
export type InlineShellOptions = {
  statusRight?: string;
};

export function renderInlineShell(options: InlineShellOptions = {}): string {
  const { statusRight = "工作台 · 写回文档仓" } = options;

  return `
  <div class="app">
    <main class="main">
      <header class="reader-header">
        <div class="reader-actions">
          <button class="icon-btn molan-find-btn" id="molanFindBtn" type="button" title="在文档中查找" aria-label="在文档中查找">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="2"/>
              <path d="M20 20l-3.5-3.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
          <button class="icon-btn" id="copyBtn" type="button" title="复制原文" aria-label="复制原文">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 8V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2"/><rect x="4" y="8" width="12" height="12" rx="2"/></svg>
          </button>
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
          </button>
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
          </div>
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
}
