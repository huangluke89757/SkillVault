import assert from "node:assert/strict"
import test from "node:test"
import {
  latestWeekInstalls,
  rankByCumulative,
  rankByWeeklySurge,
} from "../src/renderer/lib/skill-ranking"

test("本周飙升取最近一个完整周的安装量", () => {
  assert.equal(
    latestWeekInstalls({ weeklyInstalls: [10, 20, 30] }),
    30,
  )
  assert.equal(latestWeekInstalls({ weeklyInstalls: [] }), 0)
  assert.equal(latestWeekInstalls({}), 0)
  assert.equal(latestWeekInstalls({ weeklyInstalls: [10, Number.NaN] }), 0)
  assert.equal(latestWeekInstalls({ weeklyInstalls: [10, -5] }), 0)
})

test("累计高星按累计安装量倒序，并保持稳定顺序", () => {
  const skills = [
    { id: "a/one", installs: 10 },
    { id: "b/two", installs: 30 },
    { id: "c/three", installs: 20 },
    { id: "a/tie", installs: 30 },
  ]

  assert.deepEqual(
    rankByCumulative(skills).map((skill) => skill.id),
    ["a/tie", "b/two", "c/three", "a/one"],
  )
})

test("本周飙升按最近一周安装量倒序，并忽略没有周数据的技能", () => {
  const skills = [
    { id: "a/slow", installs: 900, weeklyInstalls: [1, 2, 3] },
    { id: "b/hot", installs: 100, weeklyInstalls: [5, 6, 70] },
    { id: "c/no-weekly", installs: 500 },
    { id: "d/zero", installs: 800, weeklyInstalls: [9, 9, 0] },
    { id: "e/tie", installs: 300, weeklyInstalls: [1, 2, 70] },
  ]

  assert.deepEqual(
    rankByWeeklySurge(skills).map((skill) => skill.id),
    ["e/tie", "b/hot", "a/slow"],
  )
})
