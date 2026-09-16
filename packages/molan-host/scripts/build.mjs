import * as esbuild from "esbuild";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src");

async function bundleBridge(entry, outfile) {
  await esbuild.build({
    entryPoints: [join(src, entry)],
    outfile: join(root, "dist", outfile),
    bundle: true,
    format: "iife",
    platform: "browser",
    target: ["es2020"],
    sourcemap: true,
    logLevel: "info",
  });
}

await bundleBridge("iframe-bridge.ts", "iframe-bridge.js");
await bundleBridge("vscode-bridge.ts", "vscode-bridge.js");
console.log("bundled molan-host bridges");
