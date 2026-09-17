/**
 * 墨览官网文案（GitHub Pages）。与工作室共用 localStorage `molan-lang`。
 * 主要语言：简中 / 繁中 / English / 日本語 / 한국어
 */
(function (global) {
  var STORAGE = "molan-lang";
  var LANGS = [
    { id: "zh", name: "简体中文", html: "zh-CN" },
    { id: "zh-Hant", name: "繁體中文", html: "zh-TW" },
    { id: "en", name: "English", html: "en" },
    { id: "ja", name: "日本語", html: "ja" },
    { id: "ko", name: "한국어", html: "ko" },
  ];
  var IDS = {};
  LANGS.forEach(function (l) {
    IDS[l.id] = true;
  });

  var T = {
    zh: {
      skip: "跳到正文",
      navAria: "主导航",
      brandAria: "墨览 molan",
      navTry: "试读",
      navDocs: "贡献",
      navGitHub: "GitHub",
      langAria: "界面语言",
      title: "墨览 · molan — 打开即阅读，要点再编辑",
      description:
        "墨览：打开即阅读，要点再编辑。开源 Markdown 纸面 — 浏览器工作室与 Cursor / VS Code 扩展。",
      headline: "打开即阅读，要点再编辑。",
      lede: "纸面上的 Markdown。默认预览，点一下再改。浏览器工作室与 Cursor / VS Code 同一套体验。",
      ctaTry: "立即试读",
      ctaInstall: "安装扩展",
      ctaContribute: "用 AI 改进项目",
      heroAlt: "墨览：打开即阅读，要点再编辑",
      installTitle: "装进编辑器",
      installBody: "在 Cursor 或 VS Code 中搜索墨览，或直接使用扩展 ID。",
      linkOvsx: "Open VSX（Cursor）",
      linkMarketplace: "VS Code Marketplace",
      linkFormal: "正式站 molan.guoyoutech.cn",
      aiTitle: "用 AI 成为贡献者",
      aiBody:
        "先复制下面这段发给 Cursor，让它准备好环境；再说你想改什么。克隆、读说明、改代码都交给它。",
      setupPrompt:
        "帮我准备开源项目墨览（https://github.com/fengshihao/molan）的贡献环境：请你自己克隆仓库、读 AGENTS.md 和 docs/ai/START.md，需要时运行 ./molan。准备好后告诉我，我再说想贡献什么。",
      copy: "复制",
      copied: "已复制",
      aiMore: "贡献两步说明",
      aiFull: "给 AI 的完整提示",
      footMit: "MIT · ",
      footNote: "开源免费 · 欢迎试读与贡献。更多见 ",
      footDocs: "贡献",
      footNoteEnd: "。",
      /* docs page */
      docsTitle: "开始贡献 · 墨览",
      docsDescription: "复制一句给 AI，让它准备墨览贡献环境；再说你想改什么。",
      docsH1: "两步就够",
      docsIntro:
        "不用先读长文档，也不用自己克隆、装依赖。先让 AI 把环境准备好，再说你想改什么。",
      docsStep1: "1. 复制发给 AI，准备环境",
      docsStep1Body: "打开 Cursor（或别的 AI 编程工具），点复制，粘贴发给它：",
      docsHint1:
        "环境就绪后，用一句话告诉 AI 你想做什么。例如：增加一个书签的功能；把首页某句文案改短；修一个错别字。",
      docsStep2: "2. 验收 AI 有没有做对",
      docsStep2Body: "让 AI 跑，或你在仓库目录运行：",
      docsHint2: "通过 = 规矩和站点冒烟都 OK。然后再肉眼看一眼（也可让 AI 执行）：",
      docsLiHome: " — 打开官网",
      docsLiTry: " — 打开试读",
      docsLiDocs: " — 打开本页",
      docsHint3: "装扩展：",
      docsHint3b: "。全部命令：",
      docsFine: "给 AI 的细则（人一般不用点）",
      docsBack: "← 回首页",
    },
    "zh-Hant": {
      skip: "跳到正文",
      navAria: "主導航",
      brandAria: "墨覽 molan",
      navTry: "試讀",
      navDocs: "貢獻",
      navGitHub: "GitHub",
      langAria: "介面語言",
      title: "墨覽 · molan — 打開即閱讀，重點再編輯",
      description:
        "墨覽：打開即閱讀，重點再編輯。開源 Markdown 紙面 — 瀏覽器工作室與 Cursor / VS Code 擴充功能。",
      headline: "打開即閱讀，重點再編輯。",
      lede: "紙面上的 Markdown。預設預覽，點一下再改。瀏覽器工作室與 Cursor / VS Code 同一套體驗。",
      ctaTry: "立即試讀",
      ctaInstall: "安裝擴充功能",
      ctaContribute: "用 AI 改進專案",
      heroAlt: "墨覽：打開即閱讀，重點再編輯",
      installTitle: "裝進編輯器",
      installBody: "在 Cursor 或 VS Code 中搜尋墨覽，或直接使用擴充功能 ID。",
      linkOvsx: "Open VSX（Cursor）",
      linkMarketplace: "VS Code Marketplace",
      linkFormal: "正式站 molan.guoyoutech.cn",
      aiTitle: "用 AI 成為貢獻者",
      aiBody:
        "先複製下面這段發給 Cursor，讓它準備好環境；再說你想改什麼。複製、讀說明、改程式都交給它。",
      setupPrompt:
        "幫我準備開源專案墨覽（https://github.com/fengshihao/molan）的貢獻環境：請你自己 clone 倉庫、讀 AGENTS.md 和 docs/ai/START.md，需要時執行 ./molan。準備好後告訴我，我再說想貢獻什麼。",
      copy: "複製",
      copied: "已複製",
      aiMore: "貢獻兩步說明",
      aiFull: "給 AI 的完整提示",
      footMit: "MIT · ",
      footNote: "開源免費 · 歡迎試讀與貢獻。更多見 ",
      footDocs: "貢獻",
      footNoteEnd: "。",
      docsTitle: "開始貢獻 · 墨覽",
      docsDescription: "複製一句給 AI，讓它準備墨覽貢獻環境；再說你想改什麼。",
      docsH1: "兩步就夠",
      docsIntro:
        "不用先讀長文件，也不用自己 clone、裝依賴。先讓 AI 把環境準備好，再說你想改什麼。",
      docsStep1: "1. 複製發給 AI，準備環境",
      docsStep1Body: "開啟 Cursor（或其他 AI 程式工具），點複製，貼上發給它：",
      docsHint1:
        "環境就緒後，用一句話告訴 AI 你想做什麼。例如：增加書籤功能；把首頁某句文案改短；修一個錯字。",
      docsStep2: "2. 驗收 AI 有沒有做對",
      docsStep2Body: "讓 AI 跑，或你在倉庫目錄執行：",
      docsHint2: "通過 = 規範與站點冒煙都 OK。然後再肉眼看一眼（也可讓 AI 執行）：",
      docsLiHome: " — 開啟官網",
      docsLiTry: " — 開啟試讀",
      docsLiDocs: " — 開啟本頁",
      docsHint3: "安裝擴充功能：",
      docsHint3b: "。全部命令：",
      docsFine: "給 AI 的細則（人一般不用點）",
      docsBack: "← 回首頁",
    },
    en: {
      skip: "Skip to content",
      navAria: "Primary",
      brandAria: "Molan",
      navTry: "Try",
      navDocs: "Contribute",
      navGitHub: "GitHub",
      langAria: "Language",
      title: "molan — Open to read. Click to edit.",
      description:
        "molan: open to read, click to edit. Open-source Markdown paper — browser studio and Cursor / VS Code extension.",
      headline: "Open to read. Click to edit.",
      lede: "Markdown on paper. Preview by default; edit when you need to. Same experience in the browser studio and Cursor / VS Code.",
      ctaTry: "Try now",
      ctaInstall: "Install extension",
      ctaContribute: "Improve with AI",
      heroAlt: "molan: open to read, click to edit",
      installTitle: "Into your editor",
      installBody: "Search for Molan in Cursor or VS Code, or use the extension ID.",
      linkOvsx: "Open VSX (Cursor)",
      linkMarketplace: "VS Code Marketplace",
      linkFormal: "Formal site molan.guoyoutech.cn",
      aiTitle: "Contribute with AI",
      aiBody:
        "Copy the prompt below into Cursor to set up the repo. Then tell it what you want to change — cloning, docs, and code can stay with the AI.",
      setupPrompt:
        "Help me set up the open-source project Molan (https://github.com/fengshihao/molan): clone the repo yourself, read AGENTS.md and docs/ai/START.md, and run ./molan when needed. Tell me when you are ready, then I will say what I want to contribute.",
      copy: "Copy",
      copied: "Copied",
      aiMore: "Two-step contribute guide",
      aiFull: "Full AI prompt",
      footMit: "MIT · ",
      footNote: "Free and open source. Try it, then contribute. See ",
      footDocs: "Contribute",
      footNoteEnd: ".",
      docsTitle: "Contribute · molan",
      docsDescription: "Copy one prompt to AI to prepare the Molan env; then say what to change.",
      docsH1: "Two steps",
      docsIntro:
        "No long docs first, and you need not clone or install by yourself. Let AI prepare the environment, then say what you want to change.",
      docsStep1: "1. Copy to AI — prepare the environment",
      docsStep1Body: "Open Cursor (or another AI coding tool), copy, and paste:",
      docsHint1:
        "When ready, tell the AI in one sentence what to do — e.g. add bookmarks, shorten a homepage line, fix a typo.",
      docsStep2: "2. Verify the AI did it right",
      docsStep2Body: "Have the AI run this, or run it in the repo:",
      docsHint2: "Pass = rules and site smoke are OK. Then glance with your eyes (or ask the AI):",
      docsLiHome: " — open the homepage",
      docsLiTry: " — open try studio",
      docsLiDocs: " — open this page",
      docsHint3: "Install extension: ",
      docsHint3b: ". All commands: ",
      docsFine: "Details for AI (humans rarely need this)",
      docsBack: "← Home",
    },
    ja: {
      skip: "本文へスキップ",
      navAria: "メインナビ",
      brandAria: "墨覧 molan",
      navTry: "試す",
      navDocs: "貢献",
      navGitHub: "GitHub",
      langAria: "言語",
      title: "墨覧 · molan — 開いて読む、要点で編集",
      description:
        "墨覧：開いて読む、要点で編集。オープンソースの Markdown 紙面 — ブラウザ工房と Cursor / VS Code 拡張。",
      headline: "開いて読む。要点で編集。",
      lede: "紙の上の Markdown。既定はプレビュー、必要なときだけ編集。ブラウザ工房も Cursor / VS Code も同じ体験。",
      ctaTry: "今すぐ試す",
      ctaInstall: "拡張を入れる",
      ctaContribute: "AI で改善する",
      heroAlt: "墨覧：開いて読む、要点で編集",
      installTitle: "エディタに入れる",
      installBody: "Cursor または VS Code で「墨覧」を検索するか、拡張 ID を使ってください。",
      linkOvsx: "Open VSX（Cursor）",
      linkMarketplace: "VS Code Marketplace",
      linkFormal: "正式サイト molan.guoyoutech.cn",
      aiTitle: "AI と一緒に貢献",
      aiBody:
        "下の文を Cursor に貼って環境を用意してもらい、次に変えたいことを伝えてください。クローンや説明・コードは AI に任せられます。",
      setupPrompt:
        "オープンソースプロジェクト墨覧（https://github.com/fengshihao/molan）の貢献環境を準備してください。リポジトリを自分で clone し、AGENTS.md と docs/ai/START.md を読み、必要なら ./molan を実行してください。準備できたら教えてください。そのあと貢献したい内容を伝えます。",
      copy: "コピー",
      copied: "コピー済み",
      aiMore: "貢献の二ステップ",
      aiFull: "AI 向けの全文",
      footMit: "MIT · ",
      footNote: "オープンソース無料。試して、貢献を。詳細は ",
      footDocs: "貢献",
      footNoteEnd: "。",
      docsTitle: "貢献を始める · 墨覧",
      docsDescription: "AI に一文を渡し環境を用意させ、次に変えたいことを伝える。",
      docsH1: "二ステップで十分",
      docsIntro:
        "長い文書を先に読む必要も、自分で clone や依存導入をする必要もありません。まず AI に環境を整えさせ、次に変えたいことを伝えてください。",
      docsStep1: "1. AI に渡して環境を用意",
      docsStep1Body: "Cursor（または他の AI コーディングツール）を開き、コピーして貼り付けます：",
      docsHint1:
        "準備ができたら、一文でやりたいことを伝えてください。例：ブックマーク機能を追加、トップの一文を短く、誤字を直す。",
      docsStep2: "2. AI が正しくやったか確認",
      docsStep2Body: "AI に実行させるか、リポジトリで自分で実行：",
      docsHint2: "通ればルールとサイトのスモークは OK。その後、目で確認（AI に任せても可）：",
      docsLiHome: " — 公式サイトを開く",
      docsLiTry: " — 試読を開く",
      docsLiDocs: " — このページを開く",
      docsHint3: "拡張のインストール：",
      docsHint3b: "。全コマンド：",
      docsFine: "AI 向けの詳細（人は通常不要）",
      docsBack: "← ホームへ",
    },
    ko: {
      skip: "본문으로 건너뛰기",
      navAria: "주요 탐색",
      brandAria: "묵람 molan",
      navTry: "체험",
      navDocs: "기여",
      navGitHub: "GitHub",
      langAria: "언어",
      title: "묵람 · molan — 열면 읽고, 필요할 때 편집",
      description:
        "묵람: 열면 읽고, 필요할 때 편집. 오픈소스 Markdown 지면 — 브라우저 스튜디오와 Cursor / VS Code 확장.",
      headline: "열면 읽고, 필요할 때 편집.",
      lede: "지면 위의 Markdown. 기본은 미리보기, 필요할 때만 편집. 브라우저 스튜디오와 Cursor / VS Code가 같은 경험.",
      ctaTry: "바로 체험",
      ctaInstall: "확장 설치",
      ctaContribute: "AI로 개선",
      heroAlt: "묵람: 열면 읽고, 필요할 때 편집",
      installTitle: "에디터에 넣기",
      installBody: "Cursor 또는 VS Code에서 묵람을 검색하거나 확장 ID를 사용하세요.",
      linkOvsx: "Open VSX (Cursor)",
      linkMarketplace: "VS Code Marketplace",
      linkFormal: "공식 사이트 molan.guoyoutech.cn",
      aiTitle: "AI와 함께 기여",
      aiBody:
        "아래 문장을 Cursor에 붙여 환경을 준비시킨 뒤, 바꾸고 싶은 것을 말하세요. 클론·문서·코드는 AI에게 맡겨도 됩니다.",
      setupPrompt:
        "오픈소스 프로젝트 묵람(https://github.com/fengshihao/molan) 기여 환경을 준비해 주세요. 저장소를 직접 clone하고 AGENTS.md와 docs/ai/START.md를 읽은 뒤, 필요하면 ./molan을 실행하세요. 준비되면 알려 주세요. 그다음 기여하고 싶은 내용을 말하겠습니다.",
      copy: "복사",
      copied: "복사됨",
      aiMore: "기여 두 단계",
      aiFull: "AI용 전체 안내",
      footMit: "MIT · ",
      footNote: "오픈소스 무료. 체험 후 기여해 주세요. 더 보기: ",
      footDocs: "기여",
      footNoteEnd: ".",
      docsTitle: "기여 시작 · 묵람",
      docsDescription: "AI에게 한 문장을 보내 묵람 환경을 준비시킨 뒤, 바꾸고 싶은 것을 말하세요.",
      docsH1: "두 단계면 충분",
      docsIntro:
        "긴 문서를 먼저 읽을 필요도, 직접 clone·의존성 설치를 할 필요도 없습니다. 먼저 AI가 환경을 준비한 뒤, 바꾸고 싶은 것을 말하세요.",
      docsStep1: "1. AI에게 복사해 환경 준비",
      docsStep1Body: "Cursor(또는 다른 AI 코딩 도구)를 열고 복사해 붙여넣으세요:",
      docsHint1:
        "준비가 되면 한 문장으로 원하는 작업을 말하세요. 예: 북마크 추가, 홈 문구 줄이기, 오타 수정.",
      docsStep2: "2. AI가 맞게 했는지 확인",
      docsStep2Body: "AI에게 실행시키거나 저장소에서 직접 실행:",
      docsHint2: "통과 = 규칙과 사이트 스모크 OK. 그다음 눈으로 확인(AI에게 맡겨도 됨):",
      docsLiHome: " — 홈 열기",
      docsLiTry: " — 체험 열기",
      docsLiDocs: " — 이 페이지 열기",
      docsHint3: "확장 설치: ",
      docsHint3b: ". 모든 명령: ",
      docsFine: "AI용 세부 사항(사람은 보통 불필요)",
      docsBack: "← 홈으로",
    },
  };

  function detect() {
    try {
      var saved = localStorage.getItem(STORAGE);
      if (saved && IDS[saved]) return saved;
    } catch (e) { /* ignore */ }
    var navs = [];
    try {
      navs = [navigator.language].concat(navigator.languages || []);
    } catch (e2) { /* ignore */ }
    for (var i = 0; i < navs.length; i++) {
      var raw = String(navs[i] || "").toLowerCase();
      if (raw.indexOf("zh-tw") === 0 || raw.indexOf("zh-hk") === 0 || raw.indexOf("zh-hant") === 0)
        return "zh-Hant";
      if (raw.indexOf("zh") === 0) return "zh";
      if (raw.indexOf("ja") === 0) return "ja";
      if (raw.indexOf("ko") === 0) return "ko";
      if (raw.indexOf("en") === 0) return "en";
    }
    return "zh";
  }

  function metaOf(id) {
    for (var i = 0; i < LANGS.length; i++) {
      if (LANGS[i].id === id) return LANGS[i];
    }
    return LANGS[0];
  }

  function dict(id) {
    return T[id] || T.zh;
  }

  function setText(el, value) {
    if (!el || value == null) return;
    el.textContent = value;
  }

  function apply(id) {
    if (!IDS[id]) id = "zh";
    var d = dict(id);
    var meta = metaOf(id);
    document.documentElement.lang = meta.html;

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (key && d[key] != null) setText(el, d[key]);
    });
    document.querySelectorAll("[data-i18n-html]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-html");
      if (key && d[key] != null) el.innerHTML = d[key];
    });
    document.querySelectorAll("[data-i18n-aria]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-aria");
      if (key && d[key] != null) el.setAttribute("aria-label", d[key]);
    });
    document.querySelectorAll("[data-i18n-title]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-title");
      if (key && d[key] != null) el.setAttribute("title", d[key]);
    });
    document.querySelectorAll("[data-i18n-alt]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-alt");
      if (key && d[key] != null) el.setAttribute("alt", d[key]);
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-placeholder");
      if (key && d[key] != null) el.setAttribute("placeholder", d[key]);
    });

    var titleKey = document.documentElement.getAttribute("data-i18n-title") || "title";
    var descKey = document.documentElement.getAttribute("data-i18n-desc") || "description";
    if (d[titleKey]) document.title = d[titleKey];
    var desc = document.querySelector('meta[name="description"]');
    if (desc && d[descKey]) desc.setAttribute("content", d[descKey]);

    var sel = document.getElementById("siteLang");
    if (sel && sel.value !== id) sel.value = id;

    try {
      localStorage.setItem(STORAGE, id);
    } catch (e3) { /* ignore */ }

    document.documentElement.dataset.siteLang = id;
    document.dispatchEvent(new CustomEvent("molan-site-lang", { detail: { id: id, dict: d } }));
  }

  function fillSelect(sel) {
    if (!sel) return;
    sel.innerHTML = "";
    LANGS.forEach(function (l) {
      var opt = document.createElement("option");
      opt.value = l.id;
      opt.textContent = l.name;
      sel.appendChild(opt);
    });
  }

  function bindCopy() {
    document.querySelectorAll(".copy-btn").forEach(function (btn) {
      if (btn.dataset.i18nBound) return;
      btn.dataset.i18nBound = "1";
      btn.addEventListener("click", async function () {
        var el = document.getElementById(btn.getAttribute("data-copy"));
        if (!el) return;
        var text = el.textContent.trim();
        try {
          await navigator.clipboard.writeText(text);
        } catch (e) {
          var ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          ta.remove();
        }
        var id = document.documentElement.dataset.siteLang || "zh";
        var d = dict(id);
        var prev = btn.textContent;
        btn.textContent = d.copied || "已复制";
        btn.classList.add("is-done");
        setTimeout(function () {
          btn.textContent = d.copy || prev;
          btn.classList.remove("is-done");
        }, 1600);
      });
    });
  }

  function init() {
    var sel = document.getElementById("siteLang");
    fillSelect(sel);
    var id = detect();
    if (sel) {
      sel.value = id;
      sel.addEventListener("change", function () {
        apply(sel.value);
      });
    }
    apply(id);
    bindCopy();
  }

  global.MolanSiteI18n = {
    langs: LANGS,
    detect: detect,
    apply: apply,
    init: init,
    merge: function (extra) {
      if (!extra) return;
      Object.keys(extra).forEach(function (lang) {
        if (!T[lang]) T[lang] = {};
        var src = extra[lang] || {};
        Object.keys(src).forEach(function (k) {
          T[lang][k] = src[k];
        });
      });
    },
    t: function (key) {
      var id = document.documentElement.dataset.siteLang || detect();
      return dict(id)[key];
    },
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(typeof window !== "undefined" ? window : globalThis);
