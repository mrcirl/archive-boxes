import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { scansRouter } from './routes/scans.js';
import { projectsRouter } from './routes/projects.js';
import { assetsRouter } from './routes/assets.js';
import { imageSearchRouter } from './routes/imageSearch.js';
import './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/scans', scansRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/assets', assetsRouter);
app.use('/api/image-search', imageSearchRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`RoomLayout server listening on http://localhost:${PORT}`);
});
