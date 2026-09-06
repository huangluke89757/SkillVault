import type { Database } from "bun:sqlite"
import type { AgentType, SourceType } from "../../../cli/src/types.js"

export interface CachedSkill {
  canonicalPath: string
  folderName: string
  name: string
  description: string
  agents: AgentType[]
  agentShortCodes: string[]
  scope: "global" | "project" | "custom"
  source: string | null
  sourceType: SourceType | null
  fileModTime: string
  scannedAt: string
}

interface CachedSkillRow {
  canonical_path: string
  folder_name: string
  name: string
  description: string
  agents: string
  agent_short_codes: string
  scope: string
  source: string | null
  source_type: string | null
  file_mod_time: string
  scanned_at: string
}

function rowToSkill(row: CachedSkillRow): CachedSkill {
  return {
    canonicalPath: row.canonical_path,
    folderName: row.folder_name,
    name: row.name,
    description: row.description,
    agents: JSON.parse(row.agents) as AgentType[],
    agentShortCodes: JSON.parse(row.agent_short_codes) as string[],
    scope: row.scope as CachedSkill["scope"],
    source: row.source,
    sourceType: row.source_type as SourceType | null,
    fileModTime: row.file_mod_time,
    scannedAt: row.scanned_at,
  }
}

export function loadCachedSkills(db: Database): CachedSkill[] {
  const rows = db
    .query("SELECT * FROM cached_skills ORDER BY name ASC")
    .all() as CachedSkillRow[]
  return rows.map(rowToSkill)
}

export function saveCachedSkills(db: Database, skills: CachedSkill[]): void {
  const insert = db.query(
    `INSERT OR REPLACE INTO cached_skills
       (canonical_path, folder_name, name, description, agents, agent_short_codes, scope, source, source_type, file_mod_time, scanned_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  )

  db.exec("BEGIN TRANSACTION")
  try {
    db.exec("DELETE FROM cached_skills")
    for (const skill of skills) {
      insert.run(
        skill.canonicalPath,
        skill.folderName,
        skill.name,
        skill.description,
        JSON.stringify(skill.agents),
        JSON.stringify(skill.agentShortCodes),
        skill.scope,
        skill.source,
        skill.sourceType,
        skill.fileModTime,
        skill.scannedAt,
      )
    }
    db.exec("COMMIT")
  } catch (err) {
    db.exec("ROLLBACK")
    throw err
  }
}

export function clearSkillsCache(db: Database): void {
  db.exec("DELETE FROM cached_skills")
}
