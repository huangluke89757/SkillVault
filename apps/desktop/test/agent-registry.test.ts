import assert from "node:assert/strict"
import os from "node:os"
import path from "node:path"
import test from "node:test"
import {
  agentRegistry,
  getAgentGlobalSkillDirectories,
  isGitHubCopilotInstalled,
  PROJECT_PROBES,
} from "../src/main/agent-registry"

const home = os.homedir()
const configHome = process.env.XDG_CONFIG_HOME || path.join(home, ".config")

test("使用 Agent 官方全局目录，并保留旧版 SkillVault 目录的扫描兼容", () => {
  assert.equal(
    agentRegistry.opencode.globalSkillsDir,
    path.join(process.env.OPENCODE_CONFIG_DIR || path.join(configHome, "opencode"), "skills"),
  )
  assert.equal(agentRegistry.windsurf.globalSkillsDir, path.join(home, ".codeium", "windsurf", "skills"))
  assert.equal(
    agentRegistry["github-copilot"].globalSkillsDir,
    path.join(process.env.COPILOT_HOME || path.join(home, ".copilot"), "skills"),
  )
  assert.equal(agentRegistry.goose.globalSkillsDir, path.join(configHome, "goose", "skills"))
  assert.equal(agentRegistry["kilo-code"].globalSkillsDir, path.join(home, ".kilo", "skills"))
  assert.equal(agentRegistry["roo-code"].globalSkillsDir, path.join(home, ".roo", "skills"))
  assert.equal(agentRegistry.zed.globalSkillsDir, path.join(home, ".agents", "skills"))
  assert.ok(getAgentGlobalSkillDirectories(agentRegistry.opencode).includes(path.join(home, ".opencode", "skills")))
  assert.ok(getAgentGlobalSkillDirectories(agentRegistry.windsurf).includes(path.join(home, ".windsurf", "skills")))
})

test("项目级扫描覆盖 Kilo 与 Roo 的原生目录", () => {
  assert.ok(PROJECT_PROBES.some((probe) => probe.subpath === ".kilo/skills" && probe.agentName === "kilo-code"))
  assert.ok(PROJECT_PROBES.some((probe) => probe.subpath === ".roo/skills" && probe.agentName === "roo-code"))
})

test("仅存在 Copilot IDE 数据目录时不误判为 GitHub Copilot CLI", async () => {
  const checkedCommands: string[] = []
  const installed = await isGitHubCopilotInstalled(async (commandName) => {
    checkedCommands.push(commandName)
    return false
  })

  assert.equal(installed, false)
  assert.deepEqual(checkedCommands, ["copilot"])
})

test("可执行 copilot 命令存在时识别 GitHub Copilot CLI", async () => {
  const installed = await isGitHubCopilotInstalled(async () => true)
  assert.equal(installed, true)
})
