import assert from "node:assert/strict"
import test from "node:test"
import {
  fetchLeaderboard,
  normalizeLeaderboardSkill,
  parseLeaderboardHtml,
} from "../src/main/market-leaderboard"

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function htmlResponse(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "text/html" },
  })
}

const sampleSkills = [
  {
    source: "vercel-labs/skills",
    skillId: "find-skills",
    name: "find-skills",
    installs: 4244603,
    weeklyInstalls: [101317, 105144, 115285],
    isOfficial: true,
  },
  {
    source: "obra/superpowers",
    skillId: "brainstorming",
    name: "brainstorming[beta]",
    installs: 900000,
    weeklyInstalls: [10, 20, 30],
  },
]

test("解析 All Time 页内嵌的 initialSkills 载荷", () => {
  const escaped = JSON.stringify(sampleSkills).replace(/"/g, '\\"')
  const html = `<script>self.__next_f.push([1,"56:[\\"$\\",\\"$L64\\",null,{\\"initialSkills\\":${escaped},\\"totalSkills\\":9976}]"])</script>`

  const skills = parseLeaderboardHtml(html)
  assert.deepEqual(
    skills.map((skill) => skill.id),
    ["vercel-labs/skills/find-skills", "obra/superpowers/brainstorming"],
  )
  assert.deepEqual(skills[0].weeklyInstalls, [101317, 105144, 115285])
  assert.equal(skills[0].isOfficial, true)
  assert.equal(skills[1].name, "brainstorming[beta]")
})

test("页面载荷缺失或损坏时返回空数组", () => {
  assert.deepEqual(parseLeaderboardHtml("<html>no payload</html>"), [])
  assert.deepEqual(
    parseLeaderboardHtml('{"initialSkills":[{"source":"a/b"}]}'),
    [],
  )
})

test("优先用页面载荷，避免逐页请求 JSON 接口", async () => {
  const urls: string[] = []
  const escaped = JSON.stringify(sampleSkills).replace(/"/g, '\\"')
  const html = `{"initialSkills":${escaped}}`
  const fakeFetch = (async (input: RequestInfo | URL) => {
    urls.push(String(input))
    return htmlResponse(html)
  }) as typeof fetch

  const skills = await fetchLeaderboard(fakeFetch)
  assert.equal(skills.length, 2)
  assert.deepEqual(urls, ["https://www.skills.sh/"])
})

test("页面载荷缺失时回退到 JSON 接口第一页", async () => {
  const urls: string[] = []
  const fakeFetch = (async (input: RequestInfo | URL) => {
    const url = String(input)
    urls.push(url)
    if (url.includes("/api/")) {
      return jsonResponse({ total: 1, hasMore: true, skills: [sampleSkills[0]] })
    }
    return htmlResponse("<html>markup changed</html>")
  }) as typeof fetch

  const skills = await fetchLeaderboard(fakeFetch, { log: () => {} })
  assert.deepEqual(
    skills.map((skill) => skill.id),
    ["vercel-labs/skills/find-skills"],
  )
  assert.equal(urls.length, 2)
  assert.match(urls[1], /\/api\/skills\/all-time\/1$/)
})

test("页面与接口都拿不到数据时拒绝，避免缓存空榜单", async () => {
  const fakeFetch = (async (input: RequestInfo | URL) => {
    if (String(input).includes("/api/")) {
      return jsonResponse({ skills: [] })
    }
    return htmlResponse("<html>no payload</html>")
  }) as typeof fetch

  await assert.rejects(
    () => fetchLeaderboard(fakeFetch, { log: () => {} }),
    /no skills/,
  )
})

test("规范化时丢弃缺少 source / skillId 的条目", () => {
  assert.equal(normalizeLeaderboardSkill(null), null)
  assert.equal(normalizeLeaderboardSkill({ source: "a/b" }), null)
  assert.deepEqual(
    normalizeLeaderboardSkill({
      source: "a/b",
      skillId: "demo",
      name: "",
      installs: -1,
      weeklyInstalls: [1, "bad", 3],
    }),
    {
      id: "a/b/demo",
      skillId: "demo",
      name: "demo",
      installs: 0,
      source: "a/b",
      weeklyInstalls: [1, 3],
    },
  )
})
