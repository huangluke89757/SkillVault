#!/usr/bin/env node
import { execFileSync, execSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";

const platform = os.platform();
const arch = os.arch();

const platformMap = {
  darwin: { arm64: "tui-darwin-arm64", x64: "tui-darwin-x64" },
  linux: { arm64: "tui-linux-arm64", x64: "tui-linux-x64" },
  win32: { x64: "tui-win32-x64" },
};

const pkg = platformMap[platform]?.[arch];
if (!pkg) {
  console.error(`Unsupported platform: ${platform}-${arch}`);
  process.exit(1);
}

const binName = platform === "win32" ? "skillvault-tui.exe" : "skillvault-tui";
const require = createRequire(import.meta.url);
const thisDir = path.dirname(fileURLToPath(import.meta.url));

function getNpmGlobalRoot() {
  try {
    return execFileSync("npm", ["root", "-g"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 10000,
    }).trim();
  } catch {
    return null;
  }
}

function findBinary({ includeGlobal = false } = {}) {
  const candidates = [
    // Nested node_modules (local installs)
    () => require.resolve(`@skillvault/${pkg}/${binName}`),
    // Sibling in global node_modules (npm install -g)
    () => path.join(thisDir, "..", "..", `@skillvault/${pkg}`, binName),
  ];

  if (includeGlobal) {
    candidates.push(() => {
      const globalRoot = getNpmGlobalRoot();
      if (!globalRoot) throw new Error("npm global root not found");
      return path.join(globalRoot, `@skillvault/${pkg}`, binName);
    });
  }

  for (const resolve of candidates) {
    try {
      const p = resolve();
      fs.accessSync(p, fs.constants.X_OK);
      return p;
    } catch {
      continue;
    }
  }
  return null;
}

let binPath = findBinary();

// Auto-install the platform binary if missing (npm v11+ skips optionalDeps for global installs)
if (!binPath) {
  const version = require("../package.json").version;
  const fullPkg = `@skillvault/${pkg}@${version}`;
  console.error(`Installing platform binary (${fullPkg})...`);
  try {
    execSync(`npm install -g ${fullPkg} --no-save`, { stdio: "inherit", timeout: 30000 });
    binPath = findBinary({ includeGlobal: true });
  } catch {
    // Fallback to latest if exact version is not published for this platform
    console.warn(`Could not install ${fullPkg}, falling back to @latest (versions may differ)`);
    try {
      execSync(`npm install -g @skillvault/${pkg}@latest --no-save`, { stdio: "inherit", timeout: 30000 });
      binPath = findBinary({ includeGlobal: true });
    } catch {
      binPath = findBinary({ includeGlobal: true });
    }
  }
}

if (!binPath) {
  console.error(`Platform binary not found. Run manually: npm install -g @skillvault/${pkg}`);
  process.exit(1);
}

execFileSync(binPath, process.argv.slice(2), { stdio: "inherit" });
