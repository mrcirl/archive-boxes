// Minimal parser for the ASCII (.usda) flavor of USD, as commonly produced by
// Apple RoomPlan/ModelIO USDZ exports. This does NOT implement the USD
// grammar in general — it extracts `def Mesh` / `def Material` prim blocks
// via brace matching, then regexes the small set of attributes RoomPlan
// actually emits (points, normals, face indices, a single local transform,
// and a flat diffuse color). Binary "crate" (.usdc) files are not handled.

function findPrimBlocks(text, type) {
  const blocks = [];
  const re = new RegExp(`def\\s+${type}\\s+"([^"]+)"`, 'g');
  let m;
  while ((m = re.exec(text))) {
    const name = m[1];
    let i = re.lastIndex;
    while (i < text.length && /\s/.test(text[i])) i++;
    if (text[i] === '(') {
      let depth = 0;
      do {
        if (text[i] === '(') depth++;
        else if (text[i] === ')') depth--;
        i++;
      } while (depth > 0 && i < text.length);
      while (i < text.length && /\s/.test(text[i])) i++;
    }
    if (text[i] !== '{') continue;
    const start = i;
    let depth = 0;
    do {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') depth--;
      i++;
    } while (depth > 0 && i < text.length);
    blocks.push({ name, body: text.slice(start + 1, i - 1) });
    re.lastIndex = i;
  }
  return blocks;
}

function parseNumberList(str) {
  return str
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map(Number);
}

function parseTupleList(str) {
  const tuples = [];
  const re = /\(([^()]*)\)/g;
  let m;
  while ((m = re.exec(str))) {
    tuples.push(parseNumberList(m[1]));
  }
  return tuples;
}

function parseTransform(body) {
  const m = body.match(/matrix4d\s+xformOp:transform\s*=\s*([^\n]+)/);
  if (!m) return null;
  const rows = parseTupleList(m[1]);
  if (rows.length !== 4 || rows.some((r) => r.length !== 4)) return null;
  return rows; // row-major, row-vector convention (translation in rows[3])
}

function applyTransform(rows, [x, y, z]) {
  const [r0, r1, r2, r3] = rows;
  return [
    x * r0[0] + y * r1[0] + z * r2[0] + r3[0],
    x * r0[1] + y * r1[1] + z * r2[1] + r3[1],
    x * r0[2] + y * r1[2] + z * r2[2] + r3[2],
  ];
}

function applyRotation(rows, [x, y, z]) {
  const [r0, r1, r2] = rows;
  const v = [
    x * r0[0] + y * r1[0] + z * r2[0],
    x * r0[1] + y * r1[1] + z * r2[1],
    x * r0[2] + y * r1[2] + z * r2[2],
  ];
  const len = Math.hypot(...v) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}

function parseMeshBlock(body) {
  const fvcMatch = body.match(/faceVertexCounts\s*=\s*\[([^\]]*)\]/);
  const fviMatch = body.match(/faceVertexIndices\s*=\s*\[([^\]]*)\]/);
  const ptsMatch = body.match(/point3f\[\]\s*points\s*=\s*\[([^\]]*)\]/);
  if (!fvcMatch || !fviMatch || !ptsMatch) return null;

  const faceVertexCounts = parseNumberList(fvcMatch[1]);
  const faceVertexIndices = parseNumberList(fviMatch[1]);
  const points = parseTupleList(ptsMatch[1]);

  const nrmMatch = body.match(/normal3f\[\]\s*normals\s*=\s*\[([^\]]*)\]/);
  const normals = nrmMatch ? parseTupleList(nrmMatch[1]) : null;

  const bindingMatch = body.match(/rel\s+material:binding\s*=\s*<([^>]+)>/);
  const materialName = bindingMatch ? bindingMatch[1].split('/').filter(Boolean).pop() : null;

  const transform = parseTransform(body);

  return { faceVertexCounts, faceVertexIndices, points, normals, materialName, transform };
}

function parseMaterialBlock(body) {
  const m = body.match(/color3f\s+inputs:diffuseColor\s*=\s*\(([^)]+)\)/);
  if (!m) return null;
  const [r, g, b] = parseNumberList(m[1]);
  return { r, g, b };
}

/**
 * Extract renderable triangle meshes from one .usda file's text.
 * Returns [{ name, positions: [[x,y,z],...], normals: [[x,y,z],...] | null, color: {r,g,b} | null }]
 * Positions/normals are already expanded per-face-vertex (parallel to faceVertexIndices)
 * and transformed into the file's local space. Degenerate (zero-area / collapsed) faces
 * are dropped.
 */
export function parseUsdaMeshes(text) {
  const materials = new Map();
  for (const { name, body } of findPrimBlocks(text, 'Material')) {
    const color = parseMaterialBlock(body);
    if (color) materials.set(name, color);
  }

  const meshes = [];
  for (const { name, body } of findPrimBlocks(text, 'Mesh')) {
    const parsed = parseMeshBlock(body);
    if (!parsed) continue;
    const { faceVertexCounts, faceVertexIndices, points, normals, materialName, transform } = parsed;

    const positions = [];
    const outNormals = normals ? [] : null;

    let cursor = 0;
    for (const count of faceVertexCounts) {
      const faceIdx = faceVertexIndices.slice(cursor, cursor + count);
      cursor += count;
      if (faceIdx.some((i) => !points[i])) continue;

      // Fan-triangulate (RoomPlan output is already all triangles, but stay generic).
      for (let k = 1; k + 1 < faceIdx.length; k++) {
        const tri = [faceIdx[0], faceIdx[k], faceIdx[k + 1]];
        const tp = tri.map((i) => points[i]);
        // Drop degenerate triangles (collapsed to a point/line) — RoomPlan
        // scans can contain placeholder faces like this for missing geometry.
        const [a, b, c] = tp;
        const isDegenerate = (a[0] === b[0] && a[1] === b[1] && a[2] === b[2]) ||
          (b[0] === c[0] && b[1] === c[1] && b[2] === c[2]) ||
          (a[0] === c[0] && a[1] === c[1] && a[2] === c[2]);
        if (isDegenerate) continue;

        for (const idx of tri) {
          const p = transform ? applyTransform(transform, points[idx]) : points[idx];
          positions.push(p);
          if (outNormals) {
            const n = normals[idx] ?? [0, 1, 0];
            outNormals.push(transform ? applyRotation(transform, n) : n);
          }
        }
      }
    }

    if (positions.length === 0) continue;

    meshes.push({
      name,
      positions,
      normals: outNormals,
      color: materialName ? materials.get(materialName) ?? null : null,
    });
  }

  return meshes;
}
