/**
 * SQLite Database Manager for LLM Usage Tracker
 * Uses sql.js (pure JavaScript SQLite) for persistent caching with incremental updates
 */

import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs'
import type { SessionStats, Provider } from './parser'

// Import sql.js dynamically
type SqlJsDatabase = any

// Database location
const DB_DIR = path.join(os.homedir(), '.llm-usage-tracker')
const DB_PATH = path.join(DB_DIR, 'cache.db')

export interface FileRecord {
  path: string
  provider: Provider
  mtime: number
  size: number
}

export class DatabaseManager {
  private db: SqlJsDatabase | null = null
  private initialized = false
  private initPromise: Promise<void> | null = null

  constructor() {
    // Initialize asynchronously
    this.initPromise = this.init()
  }

  /**
   * Initialize sql.js and load/create database
   */
  private async init(): Promise<void> {
    if (this.initialized) return

    try {
      // Ensure directory exists
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true })
      }

      // Dynamic import of sql.js with WASM configuration
      const initSqlJs = require('sql.js')
      
      // Get the WASM file path
      const wasmPath = path.join(
        path.dirname(require.resolve('sql.js')),
        'sql-wasm.wasm'
      )

      // Initialize sql.js with WASM file location
      const SQL = await initSqlJs({
        locateFile: (file: string) => {
          if (file === 'sql-wasm.wasm') {
            return wasmPath
          }
          return file
        }
      })

      // Load existing database or create new one
      if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH)
        this.db = new SQL.Database(fileBuffer)
      } else {
        this.db = new SQL.Database()
      }

      this.initSchema()
      this.initialized = true
      console.log('[DB] Database initialized at', DB_PATH)
    } catch (e) {
      console.error('[DB] Failed to initialize database:', e)
      throw e
    }
  }

  /**
   * Ensure database is ready before operations
   */
  async ensureReady(): Promise<void> {
    if (this.initPromise) {
      await this.initPromise
    }
  }

  /**
   * Initialize database schema
   */
  private initSchema(): void {
    if (!this.db) return

    this.db.run(`
      CREATE TABLE IF NOT EXISTS files (
        path TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        mtime INTEGER NOT NULL,
        size INTEGER NOT NULL,
        last_parsed INTEGER NOT NULL
      )
    `)

    this.db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        path TEXT NOT NULL UNIQUE,
        provider TEXT NOT NULL,
        session_id TEXT NOT NULL,
        project TEXT,
        messages INTEGER DEFAULT 0,
        user_messages INTEGER DEFAULT 0,
        assistant_messages INTEGER DEFAULT 0,
        tool_uses INTEGER DEFAULT 0,
        input_tokens INTEGER DEFAULT 0,
        output_tokens INTEGER DEFAULT 0,
        cache_read_tokens INTEGER DEFAULT 0,
        cache_creation_tokens INTEGER DEFAULT 0,
        cost_usd REAL DEFAULT 0,
        model TEXT,
        first_message TEXT,
        last_message TEXT,
        duration INTEGER DEFAULT 0
      )
    `)

    // Create indexes
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_provider ON sessions(provider)`)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project)`)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_sessions_last_message ON sessions(last_message)`)
    this.db.run(`CREATE INDEX IF NOT EXISTS idx_files_provider ON files(provider)`)

    // Settings table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `)
  }

  /**
   * Save database to disk
   */
  private saveToFile(): void {
    if (!this.db) return

    try {
      const data = this.db.export()
      const buffer = Buffer.from(data)
      fs.writeFileSync(DB_PATH, buffer)
    } catch (e) {
      console.error('[DB] Failed to save database:', e)
    }
  }

  /**
   * Get file record to check if it needs re-parsing
   */
  getFileRecord(filePath: string): FileRecord | null {
    if (!this.db) return null

    const stmt = this.db.prepare('SELECT path, provider, mtime, size FROM files WHERE path = ?')
    stmt.bind([filePath])
    
    if (stmt.step()) {
      const row = stmt.getAsObject() as any
      stmt.free()
      return {
        path: row.path,
        provider: row.provider,
        mtime: row.mtime,
        size: row.size,
      }
    }
    stmt.free()
    return null
  }

  /**
   * Check if a file needs to be re-parsed
   */
  needsUpdate(filePath: string, currentMtime: number, currentSize: number): boolean {
    const record = this.getFileRecord(filePath)
    if (!record) return true
    return record.mtime !== currentMtime || record.size !== currentSize
  }

  /**
   * Get all tracked file paths for a provider
   */
  getTrackedFiles(provider: Provider): string[] {
    if (!this.db) return []

    const stmt = this.db.prepare('SELECT path FROM files WHERE provider = ?')
    stmt.bind([provider])
    
    const paths: string[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject() as { path: string }
      paths.push(row.path)
    }
    stmt.free()
    return paths
  }

  /**
   * Save or update a session record
   */
  upsertSession(session: SessionStats): void {
    if (!this.db) return

    // Check if exists
    const checkStmt = this.db.prepare('SELECT id FROM sessions WHERE path = ?')
    checkStmt.bind([session.path])
    const exists = checkStmt.step()
    checkStmt.free()

    if (exists) {
      this.db.run(`
        UPDATE sessions SET
          provider = ?,
          session_id = ?,
          project = ?,
          messages = ?,
          user_messages = ?,
          assistant_messages = ?,
          tool_uses = ?,
          input_tokens = ?,
          output_tokens = ?,
          cache_read_tokens = ?,
          cache_creation_tokens = ?,
          cost_usd = ?,
          model = ?,
          first_message = ?,
          last_message = ?,
          duration = ?
        WHERE path = ?
      `, [
        session.provider,
        session.sessionId,
        session.project || null,
        session.messages,
        session.userMessages,
        session.assistantMessages,
        session.toolUses || 0,
        session.inputTokens,
        session.outputTokens,
        session.cacheReadTokens || 0,
        session.cacheCreationTokens || 0,
        session.costUsd,
        session.model,
        session.firstMessage,
        session.lastMessage,
        session.duration,
        session.path,
      ])
    } else {
      this.db.run(`
        INSERT INTO sessions (
          path, provider, session_id, project, messages, user_messages,
          assistant_messages, tool_uses, input_tokens, output_tokens,
          cache_read_tokens, cache_creation_tokens, cost_usd, model,
          first_message, last_message, duration
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        session.path,
        session.provider,
        session.sessionId,
        session.project || null,
        session.messages,
        session.userMessages,
        session.assistantMessages,
        session.toolUses || 0,
        session.inputTokens,
        session.outputTokens,
        session.cacheReadTokens || 0,
        session.cacheCreationTokens || 0,
        session.costUsd,
        session.model,
        session.firstMessage,
        session.lastMessage,
        session.duration,
      ])
    }

    this.saveToFile()
  }

  /**
   * Update file tracking record
   */
  upsertFileRecord(filePath: string, provider: Provider, mtime: number, size: number): void {
    if (!this.db) return

    const checkStmt = this.db.prepare('SELECT path FROM files WHERE path = ?')
    checkStmt.bind([filePath])
    const exists = checkStmt.step()
    checkStmt.free()

    if (exists) {
      this.db.run(
        'UPDATE files SET mtime = ?, size = ?, last_parsed = ? WHERE path = ?',
        [mtime, size, Date.now(), filePath]
      )
    } else {
      this.db.run(
        'INSERT INTO files (path, provider, mtime, size, last_parsed) VALUES (?, ?, ?, ?, ?)',
        [filePath, provider, mtime, size, Date.now()]
      )
    }

    this.saveToFile()
  }

  /**
   * Remove records for files that no longer exist
   */
  cleanupDeletedFiles(provider: Provider, existingFiles: Set<string>): number {
    const trackedFiles = this.getTrackedFiles(provider)
    let deletedCount = 0

    for (const filePath of trackedFiles) {
      if (!existingFiles.has(filePath)) {
        if (this.db) {
          this.db.run('DELETE FROM files WHERE path = ?', [filePath])
          this.db.run('DELETE FROM sessions WHERE path = ?', [filePath])
          deletedCount++
        }
      }
    }

    if (deletedCount > 0) {
      this.saveToFile()
    }

    return deletedCount
  }

  /**
   * Get all sessions for a provider from database
   */
  getSessions(provider: Provider): SessionStats[] {
    if (!this.db) return []

    const stmt = this.db.prepare(`
      SELECT * FROM sessions WHERE provider = ?
      ORDER BY last_message DESC
    `)
    stmt.bind([provider])

    const sessions: SessionStats[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject() as any
      sessions.push({
        path: row.path,
        provider: row.provider as Provider,
        sessionId: row.session_id,
        project: row.project,
        messages: row.messages,
        userMessages: row.user_messages,
        assistantMessages: row.assistant_messages,
        toolUses: row.tool_uses,
        inputTokens: row.input_tokens,
        outputTokens: row.output_tokens,
        cacheReadTokens: row.cache_read_tokens,
        cacheCreationTokens: row.cache_creation_tokens,
        costUsd: row.cost_usd,
        model: row.model,
        firstMessage: row.first_message,
        lastMessage: row.last_message,
        duration: row.duration,
      })
    }
    stmt.free()

    return sessions
  }

  /**
   * Get all sessions from database (all providers)
   */
  getAllSessions(): SessionStats[] {
    if (!this.db) return []

    const stmt = this.db.prepare(`
      SELECT * FROM sessions
      ORDER BY last_message DESC
    `)

    const sessions: SessionStats[] = []
    while (stmt.step()) {
      const row = stmt.getAsObject() as any
      sessions.push({
        path: row.path,
        provider: row.provider as Provider,
        sessionId: row.session_id,
        project: row.project,
        messages: row.messages,
        userMessages: row.user_messages,
        assistantMessages: row.assistant_messages,
        toolUses: row.tool_uses,
        inputTokens: row.input_tokens,
        outputTokens: row.output_tokens,
        cacheReadTokens: row.cache_read_tokens,
        cacheCreationTokens: row.cache_creation_tokens,
        costUsd: row.cost_usd,
        model: row.model,
        firstMessage: row.first_message,
        lastMessage: row.last_message,
        duration: row.duration,
      })
    }
    stmt.free()

    return sessions
  }

  /**
   * Get database statistics
   */
  getStats(): { sessionCount: number; fileCount: number; dbSize: number } {
    if (!this.db) {
      return { sessionCount: 0, fileCount: 0, dbSize: 0 }
    }

    let sessionCount = 0
    let fileCount = 0

    const sessionStmt = this.db.prepare('SELECT COUNT(*) as count FROM sessions')
    if (sessionStmt.step()) {
      sessionCount = (sessionStmt.getAsObject() as { count: number }).count
    }
    sessionStmt.free()

    const fileStmt = this.db.prepare('SELECT COUNT(*) as count FROM files')
    if (fileStmt.step()) {
      fileCount = (fileStmt.getAsObject() as { count: number }).count
    }
    fileStmt.free()

    let dbSize = 0
    try {
      if (fs.existsSync(DB_PATH)) {
        const stats = fs.statSync(DB_PATH)
        dbSize = stats.size
      }
    } catch {
      // Ignore
    }

    return { sessionCount, fileCount, dbSize }
  }

  /**
   * Clear all data (for debugging/reset)
   */
  clearAll(): void {
    if (!this.db) return
    this.db.run('DELETE FROM sessions')
    this.db.run('DELETE FROM files')
    this.saveToFile()
  }

  /**
   * Save a setting value
   */
  saveSetting(key: string, value: string): void {
    if (!this.db) return

    const now = Date.now()
    const checkStmt = this.db.prepare('SELECT key FROM settings WHERE key = ?')
    checkStmt.bind([key])
    const exists = checkStmt.step()
    checkStmt.free()

    if (exists) {
      this.db.run(
        'UPDATE settings SET value = ?, updated_at = ? WHERE key = ?',
        [value, now, key]
      )
    } else {
      this.db.run(
        'INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)',
        [key, value, now]
      )
    }

    this.saveToFile()
  }

  /**
   * Get a setting value
   */
  getSetting(key: string, defaultValue: string = ''): string {
    if (!this.db) return defaultValue

    const stmt = this.db.prepare('SELECT value FROM settings WHERE key = ?')
    stmt.bind([key])

    if (stmt.step()) {
      const row = stmt.getAsObject() as { value: string }
      stmt.free()
      return row.value
    }
    stmt.free()
    return defaultValue
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.saveToFile()
      this.db.close()
      this.db = null
    }
  }
}

// Singleton instance
let dbInstance: DatabaseManager | null = null

export async function getDatabase(): Promise<DatabaseManager> {
  if (!dbInstance) {
    dbInstance = new DatabaseManager()
    await dbInstance.ensureReady()
  }
  return dbInstance
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}
