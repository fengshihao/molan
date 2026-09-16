  /* --- insert: 行首「+」插入块 --- */
  function bindBlockInsert(ctx) {
    const wrap = ctx.getWrap();
    if (!wrap) return { sync() {}, hide() {}, refreshI18n() {} };

    let handle = wrap.querySelector(":scope > .molan-block-insert");
    if (!handle) {
      handle = document.createElement("div");
      handle.className = "molan-block-insert";
      handle.hidden = true;
      handle.innerHTML = `<button type="button" class="molan-block-plus" aria-haspopup="menu" aria-expanded="false">
        <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3v10M3 8h10"/></svg>
      </button>`;
      wrap.appendChild(handle);
    }
    const plusBtn = handle.querySelector(".molan-block-plus");

    let menu = wrap.querySelector(":scope > .molan-insert-menu");
    if (!menu) {
      menu = document.createElement("div");
      menu.className = "molan-insert-menu";
      menu.hidden = true;
      menu.setAttribute("role", "menu");
      wrap.appendChild(menu);
    }

    let hover = null;
    let menuOpen = false;
    let activeIndex = 0;
    let hideTimer = 0;
    let moveRaf = 0;

    const items = () => INSERT_ITEMS.filter((row) => !row.sep);

    function paintMenu() {
      menu.innerHTML = INSERT_ITEMS.map((item) => {
        if (item.sep) return '<span class="molan-insert-sep" aria-hidden="true"></span>';
        const label = t(item.key);
        return `<button type="button" class="molan-insert-item" role="menuitem" data-insert-id="${item.id}" title="${label}" aria-label="${label}">
            ${item.icon}
          </button>`;
      }).join("");
      plusBtn.setAttribute("aria-label", t("insertBlock"));
      plusBtn.setAttribute("title", t("insertBlock"));
      menu.setAttribute("aria-label", t("insertBlock"));
    }

    function visibleItems() {
      return [...menu.querySelectorAll(".molan-insert-item")];
    }

    function paintActive() {
      visibleItems().forEach((el, i) => el.classList.toggle("is-active", i === activeIndex));
    }

    function contentRoot() {
      if (ctx.getPreviewing()) return ctx.getPreviewBody();
      const vditorRoot = ctx.getVditorRoot();
      return vditorRoot?.querySelector(".vditor-ir pre.vditor-reset")
        || vditorRoot?.querySelector(".vditor-ir .vditor-reset")
        || vditorRoot?.querySelector(".vditor-wysiwyg pre.vditor-reset")
        || vditorRoot?.querySelector(".vditor-wysiwyg .vditor-reset")
        || null;
    }

    function hideHandle() {
      if (menuOpen) return;
      handle.hidden = true;
      handle.classList.remove("is-visible");
      hover = null;
    }

    function hideMenu() {
      if (document.activeElement && menu.contains(document.activeElement)) {
        try { document.activeElement.blur(); } catch (_) { /* ignore */ }
      }
      menuOpen = false;
      menu.hidden = true;
      plusBtn.setAttribute("aria-expanded", "false");
    }

    function handleRect(target) {
      if (!target) return null;
      if (target.gapRect) return target.gapRect;
      return target.el?.getBoundingClientRect?.() || null;
    }

    function positionHandle(target) {
      const rect = handleRect(target);
      if (!rect) {
        hideHandle();
        return;
      }
      const wrapRect = wrap.getBoundingClientRect();
      if (rect.bottom < wrapRect.top + 8 || rect.top > wrapRect.bottom - 8) {
        handle.hidden = true;
        return;
      }
      const rtl = document.documentElement.dir === "rtl";
      const size = 26;
      const top = rect.top - wrapRect.top + Math.min(Math.max((Math.min(rect.height, 32) - size) / 2, 0), 8);
      let left = rtl
        ? rect.right - wrapRect.left + 8
        : rect.left - wrapRect.left - size - 8;
      left = Math.max(4, Math.min(left, wrapRect.width - size - 4));
      handle.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
      handle.hidden = false;
      handle.classList.add("is-visible");
    }

    function positionMenu() {
      const wrapRect = wrap.getBoundingClientRect();
      const btnRect = plusBtn.getBoundingClientRect();
      menu.hidden = false;
      const menuRect = menu.getBoundingClientRect();
      const rtl = document.documentElement.dir === "rtl";
      let left = rtl
        ? btnRect.left - wrapRect.left - menuRect.width - 8
        : btnRect.right - wrapRect.left + 8;
      let top = btnRect.top - wrapRect.top + (btnRect.height - menuRect.height) / 2;
      if (left + menuRect.width > wrapRect.width - 8) {
        left = Math.max(8, wrapRect.width - menuRect.width - 8);
      }
      if (left < 8) left = 8;
      if (top < 8) top = 8;
      if (top + menuRect.height > wrapRect.height - 8) {
        top = Math.max(8, wrapRect.height - menuRect.height - 8);
      }
      menu.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
    }

    function setHover(next) {
      hover = next;
      if (!next) {
        hideHandle();
        return;
      }
      positionHandle(next);
    }

    function makeGapTarget(index, top, bottom, left) {
      const size = 26;
      const mid = (top + bottom) / 2;
      const gapTop = mid - size / 2;
      return {
        el: null,
        index,
        empty: false,
        gapRect: {
          top: gapTop,
          left,
          width: size,
          height: size,
          right: left + size,
          bottom: gapTop + size,
        },
      };
    }

    function hitFromPoint(clientX, clientY) {
      const root = contentRoot();
      if (!root) return null;
      const hitNode = document.elementFromPoint(clientX, clientY);
      if (hitNode && (hitNode.closest(".molan-block-insert") || hitNode.closest(".molan-insert-menu"))) {
        return hover;
      }
      const blocks = topLevelBlocks(root);
      const rootRect = root.getBoundingClientRect();
      const rtl = document.documentElement.dir === "rtl";
      const left = rtl ? rootRect.right - 26 : rootRect.left;
      if (!blocks.length) {
        return { el: root, index: 0, emptyDoc: true, empty: true };
      }

      for (let i = 0; i < blocks.length; i++) {
        const r = blocks[i].getBoundingClientRect();
        const prevBottom = i === 0 ? rootRect.top : blocks[i - 1].getBoundingClientRect().bottom;
        if (clientY >= prevBottom && clientY < r.top) {
          return makeGapTarget(i - 1, prevBottom, r.top, left);
        }
        if (clientY >= r.top && clientY <= r.bottom) {
          if (blockLooksEmpty(blocks[i])) {
            return { el: blocks[i], index: i, empty: true };
          }
          return null;
        }
      }

      const last = blocks[blocks.length - 1];
      const lastBottom = last.getBoundingClientRect().bottom;
      const after = Math.min(rootRect.bottom, lastBottom + 28);
      if (clientY > lastBottom && clientY <= after) {
        return makeGapTarget(blocks.length - 1, lastBottom, after, left);
      }
      return null;
    }

    function onMove(event) {
      if (menuOpen) return;
      if (moveRaf) cancelAnimationFrame(moveRaf);
      const { clientX, clientY } = event;
      moveRaf = requestAnimationFrame(() => {
        moveRaf = 0;
        const next = hitFromPoint(clientX, clientY);
        if (!next) {
          if (hideTimer) clearTimeout(hideTimer);
          hideTimer = window.setTimeout(hideHandle, 180);
          return;
        }
        if (hideTimer) {
          clearTimeout(hideTimer);
          hideTimer = 0;
        }
        setHover(next);
      });
    }

    function onLeave(event) {
      if (menuOpen) return;
      const to = event.relatedTarget;
      if (to && (handle.contains(to) || menu.contains(to))) return;
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = window.setTimeout(hideHandle, 220);
    }

    function openMenu() {
      if (!hover) return;
      paintMenu();
      menuOpen = true;
      activeIndex = 0;
      plusBtn.setAttribute("aria-expanded", "true");
      positionHandle(hover);
      positionMenu();
      paintActive();
      const first = visibleItems()[0];
      first?.focus();
    }

    function applyItem(id) {
      const item = items().find((row) => row.id === id);
      const target = hover;
      if (!item || !target) return;
      hideMenu();
      const run = async () => {
        let md = item.md;
        if (item.pick === "image") {
          hideHandle();
          try {
            md = await ctx.pickImage?.();
          } catch (_) {
            toast(t("pickImageFail"));
            return;
          }
          if (!md) return;
        }
        hideHandle();
        await ctx.insertSnippet?.(md, target);
      };
      void run();
    }

    plusBtn.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    plusBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (menuOpen) hideMenu();
      else openMenu();
    });
    handle.addEventListener("mouseenter", () => {
      if (hideTimer) {
        clearTimeout(hideTimer);
        hideTimer = 0;
      }
    });
    menu.addEventListener("click", (event) => {
      const btn = event.target.closest(".molan-insert-item");
      if (!btn) return;
      event.preventDefault();
      applyItem(btn.getAttribute("data-insert-id"));
    });
    menu.addEventListener("mouseover", (event) => {
      const btn = event.target.closest(".molan-insert-item");
      if (!btn) return;
      const rows = visibleItems();
      activeIndex = Math.max(0, rows.indexOf(btn));
      paintActive();
    });

    document.addEventListener("pointerdown", (event) => {
      if (!menuOpen) return;
      if (menu.contains(event.target) || handle.contains(event.target)) return;
      hideMenu();
    }, true);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && menuOpen) {
        event.preventDefault();
        hideMenu();
        plusBtn.focus();
        return;
      }
      if (!menuOpen) return;
      const rows = visibleItems();
      if (!rows.length) return;
      if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        const delta = (event.key === "ArrowDown" || event.key === "ArrowRight") ? 1 : -1;
        activeIndex = (activeIndex + delta + rows.length) % rows.length;
        paintActive();
        rows[activeIndex]?.focus();
      } else if (event.key === "Enter") {
        event.preventDefault();
        const id = rows[activeIndex]?.getAttribute("data-insert-id");
        if (id) applyItem(id);
      }
    });

    wrap.addEventListener("mousemove", onMove);
    wrap.addEventListener("mouseleave", onLeave);
    const onScroll = () => {
      if (hover) positionHandle(hover);
      if (menuOpen) positionMenu();
    };
    wrap.addEventListener("scroll", onScroll, true);
    const scrollBound = new WeakSet();
    function watchScroller(el) {
      if (!el || scrollBound.has(el)) return;
      scrollBound.add(el);
      el.addEventListener("scroll", onScroll, { passive: true });
    }

    paintMenu();
    watchScroller(ctx.getPreviewBody());

    return {
      sync() {
        watchScroller(ctx.getPreviewBody());
        watchScroller(ctx.getVditorRoot()?.querySelector(".vditor-ir"));
        if (menuOpen && hover) {
          positionHandle(hover);
          positionMenu();
        } else if (!menuOpen) {
          hideHandle();
        }
      },
      hide() {
        hideMenu();
        hideHandle();
      },
      refreshI18n() {
        paintMenu();
        if (menuOpen) {
          paintActive();
          positionMenu();
        }
      },
    };
  }
