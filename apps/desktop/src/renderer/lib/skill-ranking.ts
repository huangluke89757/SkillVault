/**
 * Pure ranking helpers for the Discover "热门排行" leaderboards.
 *
 * The public skills.sh leaderboard API returns each skill's all-time install
 * count plus a `weeklyInstalls` series (oldest → newest, one value per
 * completed week).  The last element is therefore the most recent completed
 * week — the "本周飙升" metric.
 */

export interface RankableSkill {
  id: string
  installs: number
  weeklyInstalls?: number[]
}

/**
 * Install count of the most recent completed week.
 * Missing / malformed / non-positive values collapse to 0 so a skill without
 * weekly history never outranks a real mover on the weekly board.
 */
export function latestWeekInstalls(skill: {
  weeklyInstalls?: number[]
}): number {
  const values = skill.weeklyInstalls
  if (!values || values.length === 0) return 0
  const last = values[values.length - 1]
  if (typeof last !== "number" || !Number.isFinite(last) || last <= 0) return 0
  return last
}

/** Descending all-time installs, with a stable id tie-break. */
export function rankByCumulative<T extends RankableSkill>(
  skills: readonly T[],
): T[] {
  return [...skills].sort(
    (a, b) => b.installs - a.installs || a.id.localeCompare(b.id),
  )
}

/**
 * Descending last-week installs.  Skills with no weekly installs are omitted;
 * ties fall back to all-time installs so the ordering stays deterministic.
 */
export function rankByWeeklySurge<T extends RankableSkill>(
  skills: readonly T[],
): T[] {
  return skills
    .map((skill) => ({ skill, weekly: latestWeekInstalls(skill) }))
    .filter((entry) => entry.weekly > 0)
    .sort(
      (a, b) =>
        b.weekly - a.weekly ||
        b.skill.installs - a.skill.installs ||
        a.skill.id.localeCompare(b.skill.id),
    )
    .map((entry) => entry.skill)
}
