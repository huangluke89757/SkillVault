declare module "bun:sqlite" {
  export class Database {
    constructor(path: string)
    query(sql: string): {
      all(...params: unknown[]): unknown[]
      get(...params: unknown[]): unknown
      run(...params: unknown[]): { changes: number }
    }
    exec(sql: string): void
    close(): void
  }
}
