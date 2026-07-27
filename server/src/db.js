import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, '..', 'data');
fs.mkdirSync(dataDir, { recursive: true });

export const db = new Database(path.join(dataDir, 'roomlayout.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS scans (
    id TEXT PRIMARY KEY,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL,
    format TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    preview_format TEXT,
    preview_stored_name TEXT,
    preview_error TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    scan_id TEXT NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
    furniture_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Migration guard for dev DBs created before preview columns existed.
const scanColumns = new Set(db.prepare('PRAGMA table_info(scans)').all().map((c) => c.name));
for (const [col, def] of [
  ['preview_format', 'TEXT'],
  ['preview_stored_name', 'TEXT'],
  ['preview_error', 'TEXT'],
]) {
  if (!scanColumns.has(col)) {
    db.exec(`ALTER TABLE scans ADD COLUMN ${col} ${def}`);
  }
}
