import type Database from "better-sqlite3"

export class FavoritesStore {
  private db: Database.Database

  constructor(db: Database.Database) {
    this.db = db
  }

  list(): string[] {
    const rows = this.db
      .prepare("SELECT skill_name FROM favorites ORDER BY created_at DESC")
      .all() as Array<{ skill_name: string }>
    return rows.map((r) => r.skill_name)
  }

  has(name: string): boolean {
    const row = this.db
      .prepare("SELECT 1 FROM favorites WHERE skill_name = ?")
      .get(name)
    return row !== undefined
  }

  toggle(name: string): boolean {
    if (this.has(name)) {
      this.db.prepare("DELETE FROM favorites WHERE skill_name = ?").run(name)
      return false
    }
    this.db
      .prepare("INSERT INTO favorites (skill_name) VALUES (?)")
      .run(name)
    return true
  }

  add(name: string): void {
    this.db
      .prepare("INSERT OR IGNORE INTO favorites (skill_name) VALUES (?)")
      .run(name)
  }

  remove(name: string): void {
    this.db.prepare("DELETE FROM favorites WHERE skill_name = ?").run(name)
  }

  count(): number {
    const row = this.db
      .prepare("SELECT COUNT(*) as c FROM favorites")
      .get() as { c: number }
    return row.c
  }
}
