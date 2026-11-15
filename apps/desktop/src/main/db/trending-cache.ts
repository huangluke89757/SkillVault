import type Database from "better-sqlite3"
import { openDb } from "./index"

/**
 * A single skill entry as scraped from the skills.sh trending page.
 * `isOfficial` is only present in trending data, never in search results.
 */
export interface TrendingSkill {
  id: string
  skillId: string
  name: string
  installs: number
  source: string
  isOfficial?: boolean
  /** All-time leaderboard only: installs per week, oldest → newest. */
  weeklyInstalls?: number[]
}

/** Single-row cache table holding the most recent trending payload. */
interface TrendingCacheRow {
  id: number
  fetched_at: string
  payload: string
}

// Trending data changes slowly; refresh at most every six hours.
const TTL_MS = 6 * 60 * 60 * 1000

/**
 * Load the cached trending skills if the cache is still fresh.
 * Returns null when the cache is missing, stale, or unreadable.
 */
export function loadTrendingCache(): TrendingSkill[] | null {
  try {
    const db: Database.Database = openDb()
    const row = db
      .prepare("SELECT * FROM trending_cache WHERE id = 1")
      .get() as TrendingCacheRow | undefined

    if (!row) return null

    const fetchedAt = new Date(row.fetched_at).getTime()
    if (Number.isNaN(fetchedAt) || Date.now() - fetchedAt >= TTL_MS) {
      return null
    }

    return JSON.parse(row.payload) as TrendingSkill[]
  } catch {
    return null
  }
}

/**
 * Upsert the single trending cache row with a fresh payload and timestamp.
 */
export function saveTrendingCache(skills: TrendingSkill[]): void {
  const db: Database.Database = openDb()
  const now = new Date().toISOString()

  db.prepare(
    `INSERT OR REPLACE INTO trending_cache (id, fetched_at, payload)
     VALUES (1, ?, ?)`,
  ).run(now, JSON.stringify(skills))
}
