/**
 * 墨览 PWA：注册 Service Worker，并提供「安装到桌面」按钮。
 */
(() => {
  const btn = document.getElementById("installPwaBtn");
  const t = (key, vars) => (window.MolanI18n ? window.MolanI18n.t(key, vars) : key);
  const toast = (msg) => {
    if (window.MolanEditor && typeof window.MolanEditor.toast === "function") {
      window.MolanEditor.toast(msg);
      return;
    }
    const el = document.getElementById("toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("is-on");
    window.setTimeout(() => el.classList.remove("is-on"), 2400);
  };

  function isStandalone() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: window-controls-overlay)").matches ||
      window.navigator.standalone === true
    );
  }

  function isIosSafariHint() {
    const ua = navigator.userAgent || "";
    const iOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    return iOS;
  }

  let deferredPrompt = null;

  function syncInstallButton() {
    if (!btn) return;
    if (isStandalone()) {
      btn.hidden = true;
      return;
    }
    btn.hidden = false;
  }

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./sw.js").catch((err) => {
        console.warn("molan PWA: service worker register failed", err);
      });
    });
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;
    syncInstallButton();
  });

  window.addEventListener("appinstalled", () => {
    deferredPrompt = null;
    if (btn) btn.hidden = true;
    toast(t("installPwaDone"));
  });

  btn?.addEventListener("click", async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      try {
        await deferredPrompt.userChoice;
      } catch (_) { /* ignore */ }
      deferredPrompt = null;
      return;
    }
    if (isIosSafariHint()) {
      toast(t("installPwaIosHint"));
      return;
    }
    toast(t("installPwaUnavailable"));
  });

  syncInstallButton();
})();
