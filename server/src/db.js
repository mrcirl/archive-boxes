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
    wall_points_json TEXT,
    wall_height_m REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    scan_id TEXT NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
    furniture_json TEXT NOT NULL DEFAULT '[]',
    custom_items_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

function ensureColumns(table, columns) {
  const existing = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name));
  for (const [col, def] of columns) {
    if (!existing.has(col)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${def}`);
    }
  }
}

// Migration guards for dev DBs created before these columns existed.
ensureColumns('scans', [
  ['preview_format', 'TEXT'],
  ['preview_stored_name', 'TEXT'],
  ['preview_error', 'TEXT'],
  ['wall_points_json', 'TEXT'],
  ['wall_height_m', 'REAL'],
]);
ensureColumns('projects', [['custom_items_json', "TEXT NOT NULL DEFAULT '[]'"]]);
