  /* --- image: 插入菜单图标与在线图片地址 --- */
  const INSERT_ICON = {
    table: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="14" rx="1.5"/><path d="M4 10h16M4 15h16M10 5v14"/></svg>',
    code: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 8 5 12l4 4M15 8l4 4-4 4"/></svg>',
    math: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10L9 12l8 5H7"/></svg>',
    mermaid: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4.5" width="7" height="5.5" rx="1.2"/><rect x="13" y="14" width="7" height="5.5" rx="1.2"/><path d="M7.5 10v3.2h9V14"/></svg>',
    image: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="6" width="16" height="12" rx="2"/><circle cx="9" cy="10.5" r="1.4"/><path d="m5 16 4-3.2 3.2 2.6 2.6-2 4.2 3.4"/></svg>',
    quote: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 17V10H5.8C5.8 7.6 7.4 6.2 9.8 6"/><path d="M16.2 17V10h-2.2c0-2.4 1.6-3.8 4-4"/></svg>',
    hr: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h16"/><circle cx="8" cy="12" r="1.2"/><circle cx="16" cy="12" r="1.2"/></svg>',
    ul: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6" cy="7" r="1.2"/><circle cx="6" cy="12" r="1.2"/><circle cx="6" cy="17" r="1.2"/><path d="M10 7h8M10 12h8M10 17h8"/></svg>',
    ol: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6.2V9M5 9h2M5.2 13.6c.4-.6 1.2-.8 1.8-.4.4.3.5.8.3 1.2L5 17.2h3"/><path d="M10 7h8M10 12h8M10 17h8"/></svg>',
    task: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5.5" width="6" height="6" rx="1.2"/><path d="m5.6 8.6 1.5 1.5 2.6-2.8M13 8h7M4 17h6M13 17h7"/></svg>',
  };

  const INSERT_ITEMS = [
    { id: "h1", key: "insertH1", md: "# ", icon: "<span>H1</span>" },
    { id: "h2", key: "insertH2", md: "## ", icon: "<span>H2</span>" },
    { id: "h3", key: "insertH3", md: "### ", icon: "<span>H3</span>" },
    { id: "quote", key: "insertQuote", md: "> ", icon: INSERT_ICON.quote },
    { id: "hr", key: "insertHr", md: "---", icon: INSERT_ICON.hr },
    { sep: true },
    { id: "ul", key: "insertUl", md: "- ", icon: INSERT_ICON.ul },
    { id: "ol", key: "insertOl", md: "1. ", icon: INSERT_ICON.ol },
    { id: "task", key: "insertTask", md: "- [ ] ", icon: INSERT_ICON.task },
    { sep: true },
    { id: "table", key: "insertTable", md: "| 列 1 | 列 2 |\n| --- | --- |\n|  |  |", icon: INSERT_ICON.table },
    { id: "code", key: "insertCode", md: "```\n\n```", icon: INSERT_ICON.code },
    { id: "math", key: "insertMath", md: "$$\n\n$$", icon: INSERT_ICON.math },
    { id: "mermaid", key: "insertMermaid", md: "```mermaid\nflowchart TD\n  A[开始] --> B[结束]\n```", icon: INSERT_ICON.mermaid },
    { id: "image", key: "insertImage", pick: "image", icon: INSERT_ICON.image },
  ];

  function escapeMdAlt(name) {
    return String(name || "").replace(/[[\]\n]/g, " ").trim() || "image";
  }

  function parseOnlineImageUrl(raw) {
    const s = String(raw || "").trim().replace(/^<|>$/g, "");
    if (!s) return "";
    try {
      const url = new URL(s);
      if (url.protocol !== "http:" && url.protocol !== "https:") return "";
      return url.href;
    } catch (_) {
      return "";
    }
  }

  function parseInlineHref(raw) {
    const s = String(raw || "").trim().replace(/^<|>$/g, "");
    if (!s || /[\s<>]/.test(s)) return "";
    if (/^(javascript|data|vbscript):/i.test(s)) return "";
    return s;
  }

  function altFromImageUrl(href) {
    try {
      const leaf = new URL(href).pathname.split("/").filter(Boolean).pop() || "";
      const name = decodeURIComponent(leaf).replace(/\.[^.]+$/, "");
      return escapeMdAlt(name);
    } catch (_) {
      return "image";
    }
  }

  function promptImageUrl() {
    return new Promise((resolve) => {
      document.getElementById("molanImageUrlDialog")?.remove();
      const mask = document.createElement("div");
      mask.id = "molanImageUrlDialog";
      mask.className = "molan-image-url-mask";
      mask.innerHTML = `
        <form class="molan-image-url-dialog" role="dialog" aria-modal="true" aria-labelledby="molanImageUrlTitle" novalidate>
          <div class="molan-image-url-title" id="molanImageUrlTitle"></div>
          <p class="molan-image-url-hint"></p>
          <input class="molan-image-url-input" type="url" inputmode="url" autocomplete="off" spellcheck="false" />
          <div class="molan-image-url-actions">
            <button type="button" class="molan-image-url-cancel"></button>
            <button type="submit" class="molan-image-url-ok"></button>
          </div>
        </form>
      `;
      const form = mask.querySelector(".molan-image-url-dialog");
      const input = mask.querySelector(".molan-image-url-input");
      const cancel = mask.querySelector(".molan-image-url-cancel");
      mask.querySelector(".molan-image-url-title").textContent = t("imageUrlTitle");
      mask.querySelector(".molan-image-url-hint").textContent = t("imageUrlHint");
      input.placeholder = t("imageUrlPlaceholder");
      cancel.textContent = t("imageUrlCancel");
      mask.querySelector(".molan-image-url-ok").textContent = t("imageUrlConfirm");
      let settled = false;
      const finish = (md) => {
        if (settled) return;
        settled = true;
        window.removeEventListener("keydown", onKey, true);
        mask.remove();
        resolve(md);
      };
      const onKey = (e) => {
        if (e.key !== "Escape") return;
        e.preventDefault();
        e.stopPropagation();
        finish("");
      };
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const href = parseOnlineImageUrl(input.value);
        if (!href) {
          input.classList.add("is-invalid");
          toast(t("imageUrlInvalid"));
          input.focus();
          input.select();
          return;
        }
        finish(`![${altFromImageUrl(href)}](${href})`);
      });
      cancel.addEventListener("click", () => finish(""));
      mask.addEventListener("click", (e) => {
        if (e.target === mask) finish("");
      });
      form.addEventListener("click", (e) => e.stopPropagation());
      window.addEventListener("keydown", onKey, true);
      document.body.appendChild(mask);
      requestAnimationFrame(() => input.focus());
    });
  }
