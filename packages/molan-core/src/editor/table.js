  /* --- table: 表格自适应、工具条与尺寸选择器 --- */
  function contentBoxWidth(el) {
    if (!el) return 0;
    const cs = getComputedStyle(el);
    return el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  }

  function naturalTableMetrics(table) {
    const source = table.closest(".vditor-reset");
    const probe = document.createElement("div");
    probe.className = source?.className || "vditor-reset";
    const clone = table.cloneNode(true);
    clone.classList.remove("molan-table--wide");
    clone.setAttribute("aria-hidden", "true");
    Object.assign(probe.style, {
      position: "fixed",
      visibility: "hidden",
      pointerEvents: "none",
      left: "-100000px",
      top: "0",
    });
    Object.assign(clone.style, { width: "max-content", maxWidth: "none" });
    probe.appendChild(clone);
    document.body.appendChild(probe);
    const columns = [];
    Array.from(clone.rows).forEach((row) => {
      Array.from(row.cells).forEach((cell, index) => {
        const tokens = (cell.textContent || "").match(/[A-Za-z0-9_./\\:$@#%-]+/g) || [];
        const longestToken = tokens.reduce((length, token) => Math.max(length, token.length), 0);
        const preferredMin = cell.querySelector("code") || longestToken >= 18
          ? 168
          : longestToken >= 12
            ? 144
            : 0;
        const current = columns[index] || { natural: 0, preferredMin: 0 };
        columns[index] = {
          natural: Math.max(current.natural, cell.getBoundingClientRect().width),
          preferredMin: Math.max(current.preferredMin, preferredMin),
        };
      });
    });
    const metrics = { width: clone.getBoundingClientRect().width, columns };
    probe.remove();
    return metrics;
  }

  function distributeColumnWidths(naturalColumns, availableWidth) {
    const count = naturalColumns.length;
    if (!count) return [];
    const hardMin = Math.max(64, Math.min(96, availableWidth / count * 0.6));
    const defaultMin = Math.max(80, Math.min(112, availableWidth / count * 0.72));
    let minimums = naturalColumns.map((column) =>
      Math.max(defaultMin, Math.min(column.preferredMin || 0, availableWidth * 0.42)));
    const minimumTotal = minimums.reduce((total, width) => total + width, 0);
    if (minimumTotal > availableWidth) {
      const extraRoom = Math.max(0, availableWidth - hardMin * count);
      const requestedExtra = minimums.map((width) => Math.max(0, width - hardMin));
      const requestedTotal = requestedExtra.reduce((total, width) => total + width, 0);
      minimums = requestedExtra.map((extra) =>
        hardMin + (requestedTotal ? extraRoom * extra / requestedTotal : extraRoom / count));
    }
    const max = Math.max(...minimums, availableWidth * 0.52);
    const ideal = naturalColumns.map((column, index) =>
      Math.max(minimums[index], Math.min(max, column.natural)));
    const idealExtra = ideal.map((width, index) => width - minimums[index]);
    const extraTotal = idealExtra.reduce((total, width) => total + width, 0);
    const remaining = Math.max(0, availableWidth - minimums.reduce((total, width) => total + width, 0));
    if (!extraTotal) return minimums.map((width) => width + remaining / count);
    return idealExtra.map((extra, index) => minimums[index] + remaining * extra / extraTotal);
  }

  function clearMolanTableLayout(root) {
    root?.querySelectorAll(".molan-table--wide").forEach((table) => {
      table.classList.remove("molan-table--wide");
      for (let index = 1; index <= 12; index += 1) {
        table.style.removeProperty(`--molan-col-${index}`);
      }
    });
  }

  function fitMolanTables(root) {
    if (!root) return;
    root.querySelectorAll(".vditor-reset table").forEach((table) => {
      const host = table.closest(".vditor-reset") || table.parentElement;
      const cap = contentBoxWidth(host);
      if (cap <= 0) return;
      const metrics = naturalTableMetrics(table);
      const isWide = metrics.width > cap + 2;
      table.classList.toggle("molan-table--wide", isWide);
      if (!isWide) return;
      distributeColumnWidths(metrics.columns.slice(0, 12), cap).forEach((width, index) => {
        table.style.setProperty(`--molan-col-${index + 1}`, `${width}px`);
      });
    });
  }

  function scheduleFitTables(root) {
    if (!root) return;
    cancelAnimationFrame(scheduleFitTables._raf);
    scheduleFitTables._raf = requestAnimationFrame(() => fitMolanTables(root));
  }

  function watchTables(root) {
    if (!root) return;
    scheduleFitTables(root);
    if (watchTables._obs) return;
    watchTables._obs = new ResizeObserver(() => scheduleFitTables(root));
    watchTables._obs.observe(root);
    const reset = root.querySelector(".vditor-reset");
    if (reset) watchTables._obs.observe(reset);
  }

  const TABLE_PICKER_MAX = 8;
  const TABLE_ACTIONS = [
    ["insertRowAbove", "insertRowAbove"],
    ["insertRowBelow", "insertRowBelow"],
    "|",
    ["insertColLeft", "insertColLeft"],
    ["insertColRight", "insertColRight"],
    "|",
    ["deleteRow", "deleteRow"],
    ["deleteColumn", "deleteColumn"],
  ];
  const TABLE_ICONS = {
    insertRowAbove: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="11" width="16" height="9" rx="1.5"/><path d="M12 3v6M9 6h6"/></svg>',
    insertRowBelow: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="16" height="9" rx="1.5"/><path d="M12 15v6M9 18h6"/></svg>',
    insertColLeft: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="11" y="4" width="9" height="16" rx="1.5"/><path d="M3 12h6M6 9v6"/></svg>',
    insertColRight: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="9" height="16" rx="1.5"/><path d="M15 12h6M18 9v6"/></svg>',
    deleteRow: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="8" width="16" height="8" rx="1.5"/><path d="M8 12h8"/></svg>',
    deleteColumn: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="4" width="8" height="16" rx="1.5"/><path d="M10 12h4"/></svg>',
  };

  function buildTableMarkdown(rows, cols) {
    const rowCount = Math.max(1, Math.min(20, Number(rows) || 1));
    const colCount = Math.max(1, Math.min(20, Number(cols) || 1));
    const line = (fill) => `|${Array.from({ length: colCount }, () => ` ${fill} `).join("|")}|`;
    return [line(""), line("---"), ...Array.from({ length: rowCount - 1 }, () => line(""))].join("\n");
  }

  function tableCellFromNode(node) {
    if (!node) return null;
    const el = node.nodeType === 1 ? node : node.parentElement;
    return el?.closest?.("td, th") || null;
  }

  function irHostOf(root) {
    return root?.querySelector?.(".vditor-ir") || root;
  }

  function currentEditorMode(vditor) {
    const iv = vditor?.vditor || vditor;
    return iv?.currentMode || "ir";
  }

  function notifyTableEdit(vditor, root) {
    try {
      const iv = vditor?.vditor || vditor;
      iv?.options?.input?.("");
      iv?.undo?.addToUndoStack?.(iv);
    } catch (_) { /* ignore */ }
    scheduleFitTables(root);
  }

  function focusTableCell(cell) {
    if (!cell) return;
    const range = document.createRange();
    range.selectNodeContents(cell);
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function ensureTbody(table) {
    if (table.tBodies[0]) return table.tBodies[0];
    const tbody = document.createElement("tbody");
    table.appendChild(tbody);
    return tbody;
  }

  function rowCellHtml(count, tag) {
    const name = tag === "th" ? "th" : "td";
    return Array.from({ length: count }, () => `<${name}> </${name}>`).join("");
  }

  function insertTableRow(cell, where) {
    const row = cell.parentElement;
    const table = cell.closest("table");
    if (!row || !table) return null;
    const html = `<tr>${rowCellHtml(row.cells.length, "td")}</tr>`;
    const inHead = row.parentElement?.tagName === "THEAD" || cell.tagName === "TH";
    if (inHead) {
      const tbody = ensureTbody(table);
      tbody.insertAdjacentHTML("afterbegin", html);
      return tbody.rows[0]?.cells[cell.cellIndex] || tbody.rows[0]?.cells[0];
    }
    row.insertAdjacentHTML(where === "before" ? "beforebegin" : "afterend", html);
    const next = where === "before" ? row.previousElementSibling : row.nextElementSibling;
    return next?.cells?.[cell.cellIndex] || next?.cells?.[0];
  }

  function insertTableColumn(cell, where) {
    const table = cell.closest("table");
    if (!table) return null;
    const index = cell.cellIndex;
    const pos = where === "before" ? "beforebegin" : "afterend";
    Array.from(table.rows).forEach((row) => {
      const ref = row.cells[index];
      if (!ref) return;
      const tag = ref.tagName.toLowerCase();
      ref.insertAdjacentHTML(pos, `<${tag}> </${tag}>`);
    });
    const updated = cell.parentElement?.cells?.[where === "before" ? index : index + 1];
    return updated || cell;
  }

  function deleteTableRow(cell) {
    if (!cell || cell.tagName === "TH") return cell;
    const row = cell.parentElement;
    const table = cell.closest("table");
    const body = row?.parentElement;
    if (!row || !table || !body || body.tagName === "THEAD") return cell;
    const col = cell.cellIndex;
    const fallback = row.nextElementSibling
      || row.previousElementSibling
      || table.tHead?.rows?.[0];
    const next = fallback?.cells?.[col] || fallback?.cells?.[0] || null;
    row.remove();
    if (body.tagName === "TBODY" && body.rows.length === 0) body.remove();
    return next;
  }

  function deleteTableColumn(cell) {
    const table = cell.closest("table");
    if (!table) return null;
    const index = cell.cellIndex;
    if ((table.rows[0]?.cells.length || 0) <= 1) {
      const p = document.createElement("p");
      p.setAttribute("data-block", "0");
      p.textContent = "";
      table.replaceWith(p);
      focusTableCell(p);
      return null;
    }
    const neighbor = cell.nextElementSibling || cell.previousElementSibling;
    Array.from(table.rows).forEach((row) => {
      row.cells[index]?.remove();
    });
    return neighbor;
  }

  function applyTableAction(action, cell) {
    if (!cell) return null;
    switch (action) {
      case "insertRowAbove":
        return insertTableRow(cell, "before");
      case "insertRowBelow":
        return insertTableRow(cell, "after");
      case "insertColLeft":
        return insertTableColumn(cell, "before");
      case "insertColRight":
        return insertTableColumn(cell, "after");
      case "deleteRow":
        return deleteTableRow(cell);
      case "deleteColumn":
        return deleteTableColumn(cell);
      default:
        return cell;
    }
  }

  function hideTableToolbar(bar) {
    if (bar) bar.hidden = true;
  }

  function positionTableToolbar(bar, table, host) {
    if (!bar || !table) return;
    const tableRect = table.getBoundingClientRect();
    const hostRect = host?.getBoundingClientRect?.() || tableRect;
    const gap = 8;
    let top = tableRect.top - bar.offsetHeight - gap;
    if (top < Math.max(8, hostRect.top + 4)) {
      top = Math.min(tableRect.top + gap, hostRect.bottom - bar.offsetHeight - 4);
    }
    let left = tableRect.left;
    const maxLeft = window.innerWidth - bar.offsetWidth - 8;
    left = Math.max(8, Math.min(left, maxLeft));
    bar.style.top = `${Math.round(top)}px`;
    bar.style.left = `${Math.round(left)}px`;
  }

  function ensureTableToolbar(root) {
    let bar = document.getElementById("molanTableToolbar");
    if (bar) return bar;
    bar = document.createElement("div");
    bar.id = "molanTableToolbar";
    bar.className = "molan-table-toolbar";
    bar.hidden = true;
    bar.setAttribute("role", "toolbar");
    bar.innerHTML = TABLE_ACTIONS.map((item) => {
      if (item === "|") return '<span class="molan-table-toolbar__sep" aria-hidden="true"></span>';
      const [action, key] = item;
      const label = t(key);
      return `<button type="button" class="icon-btn" data-molan-table="${action}" title="${label}" aria-label="${label}">${TABLE_ICONS[action]}</button>`;
    }).join("");
    document.body.appendChild(bar);
    return bar;
  }

  function refreshTableToolbarI18n(root = document) {
    root.querySelectorAll("[data-molan-table]").forEach((btn) => {
      const action = btn.getAttribute("data-molan-table");
      const key = {
        insertRowAbove: "insertRowAbove",
        insertRowBelow: "insertRowBelow",
        insertColLeft: "insertColLeft",
        insertColRight: "insertColRight",
        deleteRow: "deleteRow",
        deleteColumn: "deleteColumn",
      }[action];
      if (!key) return;
      const label = t(key);
      btn.title = label;
      btn.setAttribute("aria-label", label);
    });
  }

  function bindTableControls(root, getVditor) {
    if (!root || root.dataset.molanTableControls === "1") return;
    root.dataset.molanTableControls = "1";
    const bar = ensureTableToolbar(root);
    let lastCell = null;
    let raf = 0;

    const sync = () => {
      const vditor = getVditor?.();
      if (root.classList.contains("is-preview") || currentEditorMode(vditor) !== "ir") {
        hideTableToolbar(bar);
        return;
      }
      const cell = tableCellFromNode(window.getSelection()?.anchorNode);
      if (!cell || !root.contains(cell) || !cell.closest(".vditor-ir")) {
        if (!bar.contains(document.activeElement)) hideTableToolbar(bar);
        return;
      }
      lastCell = cell;
      const table = cell.closest("table");
      const host = irHostOf(root);
      const deleteRowBtn = bar.querySelector('[data-molan-table="deleteRow"]');
      if (deleteRowBtn) {
        const locked = cell.tagName === "TH";
        deleteRowBtn.disabled = locked;
        deleteRowBtn.classList.toggle("is-disabled", locked);
      }
      bar.hidden = false;
      positionTableToolbar(bar, table, host);
    };

    const scheduleSync = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        sync();
      });
    };

    document.addEventListener("selectionchange", scheduleSync);
    root.addEventListener("keyup", scheduleSync);
    root.addEventListener("mouseup", scheduleSync);
    irHostOf(root)?.addEventListener("scroll", () => {
      if (!bar.hidden && lastCell?.isConnected) {
        positionTableToolbar(bar, lastCell.closest("table"), irHostOf(root));
      }
    }, { passive: true });
    window.addEventListener("resize", () => {
      if (!bar.hidden && lastCell?.isConnected) {
        positionTableToolbar(bar, lastCell.closest("table"), irHostOf(root));
      }
    });

    bar.addEventListener("mousedown", (e) => {
      e.preventDefault();
    });
    bar.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-molan-table]");
      if (!btn || btn.disabled) return;
      const cell = lastCell?.isConnected
        ? lastCell
        : tableCellFromNode(window.getSelection()?.anchorNode);
      if (!cell || !root.contains(cell)) return;
      const next = applyTableAction(btn.getAttribute("data-molan-table"), cell);
      const vditor = getVditor?.();
      if (next) {
        lastCell = next;
        focusTableCell(next);
      } else {
        lastCell = null;
        hideTableToolbar(bar);
      }
      notifyTableEdit(vditor, root);
      scheduleSync();
    });
  }

  function hideTablePicker() {
    const picker = document.getElementById("molanTablePicker");
    if (picker) picker.hidden = true;
  }

  function positionTablePicker(picker, anchor) {
    const rect = anchor.getBoundingClientRect();
    const width = picker.offsetWidth || 180;
    const height = picker.offsetHeight || 200;
    let left = rect.left;
    let top = rect.bottom + 8;
    if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
    if (left < 8) left = 8;
    if (top + height > window.innerHeight - 8) top = rect.top - height - 8;
    if (top < 8) top = 8;
    picker.style.left = `${Math.round(left)}px`;
    picker.style.top = `${Math.round(top)}px`;
  }

  function paintTablePicker(picker, cols, rows) {
    picker.querySelectorAll("[data-col]").forEach((cell) => {
      const c = Number(cell.getAttribute("data-col"));
      const r = Number(cell.getAttribute("data-row"));
      cell.classList.toggle("is-on", c <= cols && r <= rows);
    });
    const label = picker.querySelector(".molan-table-picker__label");
    if (label) label.textContent = t("tableSize", { cols, rows });
  }

  function ensureTablePicker() {
    let picker = document.getElementById("molanTablePicker");
    if (picker) return picker;
    picker = document.createElement("div");
    picker.id = "molanTablePicker";
    picker.className = "molan-table-picker";
    picker.hidden = true;
    picker.setAttribute("role", "dialog");
    picker.setAttribute("aria-label", t("insertTable"));
    const cells = [];
    for (let r = 1; r <= TABLE_PICKER_MAX; r += 1) {
      for (let c = 1; c <= TABLE_PICKER_MAX; c += 1) {
        cells.push(`<button type="button" class="molan-table-picker__cell" data-col="${c}" data-row="${r}" aria-label="${c} × ${r}"></button>`);
      }
    }
    picker.innerHTML = `
      <div class="molan-table-picker__grid" style="grid-template-columns:repeat(${TABLE_PICKER_MAX}, 16px)">${cells.join("")}</div>
      <div class="molan-table-picker__label">${t("tableSize", { cols: 3, rows: 3 })}</div>
    `;
    document.body.appendChild(picker);
    picker.addEventListener("mousedown", (e) => e.preventDefault());
    picker.addEventListener("mouseover", (e) => {
      const cell = e.target.closest("[data-col]");
      if (!cell) return;
      paintTablePicker(picker, Number(cell.getAttribute("data-col")), Number(cell.getAttribute("data-row")));
    });
    picker.addEventListener("keydown", (e) => {
      if (e.key === "Escape") hideTablePicker();
    });
    return picker;
  }

  function showTableSizePicker(anchor, vditor) {
    const picker = ensureTablePicker();
    picker._vditor = vditor;
    picker._anchor = anchor;
    picker.hidden = false;
    picker.setAttribute("aria-label", t("insertTable"));
    paintTablePicker(picker, 3, 3);
    positionTablePicker(picker, anchor);
  }

  function currentIrBlock(ir) {
    if (!ir) return null;
    const sel = window.getSelection();
    let node = sel?.anchorNode;
    if (node?.nodeType === 3) node = node.parentElement;
    if (!node || !ir.contains(node)) return ir.lastElementChild;
    while (node && node.parentElement !== ir) node = node.parentElement;
    return node;
  }

  function insertPickedTable(vditor, rows, cols) {
    hideTablePicker();
    const md = buildTableMarkdown(rows, cols);
    const iv = vditor?.vditor || vditor;
    const ir = iv?.ir?.element;
    const lute = iv?.lute;
    try { vditor?.focus?.(); } catch (_) { /* ignore */ }
    if (ir && lute && typeof lute.Md2VditorIRDOM === "function") {
      const html = lute.Md2VditorIRDOM(`\n${md}\n`);
      const block = currentIrBlock(ir);
      withMutedIrInput(vditor, () => {
        if (block) block.insertAdjacentHTML("afterend", html);
        else ir.insertAdjacentHTML("beforeend", html);
      });
      const inserted = (block?.nextElementSibling) || ir.lastElementChild;
      const table = inserted?.tagName === "TABLE" ? inserted : inserted?.querySelector?.("table");
      const firstCell = table?.querySelector?.("th, td");
      if (firstCell) focusTableCell(firstCell);
      notifyTableEdit(vditor, ir.closest("#vditor") || ir);
      scheduleFitTables(ir.closest("#vditor") || ir);
      return;
    }
    try { vditor.focus(); } catch (_) { /* ignore */ }
    if (vditor && typeof vditor.insertValue === "function") {
      vditor.insertValue(`\n\n${md}\n\n`);
    }
  }

  function eventPath(e) {
    if (typeof e.composedPath === "function") {
      try { return e.composedPath(); } catch (_) { /* ignore */ }
    }
    const path = [];
    let node = e.target;
    while (node) {
      path.push(node);
      node = node.parentNode;
    }
    return path;
  }
