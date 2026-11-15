import assert from "node:assert/strict"
import test from "node:test"
import {
  buildUpdateNotesViewModel,
  compareVersions,
  extractVersionFromFileName,
  normalizeVersion,
  shouldCleanPendingUpdate,
  UP_TO_DATE_MESSAGE,
  versionsEqual,
} from "../src/shared/update-notes"

const latestNotes = {
  version: "1.3.3",
  name: "SkillVault v1.3.3",
  body: "## 最新版本更新\n- 修复自动更新",
  url: "https://github.com/huangluke89757/SkillVault/releases/tag/v1.3.3",
  publishedAt: "2026-11-15T15:34:52Z",
}

const currentNotes = {
  version: "1.3.2",
  name: "SkillVault v1.3.2",
  body: "## 当前版本更新\n- 修复 Skill 扫描",
  url: "https://github.com/huangluke89757/SkillVault/releases/tag/v1.3.2",
  publishedAt: "2026-11-15T09:40:13Z",
}

test("版本号去掉 tag 前缀后比较", () => {
  assert.equal(normalizeVersion(" v1.3.3 "), "1.3.3")
  assert.equal(normalizeVersion("V1.3.3"), "1.3.3")
  assert.equal(normalizeVersion("desktop-v1.3.3"), "1.3.3")
  assert.equal(normalizeVersion(undefined), "")
  assert.equal(versionsEqual("v1.3.3", "1.3.3"), true)
  assert.equal(versionsEqual("1.3.3", ""), false)
})

test("语义化版本比较用于判断缓存是否过期", () => {
  assert.equal(compareVersions("1.3.4", "1.3.3"), 1)
  assert.equal(compareVersions("1.3.3", "1.3.3"), 0)
  assert.equal(compareVersions("1.2.9", "1.3.0"), -1)
})

test("当前版本等于最新版本时，最新版本区块替换为 👍 提示", () => {
  const view = buildUpdateNotesViewModel({
    appVersion: "1.3.3",
    state: { status: "not-available" },
    currentNotes: { ...latestNotes },
    latestNotes: { ...latestNotes },
  })

  assert.equal(view.isUpToDate, true)
  assert.equal(view.showUpdateActions, false)
  assert.equal(view.latest.kind, "up-to-date")
  assert.equal(view.latest.message, UP_TO_DATE_MESSAGE)
  assert.equal(view.latest.version, "1.3.3")
  // 当前版本区块仍然展示该版本的更新介绍
  assert.equal(view.current.kind, "notes")
  assert.equal(view.current.version, "1.3.3")
})

test("存在新版本时同时展示当前版本与最新版本两份更新介绍", () => {
  const view = buildUpdateNotesViewModel({
    appVersion: "1.3.2",
    state: { status: "available", availableVersion: "1.3.3" },
    currentNotes: { ...currentNotes },
    latestNotes: { ...latestNotes },
  })

  assert.equal(view.isUpToDate, false)
  assert.equal(view.showUpdateActions, true)
  assert.equal(view.latest.kind, "notes")
  assert.equal(view.latest.version, "1.3.3")
  assert.equal(view.current.kind, "notes")
  assert.equal(view.current.version, "1.3.2")
  assert.equal(view.latestVersion, "1.3.3")
})

test("当前版本取不到 Release 时降级为「暂无该版本的更新说明」", () => {
  const view = buildUpdateNotesViewModel({
    appVersion: "1.3.2",
    state: { status: "available", availableVersion: "1.3.3" },
    currentNotes: null,
    latestNotes: { ...latestNotes },
  })

  assert.equal(view.current.kind, "empty")
  assert.equal(view.current.version, "1.3.2")
  assert.equal(view.current.message, "暂无该版本的更新说明")
  assert.equal(view.latest.kind, "notes")
})

test("最新版本信息获取失败且更新器已判定最新时，直接显示 👍 提示", () => {
  const view = buildUpdateNotesViewModel({
    appVersion: "1.3.3",
    state: { status: "not-available" },
    currentNotes: { ...currentNotes },
    latestNotes: null,
  })

  assert.equal(view.isUpToDate, true)
  assert.equal(view.showUpdateActions, false)
  assert.equal(view.latest.kind, "up-to-date")
  assert.equal(view.latest.message, UP_TO_DATE_MESSAGE)
  assert.equal(view.current.kind, "notes")
})

test("有可用版本但最新版本 notes 获取失败时，仍保留下载操作并提示可重试", () => {
  const view = buildUpdateNotesViewModel({
    appVersion: "1.3.2",
    state: { status: "available", availableVersion: "1.3.3" },
    currentNotes: { ...currentNotes },
    latestNotes: null,
  })

  assert.equal(view.isUpToDate, false)
  assert.equal(view.showUpdateActions, true)
  assert.equal(view.latestVersion, "1.3.3")
  assert.equal(view.latest.kind, "empty")
  assert.equal(view.latest.message, "暂时无法获取最新版本信息，请稍后点击「检查更新」重试")
})

test("从安装包文件名提取版本号", () => {
  assert.equal(extractVersionFromFileName("SkillVault-Setup-1.3.3.exe"), "1.3.3")
  assert.equal(extractVersionFromFileName("SkillVault-Setup-1.3.4-beta.1.exe"), "1.3.4-beta.1")
  assert.equal(extractVersionFromFileName("installer.exe"), "")
  assert.equal(extractVersionFromFileName(undefined), "")
})

test("当前版本已追上待装版本时，缓存应被清理", () => {
  assert.equal(shouldCleanPendingUpdate("1.3.3", "1.3.3"), true)
  assert.equal(shouldCleanPendingUpdate("1.3.4", "1.3.3"), true)
  assert.equal(shouldCleanPendingUpdate("1.3.2", "1.3.3"), false)
  assert.equal(shouldCleanPendingUpdate("1.3.3", ""), false)
})
