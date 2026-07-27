import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { db } from '../db.js';
import { convertUsdzToGlb, UnsupportedUsdzError } from '../usdz/convert.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const FORMAT_BY_EXT = {
  '.glb': 'glb',
  '.gltf': 'gltf',
  '.obj': 'obj',
  '.usdz': 'usdz',
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 }, // 200MB, scans can be large
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!FORMAT_BY_EXT[ext]) {
      cb(new Error(`Unsupported file type "${ext}". Supported: .glb, .gltf, .obj, .usdz`));
      return;
    }
    cb(null, true);
  },
});

export const scansRouter = Router();

scansRouter.get('/', (_req, res) => {
  const scans = db.prepare('SELECT * FROM scans ORDER BY created_at DESC').all();
  res.json(scans);
});

scansRouter.get('/:id', (req, res) => {
  const scan = db.prepare('SELECT * FROM scans WHERE id = ?').get(req.params.id);
  if (!scan) return res.status(404).json({ error: 'Scan not found' });
  res.json(scan);
});

scansRouter.post('/upload', (req, res) => {
  upload.single('scan')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const ext = path.extname(req.file.originalname).toLowerCase();
    const format = FORMAT_BY_EXT[ext];
    const id = crypto.randomUUID();

    db.prepare(
      `INSERT INTO scans (id, original_name, stored_name, format, size_bytes) VALUES (?, ?, ?, ?, ?)`
    ).run(id, req.file.originalname, req.file.filename, format, req.file.size);

    if (format === 'usdz') {
      // RoomPlan-style USDZ (ASCII .usda inside the zip) can be converted to
      // GLB for in-browser preview. Binary "crate" USDZ can't — leave the
      // preview fields null and record why, so the UI can say so.
      try {
        const glb = await convertUsdzToGlb(path.join(uploadsDir, req.file.filename));
        const previewName = `${id}-preview.glb`;
        fs.writeFileSync(path.join(uploadsDir, previewName), glb);
        db.prepare(
          `UPDATE scans SET preview_format = 'glb', preview_stored_name = ? WHERE id = ?`
        ).run(previewName, id);
      } catch (convertErr) {
        const message =
          convertErr instanceof UnsupportedUsdzError
            ? convertErr.message
            : 'Could not convert this USDZ for preview.';
        console.error('USDZ conversion failed for', req.file.originalname, convertErr);
        db.prepare(`UPDATE scans SET preview_error = ? WHERE id = ?`).run(message, id);
      }
    }

    const scan = db.prepare('SELECT * FROM scans WHERE id = ?').get(id);
    res.status(201).json(scan);
  });
});

scansRouter.delete('/:id', (req, res) => {
  const scan = db.prepare('SELECT * FROM scans WHERE id = ?').get(req.params.id);
  if (!scan) return res.status(404).json({ error: 'Scan not found' });

  const projectCount = db
    .prepare('SELECT COUNT(*) AS n FROM projects WHERE scan_id = ?')
    .get(req.params.id).n;
  if (projectCount > 0) {
    return res.status(409).json({ error: 'Scan is used by one or more projects' });
  }

  db.prepare('DELETE FROM scans WHERE id = ?').run(req.params.id);
  fs.rm(path.join(uploadsDir, scan.stored_name), { force: true }, () => {});
  if (scan.preview_stored_name) {
    fs.rm(path.join(uploadsDir, scan.preview_stored_name), { force: true }, () => {});
  }
  res.status(204).send();
});
