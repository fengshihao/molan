  /* --- export-paper: 导出时的宣纸 / 白纸 / 无底 --- */
  const PRINT_PAPER_KEY = "molan-print-paper";
  const WHITE_PAPER_VARS = [["--paper", "#ffffff"], ["--paper-deep", "#f4f4f4"], ["--paper-lift", "#ffffff"], ["--diagram-card", "#ffffff"]];

  function printPaperMode() {
    try {
      const value = localStorage.getItem(PRINT_PAPER_KEY);
      if (value === "white" || value === "none") return value;
    } catch (_) { /* ignore */ }
    return "xuan";
  }

  function whitePrintPaper() {
    return printPaperMode() === "white";
  }

  function clearPrintPaper() {
    return printPaperMode() === "none";
  }

  function printPaperColor() {
    if (clearPrintPaper()) return "transparent";
    return whitePrintPaper() ? "#ffffff" : "#f4efe6";
  }

  function printDocClass() {
    const extra = whitePrintPaper() ? " is-print-white" : clearPrintPaper() ? " is-print-clear" : "";
    return `molan-print-doc${extra}`;
  }

  function applyPrintSurface() {
    const root = document.documentElement;
    root.classList.remove("is-print-white", "is-print-clear");
    WHITE_PAPER_VARS.forEach(([name]) => root.style.removeProperty(name));
    if (whitePrintPaper()) {
      root.classList.add("is-print-white");
      WHITE_PAPER_VARS.forEach(([name, value]) => root.style.setProperty(name, value));
    } else if (clearPrintPaper()) {
      root.classList.add("is-print-clear");
    }
  }

  function clearPrintSurface() {
    const root = document.documentElement;
    root.classList.remove("is-print-white", "is-print-clear");
    WHITE_PAPER_VARS.forEach(([name]) => root.style.removeProperty(name));
  }

  function setPrintPaperMode(mode) {
    const next = mode === "white" || mode === "none" ? mode : "xuan";
    try {
      if (next === "xuan") localStorage.removeItem(PRINT_PAPER_KEY);
      else localStorage.setItem(PRINT_PAPER_KEY, next);
    } catch (_) { /* ignore */ }
    paintPrintPaperPicker();
  }

  function paintPrintPaperPicker() {
    const picker = document.getElementById("printPaperPicker");
    if (!picker) return;
    const mode = printPaperMode();
    const title = t("exportPaperTitle");
    picker.title = title;
    picker.setAttribute("aria-label", t("exportPaper"));
    const label = picker.querySelector(".export-paper__label");
    if (label) label.textContent = t("exportPaper");
    picker.querySelectorAll("[data-print-paper]").forEach((btn) => {
      const id = btn.getAttribute("data-print-paper");
      btn.setAttribute("aria-checked", id === mode ? "true" : "false");
      const key = id === "white" ? "exportPaperWhite" : id === "none" ? "exportPaperNone" : "exportPaperXuan";
      btn.textContent = t(key);
      btn.title = title;
    });
  }

  function ensurePrintPaperOption() {
    const menu = document.getElementById("exportMenu");
    if (!menu || document.getElementById("printPaperPicker")) return;
    const picker = document.createElement("div");
    picker.className = "export-paper";
    picker.id = "printPaperPicker";
    picker.setAttribute("role", "radiogroup");
    picker.innerHTML = `<span class="export-paper__label"></span><div class="export-paper__choices">${
      ["xuan", "white", "none"].map((id) => `<button type="button" role="radio" data-print-paper="${id}"></button>`).join("")
    }</div>`;
    picker.addEventListener("click", (e) => {
      const btn = e.target?.closest?.("[data-print-paper]");
      if (!btn || !picker.contains(btn)) return;
      e.preventDefault();
      e.stopPropagation();
      setPrintPaperMode(btn.getAttribute("data-print-paper"));
    });
    menu.appendChild(picker);
    paintPrintPaperPicker();
  }
