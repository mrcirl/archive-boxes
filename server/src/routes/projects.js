import { Router } from 'express';
import crypto from 'node:crypto';
import { db } from '../db.js';

export const projectsRouter = Router();

function serialize(row) {
  return { ...row, furniture: JSON.parse(row.furniture_json) };
}

projectsRouter.get('/', (_req, res) => {
  const rows = db.prepare('SELECT * FROM projects ORDER BY updated_at DESC').all();
  res.json(rows.map(serialize));
});

projectsRouter.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Project not found' });
  res.json(serialize(row));
});

projectsRouter.post('/', (req, res) => {
  const { name, scanId } = req.body;
  if (!name || !scanId) return res.status(400).json({ error: 'name and scanId are required' });

  const scan = db.prepare('SELECT id FROM scans WHERE id = ?').get(scanId);
  if (!scan) return res.status(400).json({ error: 'scanId does not reference an existing scan' });

  const id = crypto.randomUUID();
  db.prepare(
    'INSERT INTO projects (id, name, scan_id, furniture_json) VALUES (?, ?, ?, ?)'
  ).run(id, name, scanId, '[]');

  res.status(201).json(serialize(db.prepare('SELECT * FROM projects WHERE id = ?').get(id)));
});

projectsRouter.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Project not found' });

  const { name, furniture } = req.body;
  if (furniture !== undefined && !Array.isArray(furniture)) {
    return res.status(400).json({ error: 'furniture must be an array' });
  }

  db.prepare(
    `UPDATE projects SET name = ?, furniture_json = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(
    name ?? existing.name,
    furniture !== undefined ? JSON.stringify(furniture) : existing.furniture_json,
    req.params.id
  );

  res.json(serialize(db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id)));
});

projectsRouter.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Project not found' });
  db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  res.status(204).send();
});
