import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const cli = fileURLToPath(new URL("../bin/skillvault.mjs", import.meta.url));

test("输出当前版本", () => {
  const output = execFileSync(process.execPath, [cli, "--version"], { encoding: "utf8" });
  assert.equal(output.trim(), "0.1.0");
});

test("输出帮助信息", () => {
  const output = execFileSync(process.execPath, [cli, "--help"], { encoding: "utf8" });
  assert.match(output, /npx skillvault-app/);
  assert.match(output, /--output/);
});
