// packages/tui/src/db/local-skills.ts
/**
 * Pure async scanner for local canonical skills under ~/.agents/skills.
 * Returns the minimal shape needed by the push orchestrator.
 * Does NOT depend on React, the store, or the DB layer.
 */
import fs from "node:fs/promises"
import path from "node:path"
import os from "node:os"

const home = os.homedir()
export const CANONICAL_SKILLS_DIR = path.join(home, ".agents", "skills")

export interface LocalCanonicalSkill {
  folderName: string
  canonicalPath: string
  name: string
}

/**
 * List all skill directories under ~/.agents/skills that contain a SKILL.md.
 * Uses the folder name as both folderName and name (SKILL.md name field is
 * parsed by the push orchestrator's hash step, which reads the file again).
 */
export async function listLocalCanonicalSkills(): Promise<LocalCanonicalSkill[]> {
  const results: LocalCanonicalSkill[] = []
  let names: string[]
  try {
    names = await fs.readdir(CANONICAL_SKILLS_DIR)
  } catch {
    return []
  }

  for (const name of names) {
    const skillDir = path.join(CANONICAL_SKILLS_DIR, name)
    let stat: Awaited<ReturnType<typeof fs.stat>>
    try {
      stat = await fs.stat(skillDir)
    } catch {
      continue // broken symlink or unreadable
    }
    if (!stat.isDirectory()) continue

    let canonicalPath: string
    try {
      canonicalPath = await fs.realpath(skillDir)
    } catch {
      continue
    }

    const skillMdPath = path.join(canonicalPath, "SKILL.md")
    try {
      await fs.access(skillMdPath)
    } catch {
      continue // no SKILL.md
    }
    results.push({
      folderName: name,
      canonicalPath,
      name,
    })
  }
  return results
}
