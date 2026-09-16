import { createRequire } from "node:module";
import { cpSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ensureMolanPackagesBuilt } from "../../../scripts/ensure-molan-build.mjs";

ensureMolanPackagesBuilt();

const require = createRequire(import.meta.url);
const extRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(extRoot, "..", "..");
const coreDist = join(repoRoot, "packages", "molan-core", "dist");
const hostDist = join(repoRoot, "packages", "molan-host", "dist");
const viewer = join(repoRoot, "apps", "studio");
const media = join(extRoot, "media");

mkdirSync(media, { recursive: true });

for (const file of ["molan.css", "molan-editor.js"]) {
  cpSync(join(coreDist, file), join(media, file));
}

cpSync(join(hostDist, "vscode-bridge.js"), join(media, "vscode-bridge.js"));

const vditorPkg = dirname(require.resolve("vditor/package.json"));
const srcDist = join(vditorPkg, "dist");

function vendorVditor(destDist) {
  rmSync(destDist, { recursive: true, force: true });

  function copyRel(rel) {
    const src = join(srcDist, rel);
    const dest = join(destDist, rel);
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(src, dest, { recursive: true });
  }

  for (const rel of [
    "method.min.js",
    "index.min.js",
    "index.css",
    "js/lute",
    "js/mermaid",
    "js/katex/katex.min.js",
    "js/katex/katex.min.css",
    "js/katex/mhchem.min.js",
    "js/highlight.js/highlight.min.js",
    "js/highlight.js/third-languages.js",
    "js/highlight.js/styles/kimbie-dark.min.css",
    "js/i18n",
    "js/icons/ant.js",
    "css/content-theme/light.css",
    "images/img-loading.svg",
  ]) {
    copyRel(rel);
  }

  const fontsSrc = join(srcDist, "js/katex/fonts");
  const fontsDest = join(destDist, "js/katex/fonts");
  mkdirSync(fontsDest, { recursive: true });
  for (const name of readdirSync(fontsSrc)) {
    if (name.endsWith(".woff2")) {
      cpSync(join(fontsSrc, name), join(fontsDest, name));
    }
  }
}

vendorVditor(join(media, "vditor", "dist"));
vendorVditor(join(viewer, "vendor", "vditor", "dist"));

console.log("synced molan-core + molan-host → media/ and apps/studio/vendor/");
