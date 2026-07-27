import type { Point2D } from './roomMesh';
import type { Scan } from '../types';

/** Rooms created via "Draw a room" know their exact wall polygon — parsed
 * here and re-centered to match how <Center> repositions the rendered scan
 * (same bounding-box-center math as drei's Center), so the polygon lands
 * exactly on the real walls instead of needing a second, possibly-offset
 * source of truth. Returns null for scans with no known wall geometry. */
export function getRoomPolygonPoints(scan: Scan): Point2D[] | null {
  if (!scan.wall_points_json) return null;
  try {
    const raw: Point2D[] = JSON.parse(scan.wall_points_json);
    if (!Array.isArray(raw) || raw.length < 3) return null;
    const xs = raw.map((p) => p.x);
    const zs = raw.map((p) => p.z);
    const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    const cz = (Math.min(...zs) + Math.max(...zs)) / 2;
    return raw.map((p) => ({ x: p.x - cx, z: p.z - cz }));
  } catch {
    return null;
  }
}

/** Standard ray-casting point-in-polygon test. */
export function isPointInPolygon(p: Point2D, polygon: Point2D[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const { x: xi, z: zi } = polygon[i];
    const { x: xj, z: zj } = polygon[j];
    const intersects = zi > p.z !== zj > p.z && p.x < ((xj - xi) * (p.z - zi)) / (zj - zi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** The four corners of an item's footprint rectangle in world space,
 * matching three.js's rotation.y convention (same rotation FurnitureMesh
 * applies to its group). */
export function footprintCorners(
  x: number,
  z: number,
  widthM: number,
  depthM: number,
  rotationY: number
): Point2D[] {
  const hw = widthM / 2;
  const hd = depthM / 2;
  const cos = Math.cos(rotationY);
  const sin = Math.sin(rotationY);
  const local: Point2D[] = [
    { x: -hw, z: -hd },
    { x: hw, z: -hd },
    { x: hw, z: hd },
    { x: -hw, z: hd },
  ];
  return local.map((p) => ({
    x: x + p.x * cos + p.z * sin,
    z: z - p.x * sin + p.z * cos,
  }));
}

/** A simple rectangular boundary from the scan's overall bounding box —
 * used as a fallback boundary for scans without exact wall geometry. */
export function boundsRectangle(sizeX: number, sizeZ: number): Point2D[] {
  return [
    { x: -sizeX / 2, z: -sizeZ / 2 },
    { x: sizeX / 2, z: -sizeZ / 2 },
    { x: sizeX / 2, z: sizeZ / 2 },
    { x: -sizeX / 2, z: sizeZ / 2 },
  ];
}
