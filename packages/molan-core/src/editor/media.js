  /* --- media: 阅读预览里的音视频链接 --- */
  // Vditor 3.10.9 用 /^.+.(mp3|wav|flac)$/ 判断音频，点号未转义。
  // pdf-to-mp3、https://github.com/x/pdf-to-mp3 都会被换成 <audio>。
  const AUDIO_LINK_RE = /\.(mp3|wav|flac)$/i;
  const VIDEO_LINK_RE = /\.(mp4|m4v|ogg|ogv|webm)$/i;

  function mediaLinkPath(url) {
    let raw = String(url || "").trim();
    if (!raw) return "";
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^https?:/i.test(raw)) return "";
    const cut = raw.search(/[?#]/);
    if (cut >= 0) raw = raw.slice(0, cut);
    try { raw = decodeURIComponent(raw); } catch (_) { /* 保留原样 */ }
    return raw;
  }

  function mediaLinkKind(url) {
    const path = mediaLinkPath(url);
    if (!path) return "";
    if (VIDEO_LINK_RE.test(path)) return "video";
    if (AUDIO_LINK_RE.test(path)) return "audio";
    return "";
  }

  function restoreFalseMedia(root) {
    if (!root?.querySelectorAll) return;
    for (const el of [...root.querySelectorAll("audio[src], video[src]")]) {
      const src = el.getAttribute("src") || "";
      const kind = el.tagName === "VIDEO" ? "video" : "audio";
      if (mediaLinkKind(src) === kind) continue;
      const link = document.createElement("a");
      link.setAttribute("href", src);
      link.textContent = src;
      el.replaceWith(link);
    }
  }

  function renderLinkMedia(root) {
    if (!root?.querySelectorAll) return;
    for (const link of [...root.querySelectorAll("a[href]")]) {
      if (link.closest("pre, code")) continue;
      const href = link.getAttribute("href") || "";
      const kind = mediaLinkKind(href);
      if (kind !== "audio" && kind !== "video") continue;
      const el = document.createElement(kind);
      el.setAttribute("controls", "controls");
      el.setAttribute("src", href);
      link.replaceWith(el);
    }
  }
