import assert from "node:assert/strict"
import test from "node:test"
import { assertRemoteSkillDeletePath } from "../src/main/db/remote-delete-safety"

test("远程删除只允许技能根目录的直接子目录", () => {
  assert.equal(
    assertRemoteSkillDeletePath("~/.agents/skills", "~/.agents/skills/demo"),
    "~/.agents/skills/demo",
  )
  assert.throws(
    () => assertRemoteSkillDeletePath("~/.agents/skills", "~/.agents/skills"),
    /拒绝/,
  )
  assert.throws(
    () => assertRemoteSkillDeletePath("~/.agents/skills", "~/.agents/skills/a/b"),
    /直接子目录/,
  )
  assert.throws(
    () => assertRemoteSkillDeletePath("~/.agents/skills", "/etc"),
    /范围之外/,
  )
})

test("远程技能根目录不能配置成根目录或用户主目录", () => {
  for (const base of ["", "/", "~", ".", "./"]) {
    assert.throws(() => assertRemoteSkillDeletePath(base, `${base}/demo`), /根目录/)
  }
})
