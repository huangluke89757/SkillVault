import type { Database } from "bun:sqlite"

export class FavoritesStore {
  private db: Database

  constructor(db: Database) {
    this.db = db
  }

  list(): string[] {
    const rows = this.db
      .query("SELECT skill_name FROM favorites ORDER BY created_at DESC")
      .all() as Array<{ skill_name: string }>
    return rows.map((r) => r.skill_name)
  }

  has(name: string): boolean {
    const row = this.db
      .query("SELECT 1 FROM favorites WHERE skill_name = ?")
      .get(name)
    return row !== null
  }

  toggle(name: string): boolean {
    if (this.has(name)) {
      this.db.query("DELETE FROM favorites WHERE skill_name = ?").run(name)
      return false
    }
    this.db.query("INSERT INTO favorites (skill_name) VALUES (?)").run(name)
    return true
  }

  count(): number {
    const row = this.db
      .query("SELECT COUNT(*) as c FROM favorites")
      .get() as { c: number }
    return row.c
  }
}
