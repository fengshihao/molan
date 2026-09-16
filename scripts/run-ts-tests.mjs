import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

function collectTests(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      out.push(...collectTests(path));
    } else if (name.endsWith(".test.ts")) {
      out.push(path);
    }
  }
  return out;
}

const files = collectTests(join(process.cwd(), "src"));
if (!files.length) {
  console.error("未找到 src/**/*.test.ts");
  process.exit(1);
}

const result = spawnSync(process.execPath, ["--import", "tsx", "--test", ...files], {
  stdio: "inherit",
});
process.exit(result.status ?? 1);
