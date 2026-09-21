  /* --- create: MolanEditor.create --- */
  function create(options = {}) {
    const elementId = options.elementId || "vditor";
    const cdn = options.cdn || DEFAULT_CDN;
    const placeholder = options.placeholder || t("placeholder");
    toastEl = document.getElementById("toast");
    patchMermaidLoader();
    preloadLute(cdn);

    const lightbox = initLightbox();
    const vditorRoot = document.getElementById(elementId);
    if (!vditorRoot) {
      return Promise.reject(new Error(`找不到编辑器容器 #${elementId}`));
    }
    if (typeof global.Vditor?.preview !== "function") {
      return Promise.reject(new Error("Vditor 预览未加载"));
    }

    const { wrap, host: previewHost, body: previewBody } = ensureLitePreviewDom(vditorRoot);
    const previewRoot = wrap || vditorRoot;
    let vditor = null;
    let vditorReady = null;
    let markdown = "";
    let previewing = options.defaultPreview !== false;
    const docUndo = [];
    const docRedo = [];

    const readLiveMarkdown = () => {
      if (sourceOpen) {
        const { text } = sourceEls();
        if (text) return text.value;
      }
      if (previewing || !vditor) return markdown;
      try { return vditor.getValue(); } catch (_) { return markdown; }
    };

    const writeLiveMarkdown = (next) => {
      markdown = String(next ?? "");
      if (sourceOpen) {
        const { text } = sourceEls();
        if (text && text.value !== markdown) text.value = markdown;
      }
      if (previewing) {
        const spot = sourceOpen ? captureSourceReadingSpot() : captureReadingSpot(true);
        renderLitePreview(markdown, spot);
      } else if (vditor) {
        try { vditor.setValue(markdown, false); } catch (_) { /* ignore */ }
      }
      try { options.onInput?.(); } catch (_) { /* ignore */ }
    };

    const applyDocChange = (next) => {
      const before = readLiveMarkdown();
      const value = String(next ?? "");
      if (value === before) return false;
      docUndo.push(before);
      if (docUndo.length > 80) docUndo.shift();
      docRedo.length = 0;
      writeLiveMarkdown(value);
      syncHistoryChrome();
      return true;
    };

    const undoDoc = () => {
      if (!docUndo.length) return false;
      docRedo.push(readLiveMarkdown());
      writeLiveMarkdown(docUndo.pop());
      syncHistoryChrome();
      return true;
    };

    const redoDoc = () => {
      if (!docRedo.length) return false;
      docUndo.push(readLiveMarkdown());
      writeLiveMarkdown(docRedo.pop());
      syncHistoryChrome();
      return true;
    };

    const clearDocHistory = () => {
      docUndo.length = 0;
      docRedo.length = 0;
      syncHistoryChrome();
    };
    let previewSeq = 0;
    let muteInput = false;
    const previewListeners = [];
    const previewSelection = bindPreviewSelection({
      getRoot: () => previewBody,
      isPreviewing: () => previewing,
      sectionAsk: options.sectionAsk === true,
    });
    previewSelection.onSelection((focus) => {
      try { options.onSelection?.(focus); } catch (_) { /* ignore */ }
    });
    let blockInsert = { sync() {}, hide() {}, refreshI18n() {} };
    let lastPreviewSource = null;
    const mermaidBridge = {
      getPreviewing: () => previewing,
      onApplyMermaidEdit: null,
    };

    setMermaidMarkdownProvider(() => {
      if (previewing) return markdown;
      if (vditor) {
        try { return vditor.getValue(); } catch (_) { /* ignore */ }
      }
      return markdown;
    });
    bindMermaidInteractions(previewRoot, () => vditor, lightbox, mermaidBridge);
    bindFormatBar(vditorRoot, () => vditor, () => previewing, {
      previewFormat: options.previewFormatBar === true,
      getPreviewRoot: () => previewBody,
      getMarkdown: () => {
        if (sourceOpen) {
          const { text } = sourceEls();
          if (text) return text.value;
        }
        if (previewing || !vditor) return markdown;
        try { return vditor.getValue(); } catch (_) { return markdown; }
      },
      applyMarkdown: (next) => {
        applyDocChange(next);
      },
    });
    bindPreviewTasks(previewBody, {
      isPreviewing: () => previewing,
      getMarkdown: readLiveMarkdown,
      applyMarkdown: applyDocChange,
    });
    bindPreviewCodeCopy();
    watchMermaidPreviews(previewRoot);
    watchTables(previewRoot);
    initFind();
    initType();
    initTheme();
    initHeaderPrefs();
    observeFindTarget(previewRoot);

    const markdownOpts = {
      linkBase: options.linkBase || "",
      toc: false,
      fixTermTypo: false,
      autoSpace: false,
      paragraphBeginningSpace: false,
      listStyle: false,
      sanitize: true,
      codeBlockPreview: true,
      mathBlockPreview: true,
    };
    const lazyLoadImage = `${cdn}/dist/images/img-loading.svg`;

    const notifyPreview = () => {
      previewListeners.forEach((cb) => {
        try { cb(previewing); } catch (_) { /* ignore */ }
      });
      if (!previewing) previewSelection.clear();
      syncHistoryChrome();
    };

    const syncLiteClass = () => {
      wrap?.classList.toggle("is-lite-preview", previewing);
      vditorRoot.classList.toggle("is-preview", previewing);
      if (previewing) hideFormatBar();
      if (outlineIsOpen()) {
        relocateVditorOutline();
        const inner = innerVditor(vditor);
        try { inner?.outline?.render?.(inner); } catch (_) { /* ignore */ }
      }
    };

    const renderLitePreview = (text, spot) => {
      if (!previewBody || typeof global.Vditor?.preview !== "function") return;
      const seq = ++previewSeq;
      const sourceText = text ?? "";
      const restoreScroll = renderLitePreview._scrollTop;
      renderLitePreview._scrollTop = null;
      syncLiteClass();
      const finishPreview = () => {
        if (seq !== previewSeq) return;
        if (spot) keepReadingSpot(true, spot);
        if (findState.open) runFind({ keepIndex: true, reveal: false });
        blockInsert.sync();
        previewSelection.decorate();
        armPreviewTasks(previewBody);
        scheduleOutlineRefresh();
      };
      if (spot && lastPreviewSource === sourceText && previewBody.childElementCount) {
        finishPreview();
        return;
      }
      maybePreloadMermaid(cdn, sourceText);
      const run = () => {
        if (seq !== previewSeq) return;
        global.Vditor.preview(previewBody, sourceText, {
          cdn,
          lazyLoadImage,
          mode: "light",
          hljs: { style: "kimbie-dark", lineNumber: false },
          math: { engine: "KaTeX", inlineDigit: true },
          markdown: markdownOpts,
          after() {
            if (seq !== previewSeq) return;
            lastPreviewSource = sourceText;
            const root = previewHost || previewBody;
            stampMermaidSources(root, sourceText);
            enhanceMermaidPreviews(root);
            scheduleFitTables(root);
            if (typeof restoreScroll === "number" && previewBody) {
              previewBody.scrollTop = restoreScroll;
            }
            finishPreview();
          },
        });
      };
      Promise.resolve(preloadLute(cdn)).then(run, run);
    };

    mermaidBridge.onApplyMermaidEdit = (index, newSource) => {
      if (index < 0) {
        toast(t("cannotEdit"));
        return false;
      }
      const next = replaceMermaidBlock(markdown, index, newSource);
      if (next === markdown) {
        toast(t("cannotEdit"));
        return false;
      }
      docUndo.push(markdown);
      if (docUndo.length > 80) docUndo.shift();
      docRedo.length = 0;
      markdown = next;
      syncHistoryChrome();
      if (previewing) {
        const spot = captureReadingSpot(true);
        renderLitePreview(markdown, spot);
      } else {
        muteInput = true;
        bootEditor().then(() => {
          if (!vditor) return;
          vditor.setValue(markdown, false);
          applyMermaidTheme();
          setTimeout(() => {
            muteInput = false;
            refreshMermaidDiagrams(vditorRoot).finally(() => scheduleFitTables(vditorRoot));
          }, 400);
        });
      }
      try { options.onInput?.(); } catch (_) { /* ignore */ }
      toast(t("mermaidUpdated"));
      return true;
    };

    onThemeChange(() => {
      applyMermaidTheme();
      if (previewing) {
        if (previewBody) renderLitePreview._scrollTop = previewBody.scrollTop;
        renderLitePreview(markdown);
      } else {
        refreshMermaidDiagrams(vditorRoot);
      }
    });

    const bootEditor = () => {
      if (vditor) return Promise.resolve(vditor);
      if (vditorReady) return vditorReady;
      vditorReady = ensureFullVditor(cdn).then(() => new Promise((resolve) => {
        maybePreloadMermaid(cdn, markdown);
        vditor = new global.Vditor(elementId, {
          cdn,
          height: "100%",
          mode: "ir",
          theme: "classic",
          icon: "ant",
          lang: options.lang || (global.MolanI18n && global.MolanI18n.vditorLang()) || "zh_CN",
          placeholder,
          cache: { enable: false },
          undoDelay: 200,
          hint: { delay: 400 },
          toolbar: [
            "bold", "italic", "strike", "inline-code", "link",
            "table",
            "undo", "redo",
            "edit-mode", "outline",
          ],
          toolbarConfig: { pin: true, hide: false },
          preview: {
            delay: 800,
            maxWidth: 2400,
            actions: options.previewActions || [],
            theme: { current: "light" },
            hljs: { style: "kimbie-dark", lineNumber: false },
            math: { engine: "KaTeX", inlineDigit: true },
            markdown: markdownOpts,
            lazyLoadImage,
          },
          counter: {
            enable: false,
          },
          input: () => {
            if (previewing || muteInput) return;
            scheduleFitTables(vditorRoot);
            scheduleOutlineRefresh();
            syncHistoryChrome();
            try {
              options.onInput?.();
            } catch (_) { /* ignore */ }
          },
          ctrlEnter: () => {
            options.onSave?.();
          },
          after: () => {
            applyMermaidTheme();
            watchMermaidIrExpand(vditorRoot, mermaidBridge, lightbox, () => vditor);
            watchMermaidPreviews(previewRoot);
            watchTables(vditorRoot);
            bindTableInsertPicker(vditorRoot, () => vditor);
            bindTableControls(vditorRoot, () => vditor);
            bindFormatBar(vditorRoot, () => vditor, () => previewing, {
              previewFormat: options.previewFormatBar === true,
              getPreviewRoot: () => previewBody,
            });
            bindIrListGuards(vditorRoot, () => vditor, () => previewing);
            relocateVditorOutline();
            revealVditorIcons();
            blockInsert.sync();
            scheduleOutlineRefresh();
            syncHistoryChrome();
            resolve(vditor);
          },
        });
      })).catch((err) => {
        vditorReady = null;
        throw err;
      });
      return vditorReady;
    };

    const pickImage = () => promptImageUrl();

    let pendingInsert = null;

    const releasePreviewOverlay = () => {
      wrap?.classList.remove("is-preparing-edit");
    };

    const applySnippet = async (snippet, hover) => {
      const piece = String(snippet || "").replace(/^\n+/, "").replace(/\n+$/, "");
      if (!piece) return;
      const before = readLiveMarkdown();
      const mermaidReady = maybePreloadMermaid(cdn, piece);
      const anchor = hover?.gapRect || hover?.el?.getBoundingClientRect?.();
      const viewportY = anchor ? anchor.top + Math.min(anchor.height || 26, 28) / 2 : null;
      const previewScrollTop = previewBody?.scrollTop;
      const paintInsertedMermaid = (el) => {
        if (snippetKind(piece) !== "mermaid") return;
        const run = () => {
          captureMermaidSources(el && el.isConnected ? el : vditorRoot);
          refreshMermaidDiagrams(vditorRoot);
        };
        Promise.resolve(mermaidReady).then(run, run);
      };
      const finish = (el) => {
        let node = el;
        if (!node?.isConnected && vditor) {
          node = locateInsertedBlock(irRootOf(vditor), {
            kind: snippetKind(piece),
            snippet: piece,
            focusText: piece.replace(/\s+/g, " ").trim().slice(0, 80),
            focusIndex: hover?.emptyDoc || hover?.index < 0
              ? 0
              : hover?.empty ? (hover.index ?? 0) : (hover?.index ?? 0) + 1,
          });
        }
        pendingInsert = {
          el: node,
          viewportY,
          kind: snippetKind(piece),
          snippet: piece,
          focusText: piece.replace(/\s+/g, " ").trim().slice(0, 80),
          focusIndex: hover?.emptyDoc || hover?.index < 0
            ? 0
            : hover?.empty ? (hover.index ?? 0) : (hover?.index ?? 0) + 1,
        };
        settleInsertedBlock(node, viewportY);
        paintInsertedMermaid(node);
        requestAnimationFrame(() => {
          const root = readingContentRoot(false);
          const live = pendingInsert?.el?.isConnected
            ? pendingInsert.el
            : locateInsertedBlock(root, pendingInsert);
          settleInsertedBlock(live, viewportY);
          paintInsertedMermaid(live);
          if (vditor) {
            try { markdown = vditor.getValue(); } catch (_) { /* ignore */ }
          }
          if (markdown !== before) {
            docUndo.push(before);
            if (docUndo.length > 80) docUndo.shift();
            docRedo.length = 0;
            syncHistoryChrome();
          }
          releasePreviewOverlay();
        });
        try { options.onInput?.(); } catch (_) { /* ignore */ }
      };
      if (previewing || !vditor) {
        try {
          await api.setPreview(false, { holdPreview: true, previewScrollTop });
          finish(insertIrSnippet(vditor, piece, hover));
        } catch (err) {
          releasePreviewOverlay();
          throw err;
        }
        return;
      }
      finish(insertIrSnippet(vditor, piece, hover));
    };

    blockInsert = bindBlockInsert({
      getWrap: () => wrap,
      getPreviewBody: () => previewBody,
      getVditorRoot: () => vditorRoot,
      getPreviewing: () => previewing,
      insertSnippet: applySnippet,
      pickImage,
    });
    activeBlockInsert = blockInsert;

    const api = {
      async setValue(text, clearStack = true) {
        markdown = text ?? "";
        if (clearStack) clearDocHistory();
        if (previewing) {
          renderLitePreview(markdown);
          if (sourceOpen) fillSourceText();
          return;
        }
        muteInput = true;
        await bootEditor();
        vditor.setValue(markdown, clearStack);
        if (sourceOpen) fillSourceText();
        applyMermaidTheme();
        setTimeout(() => {
          muteInput = false;
          refreshMermaidDiagrams(vditorRoot).finally(() => {
            scheduleFitTables(vditorRoot);
            if (findState.open) runFind({ keepIndex: true, reveal: false });
            blockInsert.sync();
            scheduleOutlineRefresh();
          });
        }, 400);
      },
      getValue() {
        if (sourceOpen) {
          const { text } = sourceEls();
          if (text) return text.value;
        }
        if (previewing || !vditor) return markdown;
        clearMolanTableLayout(vditorRoot);
        sweepOrphanIrNodes(irRootOf(vditor));
        const value = vditor.getValue();
        scheduleFitTables(vditorRoot);
        return value;
      },
      focus() {
        if (previewing || !vditor) return;
        const editable = readingContentRoot(false);
        if (editable && typeof editable.focus === "function") {
          try { editable.focus({ preventScroll: true }); return; } catch (_) { /* ignore */ }
        }
        try { vditor.focus(); } catch (_) { /* ignore */ }
      },
      isPreview() {
        return previewing;
      },
      async setPreview(on, opts = {}) {
        const want = Boolean(on);
        if (want === previewing) return previewing;
        let spot = opts.spot || captureReadingSpot(previewing);
        if (want) {
          wrap?.classList.remove("is-preparing-edit");
          hideTablePicker();
          hideTableToolbar(document.getElementById("molanTableToolbar"));
          hideFormatBar();
          if (sourceOpen) {
            commitSourceFromTextarea();
            spot = captureSourceReadingSpot() || spot;
            closeSourceView({ restorePreview: false });
          }
          if (vditor) {
            try { markdown = api.getValue(); } catch (_) { /* ignore */ }
          }
          previewing = true;
          blockInsert.hide();
          if (!opts.skipRender) {
            renderLitePreview(markdown, spot);
          } else {
            syncLiteClass();
          }
          if (sourceOpen) fillSourceText();
          notifyPreview();
          return true;
        }
        if (sourceOpen) {
          commitSourceFromTextarea();
          spot = captureSourceReadingSpot() || spot;
          closeSourceView({ restorePreview: false });
        }
        const hold = Boolean(opts.holdPreview);
        const previewY = typeof opts.previewScrollTop === "number"
          ? opts.previewScrollTop
          : previewBody?.scrollTop;
        previewing = false;
        muteInput = true;
        blockInsert.hide();
        if (hold) wrap?.classList.add("is-preparing-edit");
        syncLiteClass();
        if (hold && previewBody && typeof previewY === "number") previewBody.scrollTop = previewY;
        await bootEditor();
        vditor.setValue(markdown, true);
        applyMermaidTheme();
        if (hold && typeof previewY === "number") {
          const scroller = readingScroller(false);
          if (scroller) scroller.scrollTop = previewY;
        } else if (!hold) {
          keepReadingSpot(false, spot);
        }
        setTimeout(() => {
          muteInput = false;
          refreshMermaidDiagrams(vditorRoot).finally(() => {
            scheduleFitTables(vditorRoot);
            if (findState.open) runFind({ keepIndex: true, reveal: false });
            blockInsert.sync();
            scheduleOutlineRefresh();
            if (pendingInsert) {
              const root = readingContentRoot(false);
              const el = pendingInsert.el?.isConnected
                ? pendingInsert.el
                : locateInsertedBlock(root, pendingInsert);
              settleInsertedBlock(el, pendingInsert.viewportY);
              pendingInsert = null;
            } else if (!hold) {
              restoreReadingSpot(false, spot);
            }
          });
        }, 400);
        notifyPreview();
        return false;
      },
      onPreviewChange(cb) {
        if (typeof cb !== "function") return () => {};
        previewListeners.push(cb);
        return () => {
          const i = previewListeners.indexOf(cb);
          if (i >= 0) previewListeners.splice(i, 1);
        };
      },
      onSelection(cb) {
        return previewSelection.onSelection(cb);
      },
      clearSelection() {
        previewSelection.clear();
      },
      expandToSection() {
        previewSelection.expandToSection();
      },
      getVditor() {
        return vditor;
      },
    };

    ensureEditorChrome({
      getVditor: () => vditor,
      getVditorRoot: () => vditorRoot,
      getPreviewing: () => previewing,
      canUndoDoc: () => docUndo.length > 0,
      canRedoDoc: () => docRedo.length > 0,
      undoDoc,
      redoDoc,
      getMarkdown: () => {
        if (sourceOpen) {
          const { text } = sourceEls();
          if (text) return text.value;
        }
        if (previewing || !vditor) return markdown;
        try { return vditor.getValue(); } catch (_) { return markdown; }
      },
      applyMarkdown: (next, opts = {}) => {
        markdown = String(next ?? "");
        if (opts.live && previewing) {
          const spot = sourceOpen ? captureSourceReadingSpot() : captureReadingSpot(true);
          renderLitePreview(markdown, spot);
        }
      },
      notifyInput: () => {
        try { options.onInput?.(); } catch (_) { /* ignore */ }
      },
      enterEdit: () => api.setPreview(false),
      bootEditor,
      hydrateVditor: async () => {
        await bootEditor();
        if (!vditor) return;
        relocateVditorOutline();
        if (!previewing) return;
        let current = "";
        try { current = vditor.getValue(); } catch (_) { /* ignore */ }
        if (current === markdown) return;
        muteInput = true;
        try { vditor.setValue(markdown, true); } catch (_) { /* ignore */ }
        await new Promise((resolve) => setTimeout(resolve, 220));
        muteInput = false;
      },
    });

    syncLiteClass();
    lastEditorApi = api;
    if (options.defaultPreview === false) {
      return bootEditor().then(() => {
        options.onReady?.(api);
        return api;
      });
    }
    options.onReady?.(api);
    return Promise.resolve(api);
  }
