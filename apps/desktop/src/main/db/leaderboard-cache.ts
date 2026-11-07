import type Database from "better-sqlite3"
import { openDb } from "./index"
import type { TrendingSkill } from "./trending-cache"

/**
 * All-time leaderboard snapshot: install counts plus each skill's weekly
 * install series. Kept in a separate table from the trending scrape because
 * both payloads are large and refresh independently.
 */
export interface LeaderboardCacheRow {
  id: number
  fetched_at: string
  payload: string
}

// The weekly series only changes once a week; six hours matches the trending
// cache and keeps the Discover page responsive across restarts.
const TTL_MS = 6 * 60 * 60 * 1000

export function loadLeaderboardCache(): TrendingSkill[] | null {
  try {
    const db: Database.Database = openDb()
    const row = db
      .prepare("SELECT * FROM leaderboard_cache WHERE id = 1")
      .get() as LeaderboardCacheRow | undefined

    if (!row) return null

    const fetchedAt = new Date(row.fetched_at).getTime()
    if (Number.isNaN(fetchedAt) || Date.now() - fetchedAt >= TTL_MS) {
      return null
    }

    const parsed = JSON.parse(row.payload) as unknown
    if (!Array.isArray(parsed) || parsed.length === 0) return null
    return parsed as TrendingSkill[]
  } catch {
    return null
  }
}

export function saveLeaderboardCache(skills: TrendingSkill[]): void {
  const db: Database.Database = openDb()
  const now = new Date().toISOString()

  db.prepare(
    `INSERT OR REPLACE INTO leaderboard_cache (id, fetched_at, payload)
     VALUES (1, ?, ?)`,
  ).run(now, JSON.stringify(skills))
}
