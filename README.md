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
- **USDZ** (e.g. Apple RoomPlan / iPhone LiDAR exports) — converted to GLB on
  upload (`server/src/usdz`) when the USDZ is built from plain-text USD
  (`.usda`), which is what RoomPlan actually produces. The converter extracts
  `Mesh` prims (points/normals/face indices/local transform) and flat
  `diffuseColor` materials from every `.usda` entry in the archive, applies
  each mesh's transform, and exports the result as a GLB via three.js's
  `GLTFExporter`, so it's previewed through the same GLTFLoader path as native
  GLB uploads. Binary "crate" USD (`.usdc`) has no available parser here and
  isn't supported — those files are still stored and attached to the project,
  just without a live preview (`scan.preview_error` explains why). Export as
  GLB or OBJ instead if you hit that.

## Running locally

One-time setup, from the repo root:

```bash
npm install     # root tooling (concurrently)
npm run setup   # installs server/ and client/ dependencies
```

Then, every time:

```bash
npm start
```

That launches the API (http://localhost:4000) and the app
(http://localhost:5173) together and opens the app in your browser.
Stop both with a single Ctrl+C.

You can still run the halves separately (`npm run dev` inside `server/` or
`client/`) if you prefer. The client reads the API base URL from
`client/.env` (`VITE_API_BASE`, defaults to `http://localhost:4000`).

## How it works

1. Upload a scan on the Upload page — it's stored on the server and listed on
   the dashboard.
2. Create a project from a scan to open the editor.
3. The editor renders the scan mesh in a `three.js` scene. Toggle between a
   3D orbit view and a 2D top-down floor plan (an orthographic camera looking
   straight down at the same scene — no separate wall-detection step).
4. Click a furniture item in the palette to add it, then drag it around on
   the scan to position it; use the rotate/delete controls for the selected
   item. A newly added item is auto-selected, opening a properties panel
   where you can set its real width/depth/height (per placed item — two
   desks from the same catalog entry can differ) and its structure: solid,
   hollow with an open top (box/bin), or hollow with an open front
   (rack/bookcase). Hollow items render as actual shells with a visibly
   darker cavity, and the opening rotates with the item. "🔓 Lock to floor"
   in the toolbar locks the selected item in place — dragging, rotating, and
   deleting are all blocked (in both the UI and the store's own action
   guards) until you unlock it again; a locked item's selection ring turns
   amber instead of blue as a reminder. "📏 Dimensions" toggles a W×D×H
   label floating over every placed item at once (not just the selected
   one), in both 3D and 2D — handy for eyeballing a whole layout's sizes
   without clicking through each item's properties panel. "📐 Room size" is
   a separate toggle for the scanned room's own overall size: a label in
   both views, plus measured edges with tick marks along two sides in the
   2D floor plan. Real scans are rarely simple rectangles (rotated,
   irregular footprints are the norm — see the attic example above), so
   this is always labeled as the axis-aligned bounding box, not the exact
   footprint or individual wall lengths; getting real per-wall measurements
   would need actual wall-segment detection, which is a separate, bigger
   feature.
5. "Save layout" persists furniture positions/rotations to the project via
   the API; reloading the project restores them.

## Custom items

Beyond the built-in catalog (desk, chair, sofa, …), "+ New item" in the
palette lets you define your own, scoped to that project:

- **Name + real dimensions** (width/depth/height, in cm or inches) — this is
  what actually drives space planning, so it's required.
- **A reference photo** (your own upload, and/or a best-effort search of the
  Wikimedia Commons API — no API key needed, and its content is under clear
  free licenses, unlike hotlinking arbitrary web images; results are a visual
  reference only, not a verified product match). With a photo and no model,
  the item renders as a thin footprint pad at its correct size plus a
  camera-facing photo card in the 3D view — the pad alone (no card) in the 2D
  floor plan, since a camera-facing card there would just look like a flat
  top-down patch and wouldn't convey the footprint.
- **A 3D model** (GLB/GLTF/OBJ) — takes priority over the photo/box, and is
  non-uniformly scaled per-axis to fit exactly the width/height/depth you
  entered (space-planning accuracy over preserving the model's native
  proportions).

Uploaded photos/models go through `POST /api/assets/upload` and are served
from `/uploads` like scans.

## Data model

- `scans`: uploaded file metadata (`format`, `stored_name`, `size_bytes`), plus
  optional `preview_format`/`preview_stored_name` (the converted GLB, for
  USDZ) and `preview_error` (why conversion was skipped, if it was).
- `projects`: a named layout tied to one scan, with a `furniture` array of
  `{ id, type, x, z, rotationY }` placements and a `customItems` array of
  `{ id, name, widthM, depthM, heightM, color, photoUrl, modelUrl, modelFormat }`.
  A furniture instance's `type` is either a built-in catalog key (`"desk"`,
  `"chair"`, …) or `"custom:<customItem.id>"`.
