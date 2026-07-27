# RoomLayout

Upload a 3D scan of a room and use it to plan desk/office furniture layouts, in
both a full 3D view and an auto top-down 2D floor plan.

## Stack

- **`server/`** — Express + SQLite (`better-sqlite3`) API. Handles scan uploads
  (multer) and stores project/furniture layouts as JSON.
- **`client/`** — Vite + React + TypeScript, using `@react-three/fiber` /
  `three.js` to render uploaded scans and let you drag-and-drop furniture onto
  them.

## Supported scan formats

- **GLB / GLTF** and **OBJ** — fully supported, rendered directly in the
  browser in both 3D and 2D (top-down orthographic) views.
- **USDZ** (e.g. Apple RoomPlan / iPhone LiDAR exports) — accepted and stored,
  but there is no in-browser USD parser, so no live preview is rendered for
  USDZ files yet. Export your scan as GLB or OBJ (most scanning apps offer
  this alongside USDZ) for a full preview.

## Running locally

In one terminal:

```bash
cd server
npm install
npm run dev   # http://localhost:4000
```

In another:

```bash
cd client
npm install
npm run dev   # http://localhost:5173
```

The client reads the API base URL from `client/.env` (`VITE_API_BASE`,
defaults to `http://localhost:4000`).

## How it works

1. Upload a scan on the Upload page — it's stored on the server and listed on
   the dashboard.
2. Create a project from a scan to open the editor.
3. The editor renders the scan mesh in a `three.js` scene. Toggle between a
   3D orbit view and a 2D top-down floor plan (an orthographic camera looking
   straight down at the same scene — no separate wall-detection step).
4. Click a furniture item in the palette to add it, then drag it around on
   the scan to position it; use the rotate/delete controls for the selected
   item.
5. "Save layout" persists furniture positions/rotations to the project via
   the API; reloading the project restores them.

## Data model

- `scans`: uploaded file metadata (`format`, `stored_name`, `size_bytes`).
- `projects`: a named layout tied to one scan, with a `furniture` array of
  `{ id, type, x, z, rotationY }` placements.
