  /* --- lightbox: 流程图灯箱 --- */
  function initLightbox() {
    const lightbox = document.getElementById("lightbox");
    const lightboxStage = document.getElementById("lightboxStage");
    const lightboxCanvas = document.getElementById("lightboxCanvas");
    const lightboxClose = document.getElementById("lightboxClose");
    const lightboxZoomIn = document.getElementById("lightboxZoomIn");
    const lightboxZoomOut = document.getElementById("lightboxZoomOut");
    const lightboxEdit = document.getElementById("lightboxEdit");
    const lightboxReset = document.getElementById("lightboxReset");
    const lightboxCopyImage = document.getElementById("lightboxCopyImage");
    if (!lightbox || !lightboxStage || !lightboxCanvas) {
      return {
        openFromSvg() { toast(t("diagramNotReady")); },
        close() {},
        isOpen() { return false; },
        setOnEdit(fn) { lightboxOnEdit = fn; },
        copySvgAsPng,
      };
    }

    let lightboxUserScale = 1;
    let lightboxFitW = 1;
    let lightboxFitH = 1;
    let lightboxPanX = 0;
    let lightboxPanY = 0;
    let lightboxDragging = false;
    let lightboxDragOrigin = null;
    let lightboxOriginShell = null;

    if (lightboxEdit) {
      lightboxEdit.title = t("mermaidEditorTitle");
      lightboxEdit.setAttribute("aria-label", t("mermaidEditorTitle"));
    }

    function closeLightbox() {
      lightbox.classList.remove("open", "is-preparing");
      lightbox.setAttribute("aria-hidden", "true");
      lightboxCanvas.innerHTML = "";
      lightboxUserScale = 1;
      lightboxFitW = 1;
      lightboxFitH = 1;
      lightboxPanX = 0;
      lightboxPanY = 0;
      lightboxDragging = false;
      lightboxDragOrigin = null;
      lightboxOriginShell = null;
      lightboxStage.classList.remove("is-dragging");
      resetSvgCanvas(lightboxCanvas);
    }

    function applyLightboxView() {
      const svg = lightboxCanvas.querySelector("svg");
      const stage = lightboxStage.getBoundingClientRect();
      const width = Math.max(1, lightboxFitW * lightboxUserScale);
      const height = Math.max(1, lightboxFitH * lightboxUserScale);
      if (svg) setSvgDisplaySize(svg, width, height);
      placeSvgCanvas(lightboxCanvas, stage, width, height, lightboxPanX, lightboxPanY);
    }

    function prepareLightboxSvg(clone) {
      clone.removeAttribute("style");
      const natural = svgNaturalSize(clone);
      ensureSvgViewBox(clone, natural);
      storeSvgNaturalSize(clone, natural);
    }

    function fitLightboxView() {
      const svg = lightboxCanvas.querySelector("svg");
      lightboxUserScale = 1;
      lightboxPanX = 0;
      lightboxPanY = 0;
      if (!svg) {
        lightboxFitW = 1;
        lightboxFitH = 1;
        applyLightboxView();
        return;
      }
      const stage = lightboxStage.getBoundingClientRect();
      const display = fitSvgToBox(svg, stage.width, stage.height);
      lightboxFitW = display.width;
      lightboxFitH = display.height;
      applyLightboxView();
    }

    function resetLightboxView() {
      fitLightboxView();
    }

    function openLightboxFromSvg(svg) {
      if (!svg) {
        toast(t("diagramNotReady"));
        return;
      }
      lightboxOriginShell = findMermaidPreviewShell(svg)
        || svg.closest?.(".molan-mermaid-shell, .vditor-ir__preview, pre, .language-mermaid")
        || null;
      lightboxCanvas.innerHTML = "";
      const clone = svg.cloneNode(true);
      prepareLightboxSvg(clone);
      uniquifySvgIds(clone);
      lightboxCanvas.appendChild(clone);
      lightbox.classList.add("open", "is-preparing");
      lightbox.setAttribute("aria-hidden", "false");
      void lightboxStage.offsetHeight;
      vectorizeSvgForeignObjects(clone);
      fitLightboxView();
      lightbox.classList.remove("is-preparing");
    }

    if (!lightboxBound) {
      lightboxBound = true;
      lightboxClose?.addEventListener("click", closeLightbox);
      lightbox.addEventListener("click", (e) => {
        if (e.target === lightbox) closeLightbox();
      });
      lightboxZoomIn?.addEventListener("click", () => {
        lightboxUserScale = Math.min(lightboxUserScale + 0.25, 5);
        applyLightboxView();
      });
      lightboxZoomOut?.addEventListener("click", () => {
        lightboxUserScale = Math.max(lightboxUserScale - 0.25, 0.35);
        applyLightboxView();
      });
      lightboxEdit?.addEventListener("click", () => {
        const shell = lightboxOriginShell;
        closeLightbox();
        if (typeof lightboxOnEdit === "function") {
          lightboxOnEdit(shell);
        }
      });
      lightboxReset?.addEventListener("click", resetLightboxView);
      lightboxCopyImage?.addEventListener("click", () => {
        copySvgAsPng(lightboxCanvas.querySelector("svg"));
      });

      lightboxStage.addEventListener("pointerdown", (e) => {
        if (e.button !== 0) return;
        lightboxDragging = true;
        lightboxDragOrigin = {
          x: e.clientX,
          y: e.clientY,
          panX: lightboxPanX,
          panY: lightboxPanY,
        };
        lightboxStage.classList.add("is-dragging");
        lightboxStage.setPointerCapture?.(e.pointerId);
      });
      lightboxStage.addEventListener("pointermove", (e) => {
        if (!lightboxDragging || !lightboxDragOrigin) return;
        lightboxPanX = lightboxDragOrigin.panX + (e.clientX - lightboxDragOrigin.x);
        lightboxPanY = lightboxDragOrigin.panY + (e.clientY - lightboxDragOrigin.y);
        applyLightboxView();
      });
      const endLightboxDrag = (e) => {
        if (!lightboxDragging) return;
        lightboxDragging = false;
        lightboxDragOrigin = null;
        lightboxStage.classList.remove("is-dragging");
        try { lightboxStage.releasePointerCapture?.(e.pointerId); } catch (_) { /* ignore */ }
      };
      lightboxStage.addEventListener("pointerup", endLightboxDrag);
      lightboxStage.addEventListener("pointercancel", endLightboxDrag);
      lightboxStage.addEventListener("wheel", (e) => {
        if (!lightbox.classList.contains("open")) return;
        e.preventDefault();
        const delta = e.deltaY > 0 ? -0.12 : 0.12;
        const next = Math.min(5, Math.max(0.35, lightboxUserScale + delta));
        const rect = lightboxStage.getBoundingClientRect();
        const cx = e.clientX - rect.left - rect.width / 2;
        const cy = e.clientY - rect.top - rect.height / 2;
        const ratio = next / lightboxUserScale;
        lightboxPanX = cx - (cx - lightboxPanX) * ratio;
        lightboxPanY = cy - (cy - lightboxPanY) * ratio;
        lightboxUserScale = next;
        applyLightboxView();
      }, { passive: false });

      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && lightbox.classList.contains("open")) {
          e.preventDefault();
          closeLightbox();
        }
      });
    }

    return {
      openFromSvg: openLightboxFromSvg,
      close: closeLightbox,
      isOpen: () => lightbox.classList.contains("open"),
      setOnEdit(fn) { lightboxOnEdit = fn; },
      copySvgAsPng,
    };
  }
