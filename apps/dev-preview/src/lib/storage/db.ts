// SQLite abstraction via Tauri plugin-sql, fallback to IndexedDB/localStorage for preview
export interface DB {
  execute(sql: string, params?: unknown[]): Promise<void>
  select<T>(sql: string, params?: unknown[]): Promise<T[]>
}

class PreviewDB implements DB {
  private mem: Record<string, any[]> = {}
  async execute(sql: string, _params?: unknown[]) {
    // naive in-memory for preview — create table no-op
    if (sql.toLowerCase().includes('create table')) {
      const m = sql.match(/create table if not exists (\w+)/i)
      if (m) this.mem[m[1]] = this.mem[m[1]] || []
    }
  }
  async select<T>(sql: string, _params?: unknown[]): Promise<T[]> {
    const m = sql.match(/from (\w+)/i)
    if (m && this.mem[m[1]]) return this.mem[m[1]] as T[]
    return []
  }
}

function isTauri(): boolean { return typeof window !== 'undefined' && '__TAURI__' in window }

class TauriDB implements DB {
  async execute(sql: string, params?: unknown[]) {
    // @ts-ignore
    await window.__TAURI__.core.invoke('db_execute', { sql, params })
  }
  async select<T>(sql: string, params?: unknown[]): Promise<T[]> {
    // @ts-ignore
    return await window.__TAURI__.core.invoke('db_select', { sql, params })
  }
}

export const db: DB = isTauri() ? new TauriDB() : new PreviewDB()

export async function initDB() {
  await db.execute(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)`)
  await db.execute(`CREATE TABLE IF NOT EXISTS tasks (id TEXT PRIMARY KEY, data TEXT, status TEXT, createdAt INTEGER)`)
  await db.execute(`CREATE TABLE IF NOT EXISTS conversations (id TEXT PRIMARY KEY, title TEXT, messages TEXT, createdAt INTEGER)`)
  await db.execute(`CREATE TABLE IF NOT EXISTS memory (id TEXT PRIMARY KEY, category TEXT, key TEXT, value TEXT, updatedAt INTEGER)`)
  await db.execute(`CREATE TABLE IF NOT EXISTS workflows (id TEXT PRIMARY KEY, data TEXT, version INTEGER, updatedAt INTEGER)`)
  await db.execute(`CREATE TABLE IF NOT EXISTS permissions (capability TEXT PRIMARY KEY, granted INTEGER, scope TEXT)`)
  await db.execute(`CREATE TABLE IF NOT EXISTS connectors (id TEXT PRIMARY KEY, status TEXT, config TEXT)`)
}
