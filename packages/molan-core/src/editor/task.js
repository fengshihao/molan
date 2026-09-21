  /* --- task: 预览里勾选待办，写回 Markdown --- */
  function lineIsFence(line) {
    return /^ {0,3}(`{3,}|~{3,})/.test(line);
  }

  function listTaskMarks(source) {
    const lines = String(source ?? "").split("\n");
    const marks = [];
    let offset = 0;
    let fence = false;
    let inList = false;
    for (const line of lines) {
      if (lineIsFence(line)) {
        fence = !fence;
        inList = false;
      } else if (!fence && line.trim()) {
        const stripped = line.replace(/^(?: {0,3}> *)+/, "");
        const list = /^([ \t]*)([-*+]|\d+[.)])([ \t]+)/.exec(stripped);
        const indentedCode = /^(?: {4,}|\t)/.test(stripped) && !inList;
        if (list && !indentedCode && !(list[1].length >= 4 && !inList)) {
          inList = true;
          const task = /^([ \t]*)([-*+]|\d+[.)])([ \t]+)\[([ xX])\]/.exec(stripped);
          if (task) {
            const prefix = line.length - stripped.length;
            marks.push(offset + prefix + task[1].length + task[2].length + task[3].length + 1);
          }
        } else if (!/^(?: {4,}|\t)/.test(stripped)) {
          inList = false;
        }
      }
      offset += line.length + 1;
    }
    return marks;
  }

  function toggleTaskMarkdown(source, index) {
    const src = String(source ?? "");
    const at = listTaskMarks(src)[index];
    if (at == null) return src;
    const ch = src[at];
    if (ch !== " " && ch !== "x" && ch !== "X") return src;
    return src.slice(0, at) + (ch === " " ? "x" : " ") + src.slice(at + 1);
  }

  function previewTaskBoxes(root) {
    if (!root) return [];
    return [...root.querySelectorAll("li.vditor-task input[type='checkbox']")];
  }

  function armPreviewTasks(root) {
    const label = t("toggleTask");
    previewTaskBoxes(root).forEach((box) => {
      box.disabled = false;
      box.removeAttribute("disabled");
      box.title = label;
      box.setAttribute("aria-label", label);
    });
  }

  function bindPreviewTasks(root, handlers) {
    if (!root || root.dataset.molanPreviewTasks === "1") return;
    root.dataset.molanPreviewTasks = "1";
    const boxFrom = (e) => {
      const box = e.target?.closest?.("input[type='checkbox']");
      if (!box || !root.contains(box) || !box.closest("li.vditor-task")) return null;
      if (!handlers.isPreviewing?.()) return null;
      return box;
    };
    root.addEventListener("mousedown", (e) => {
      if (!boxFrom(e)) return;
      e.stopPropagation();
    }, true);
    root.addEventListener("click", (e) => {
      const box = boxFrom(e);
      if (!box) return;
      e.preventDefault();
      e.stopPropagation();
      const index = previewTaskBoxes(root).indexOf(box);
      if (index < 0) return;
      const next = toggleTaskMarkdown(handlers.getMarkdown?.() || "", index);
      handlers.applyMarkdown?.(next);
    }, true);
  }
