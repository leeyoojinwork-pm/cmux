/**
 * D1 히스토리 모듈
 *
 * 모든 봇 응답을 Cloudflare D1(SQLite)에 저장.
 * 테이블: history (command, user_id, user_name, request, response, created_at)
 */

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  exec(query: string): Promise<unknown>;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  run(): Promise<unknown>;
  all(): Promise<{ results: unknown[] }>;
  first(): Promise<unknown>;
}

/** DB 테이블 초기화 (최초 1회) */
export async function initHistoryTable(db: D1Database): Promise<void> {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS history (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      command    TEXT    NOT NULL,
      user_id    TEXT,
      user_name  TEXT,
      request    TEXT    NOT NULL,
      response   TEXT    NOT NULL,
      created_at TEXT    DEFAULT (datetime('now'))
    )
  `);
}

/** 응답 히스토리 저장 */
export async function saveHistory(
  db: D1Database,
  command: string,
  userId: string,
  userName: string,
  request: string,
  response: string
): Promise<void> {
  await db
    .prepare('INSERT INTO history (command, user_id, user_name, request, response) VALUES (?, ?, ?, ?, ?)')
    .bind(command, userId, userName, request, response.slice(0, 4000))
    .run();
}

/** 최근 N건 조회 — /log 커맨드용 */
export async function getRecentHistory(
  db: D1Database,
  limit = 10
): Promise<Array<{ command: string; user_name: string; request: string; created_at: string }>> {
  const result = await db
    .prepare('SELECT command, user_name, request, created_at FROM history ORDER BY id DESC LIMIT ?')
    .bind(limit)
    .all();
  return result.results as Array<{ command: string; user_name: string; request: string; created_at: string }>;
}
