import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const KIND_BY_EXT = {
  '.png': 'image',
  '.jpg': 'image',
  '.jpeg': 'image',
  '.webp': 'image',
  '.glb': 'model',
  '.gltf': 'model',
  '.obj': 'model',
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `asset-${crypto.randomUUID()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB — reference photos/models, not full scans
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!KIND_BY_EXT[ext]) {
      cb(new Error(`Unsupported file type "${ext}". Supported: .png, .jpg, .jpeg, .webp, .glb, .gltf, .obj`));
      return;
    }
    cb(null, true);
  },
});

export const assetsRouter = Router();

assetsRouter.post('/upload', (req, res) => {
  upload.single('asset')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const ext = path.extname(req.file.originalname).toLowerCase();
    res.status(201).json({
      kind: KIND_BY_EXT[ext],
      format: ext.slice(1),
      url: `/uploads/${req.file.filename}`,
    });
  });
});
