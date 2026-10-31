export function isApplePlatform(): boolean {
  if (typeof navigator === "undefined") return false;
  const platform = navigator.platform || "";
  if (/Mac|iPhone|iPad|iPod/i.test(platform)) return true;
  try {
    const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
    if (nav.userAgentData?.platform === "macOS") return true;
  } catch {
    /* ignore */
  }
  return /Mac OS X|Macintosh/i.test(navigator.userAgent || "");
}

export function toolbarShortcut(label: string, combo: string): string {
  const mod = isApplePlatform() ? "⌘" : "Ctrl";
  return `${label} (${mod}+${combo})`;
}
