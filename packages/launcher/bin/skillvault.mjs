#!/usr/bin/env node

import { createHash } from "node:crypto";
import { createReadStream, createWriteStream } from "node:fs";
import { access, chmod, mkdir, rename, rm } from "node:fs/promises";
import { homedir, platform, arch, tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";

const VERSION = "0.1.0";
const RELEASE_BASE = `https://github.com/huangluke89757/SkillVault/releases/download/desktop-v${VERSION}`;

// sha256 of each release asset. Update these together with VERSION whenever a
// new desktop release is published, otherwise downloads fail verification.
const TARGETS = {
  "win32-x64": {
    asset: `SkillVault-Setup-${VERSION}.exe`,
    sha256: "81d2439bccefee6cc55546db45699e161244b2fad9b0c164e5c571c47fd5fc88",
  },
  "darwin-arm64": {
    asset: `SkillVault-${VERSION}-arm64.dmg`,
    sha256: "e251b8cb24689a9378b4dfbba5a4c67367ae208641b637d116ba94edd5304922",
  },
  "darwin-x64": {
    asset: `SkillVault-${VERSION}-x64.dmg`,
    sha256: "24cef2ee519f2a56072742492e65119da89031eef534c3bb5866fafa09cef0b4",
  },
  "linux-x64": {
    asset: `SkillVault-${VERSION}-x86_64.AppImage`,
    sha256: "0019717293bf9934a02d9aa4a0df5cc263e57234af72b96cdf62e05534fc9e23",
  },
};

function printHelp() {
  console.log(`SkillVault ${VERSION}

用法：
  npx skillvault-app              下载并打开当前平台安装包
  npx skillvault-app download     仅下载到当前目录
  npx skillvault-app --version    显示版本
  npx skillvault-app --help       显示帮助

选项：
  --output <目录>               指定下载目录
  --force                       重新下载安装包`);
}

function readOption(args, name) {
  const index = args.indexOf(name);
  if (index === -1) return null;
  const value = args[index + 1];
  if (!value || value.startsWith("-")) {
    throw new Error(`${name} 需要提供目录`);
  }
  return value;
}

async function fileHash(filePath) {
  const hash = createHash("sha256");
  const file = createReadStream(filePath);
  for await (const chunk of file) hash.update(chunk);
  return hash.digest("hex");
}

async function isVerified(filePath, expectedHash) {
  try {
    await access(filePath);
    return (await fileHash(filePath)) === expectedHash;
  } catch {
    return false;
  }
}

async function download(url, destination, expectedHash) {
  const partial = `${destination}.part`;
  await rm(partial, { force: true });

  const response = await fetch(url, {
    headers: { "User-Agent": `skillvault-app/${VERSION}` },
    redirect: "follow",
  });
  if (!response.ok || !response.body) {
    throw new Error(`下载失败：HTTP ${response.status}`);
  }

  const total = Number(response.headers.get("content-length")) || 0;
  const output = createWriteStream(partial);
  const hash = createHash("sha256");
  let received = 0;

  try {
    for await (const chunk of response.body) {
      const buffer = Buffer.from(chunk);
      received += buffer.length;
      hash.update(buffer);
      if (!output.write(buffer)) await once(output, "drain");

      const current = (received / 1024 / 1024).toFixed(1);
      const progress = total > 0 ? ` / ${(total / 1024 / 1024).toFixed(1)} MB` : " MB";
      process.stdout.write(`\r正在下载：${current}${progress}`);
    }
    output.end();
    await once(output, "finish");
    process.stdout.write("\n");

    if (expectedHash && hash.digest("hex") !== expectedHash) {
      throw new Error("安装包校验失败，请重新下载");
    }

    await rm(destination, { force: true });
    await rename(partial, destination);
  } catch (error) {
    output.destroy();
    await rm(partial, { force: true });
    throw error;
  }
}

function launchInstaller(filePath, currentPlatform) {
  if (currentPlatform === "win32") {
    const result = spawnSync(filePath, [], { stdio: "inherit" });
    if (result.error) throw result.error;
    return;
  }

  if (currentPlatform === "darwin") {
    const result = spawnSync("open", [filePath], { stdio: "inherit" });
    if (result.error || result.status !== 0) throw result.error ?? new Error("无法打开安装包");
    return;
  }

  const child = spawn(filePath, [], { detached: true, stdio: "ignore" });
  child.unref();
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h")) {
    printHelp();
    return;
  }
  if (args.includes("--version") || args.includes("-v")) {
    console.log(VERSION);
    return;
  }

  const command = args[0]?.startsWith("-") ? "install" : (args[0] ?? "install");
  if (!new Set(["install", "download"]).has(command)) {
    throw new Error(`未知命令：${command}`);
  }

  const currentPlatform = platform();
  const currentArch = arch();
  const target = TARGETS[`${currentPlatform}-${currentArch}`];
  if (!target) {
    throw new Error(`暂不支持当前平台：${currentPlatform}-${currentArch}`);
  }

  const requestedOutput = readOption(args, "--output");
  let outputDir;
  if (requestedOutput) {
    outputDir = resolve(requestedOutput);
  } else if (command === "download") {
    outputDir = process.cwd();
  } else if (currentPlatform === "linux") {
    outputDir = join(homedir(), "Applications");
  } else {
    outputDir = join(tmpdir(), `skillvault-${VERSION}`);
  }

  await mkdir(outputDir, { recursive: true });
  const destination = join(outputDir, currentPlatform === "linux" ? "SkillVault.AppImage" : basename(target.asset));
  const force = args.includes("--force");

  if (force || !(await isVerified(destination, target.sha256))) {
    await download(`${RELEASE_BASE}/${target.asset}`, destination, target.sha256);
  } else {
    console.log("已找到校验通过的安装包，跳过下载。");
  }

  console.log(`安装包：${destination}`);
  if (command === "download") return;

  if (currentPlatform === "linux") await chmod(destination, 0o755);
  console.log(currentPlatform === "linux" ? "正在启动 SkillVault…" : "正在打开安装程序…");
  launchInstaller(destination, currentPlatform);
}

main().catch((error) => {
  console.error(`SkillVault 安装失败：${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
