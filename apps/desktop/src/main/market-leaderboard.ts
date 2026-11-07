import type { TrendingSkill } from "./db/trending-cache"

/**
 * skills.sh renders its All Time leaderboard as a single page with an embedded
 * 600-entry payload. Each entry carries the all-time install count plus a
 * `weeklyInstalls` series (oldest → newest, one value per completed week), so
 * one page load is enough to power both the cumulative and weekly boards.
 *
 * (The paged JSON endpoint is only used as a fallback: fetching ~50 pages
 * trips the site's anonymous rate limit.)
 */
export const SKILLS_SH_ALL_TIME_PAGE_URL = "https://www.skills.sh/"
export const SKILLS_SH_ALL_TIME_API =
  "https://www.skills.sh/api/skills/all-time"

const USER_AGENT =
  "SkillVault (+https://github.com/huangluke89757/SkillVault)"

export interface LeaderboardFetchOptions {
  /** Injectable logger so the main process can route warnings to its console. */
  log?: (message: string, error?: unknown) => void
}

/**
 * Validate one API / page-payload entry. Malformed entries are dropped rather
 * than crashing the whole leaderboard; the weekly series is optional so
 * cumulative installs still work for entries without history.
 */
export function normalizeLeaderboardSkill(
  raw: unknown,
): TrendingSkill | null {
  if (!raw || typeof raw !== "object") return null
  const value = raw as Record<string, unknown>
  const source = typeof value.source === "string" ? value.source.trim() : ""
  const skillId =
    typeof value.skillId === "string" ? value.skillId.trim() : ""
  if (!source || !skillId) return null

  const installs =
    typeof value.installs === "number" &&
    Number.isFinite(value.installs) &&
    value.installs >= 0
      ? value.installs
      : 0
  const name =
    typeof value.name === "string" && value.name.trim()
      ? value.name.trim()
      : skillId
  const weeklyInstalls = Array.isArray(value.weeklyInstalls)
    ? value.weeklyInstalls.filter(
        (entry): entry is number =>
          typeof entry === "number" && Number.isFinite(entry) && entry >= 0,
      )
    : undefined

  const skill: TrendingSkill = {
    id: `${source}/${skillId}`,
    skillId,
    name,
    installs,
    source,
  }
  if (value.isOfficial === true) skill.isOfficial = true
  if (weeklyInstalls && weeklyInstalls.length > 0) {
    skill.weeklyInstalls = weeklyInstalls
  }
  return skill
}

/**
 * Walk the text starting at `marker` and return the first complete JSON array.
 * Tracks quoted strings so brackets inside skill names do not end the scan.
 */
function extractJsonArray(text: string, marker: string): string | null {
  const markerIndex = text.indexOf(marker)
  if (markerIndex < 0) return null
  const start = text.indexOf("[", markerIndex)
  if (start < 0) return null

  let depth = 0
  let inString = false
  let escaped = false

  for (let index = start; index < text.length; index++) {
    const char = text[index]
    if (inString) {
      if (escaped) {
        escaped = false
      } else if (char === "\\") {
        escaped = true
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (char === '"') {
      inString = true
    } else if (char === "[") {
      depth++
    } else if (char === "]") {
      depth--
      if (depth === 0) return text.slice(start, index + 1)
    }
  }
  return null
}

/**
 * Parse the leaderboard payload embedded in the All Time page. The JSON lives
 * inside a JS string literal, so quotes arrive escaped as \" and are unescaped
 * before decoding. Returns an empty array when the page shape changes.
 */
export function parseLeaderboardHtml(html: string): TrendingSkill[] {
  const unescaped = html.replace(/\\"/g, '"')
  const arrayText = extractJsonArray(unescaped, '"initialSkills":')
  if (!arrayText) return []

  let parsed: unknown
  try {
    parsed = JSON.parse(arrayText)
  } catch {
    return []
  }
  if (!Array.isArray(parsed)) return []

  return parsed
    .map(normalizeLeaderboardSkill)
    .filter((skill): skill is TrendingSkill => skill !== null)
}

async function fetchLeaderboardFromApi(
  fetchImpl: typeof fetch,
): Promise<TrendingSkill[]> {
  const res = await fetchImpl(`${SKILLS_SH_ALL_TIME_API}/1`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  })
  if (!res.ok) {
    throw new Error(`skills.sh leaderboard failed (HTTP ${res.status})`)
  }
  const data = (await res.json()) as { skills?: unknown }
  if (!Array.isArray(data.skills)) return []
  return data.skills
    .map(normalizeLeaderboardSkill)
    .filter((skill): skill is TrendingSkill => skill !== null)
}

/**
 * Fetch the leaderboard. The All Time page is the primary source; if its
 * payload cannot be parsed, fall back to the first JSON page so a cosmetic
 * markup change does not take the ranking down entirely.
 */
export async function fetchLeaderboard(
  fetchImpl: typeof fetch,
  options: LeaderboardFetchOptions = {},
): Promise<TrendingSkill[]> {
  const log = options.log ?? (() => {})

  const res = await fetchImpl(SKILLS_SH_ALL_TIME_PAGE_URL, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html",
    },
  })
  if (!res.ok) {
    throw new Error(`skills.sh leaderboard page failed (HTTP ${res.status})`)
  }

  const skills = parseLeaderboardHtml(await res.text())
  if (skills.length > 0) return skills

  log("[leaderboard] page payload missing, falling back to the JSON API")
  const fallback = await fetchLeaderboardFromApi(fetchImpl)
  if (fallback.length === 0) {
    throw new Error("skills.sh leaderboard returned no skills")
  }
  return fallback
}
