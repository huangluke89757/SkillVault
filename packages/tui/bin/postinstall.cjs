#!/usr/bin/env node
// Ensures the correct platform binary is installed.
// npm may skip optionalDependencies for global installs (npm v11+/Node v24+).
const { execSync } = require("child_process");
const os = require("os");
const path = require("path");
const fs = require("fs");

const platformMap = {
  darwin: { arm64: "tui-darwin-arm64", x64: "tui-darwin-x64" },
  linux: { arm64: "tui-linux-arm64", x64: "tui-linux-x64" },
  win32: { x64: "tui-win32-x64" },
};

const pkg = platformMap[os.platform()]?.[os.arch()];
if (!pkg) process.exit(0);

// Check if already available as a sibling (optionalDeps worked)
const siblingPath = path.join(__dirname, "..", "..", `@skillvault/${pkg}`);
if (fs.existsSync(siblingPath)) process.exit(0);

// Also check nested node_modules
try {
  require.resolve(`@skillvault/${pkg}/package.json`);
  process.exit(0);
} catch {}

// Not found — install it explicitly
const version = require("../package.json").version;
const fullPkg = `@skillvault/${pkg}@${version}`;
try {
  execSync(`npm install -g ${fullPkg} --no-save`, {
    stdio: "inherit",
    timeout: 30000,
  });
} catch {
  console.warn(`Could not install ${fullPkg}, falling back to @latest (versions may differ)`);
  try {
    execSync(`npm install -g @skillvault/${pkg}@latest --no-save`, {
      stdio: "inherit",
      timeout: 30000,
    });
  } catch {
    console.warn(`Warning: could not install @skillvault/${pkg}. Run manually: npm install -g @skillvault/${pkg}`);
  }
}
