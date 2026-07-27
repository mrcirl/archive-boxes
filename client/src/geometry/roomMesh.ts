import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';

export interface Point2D {
  x: number;
  z: number;
}

/** Builds a floor + wall mesh from a closed polygon (meters, XZ plane) —
 * the same kind of geometry a real scan would produce, so it can go through
 * the exact same upload/viewer/camera-framing pipeline as an uploaded scan. */
export function buildRoomGroup(points: Point2D[], wallHeightM: number): THREE.Group {
  const group = new THREE.Group();
  const wallMaterial = new THREE.MeshStandardMaterial({ color: '#c9cad0' });
  const floorMaterial = new THREE.MeshStandardMaterial({ color: '#8f9096' });

  // Floor: three.js Shape is defined in an XY plane, so build it from
  // (x, z) pairs directly, then rotate flat into the world's XZ plane.
  const shape = new THREE.Shape(points.map((p) => new THREE.Vector2(p.x, p.z)));
  const floorGeometry = new THREE.ShapeGeometry(shape);
  floorGeometry.rotateX(Math.PI / 2);
  const floor = new THREE.Mesh(floorGeometry, floorMaterial);
  floor.name = 'Floor';
  group.add(floor);

  // Walls: one quad per polygon edge, wound to face inward (toward the
  // room's interior) so they read correctly from a normal walk-through view.
  const positions: number[] = [];
  const normals: number[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len = Math.hypot(dx, dz) || 1;
    // Inward-facing normal (rotate edge direction -90°); polygon is drawn
    // clockwise in screen space (down = +z), which makes this point inward.
    const nx = -dz / len;
    const nz = dx / len;

    const v0 = [a.x, 0, a.z];
    const v1 = [b.x, 0, b.z];
    const v2 = [b.x, wallHeightM, b.z];
    const v3 = [a.x, wallHeightM, a.z];
    positions.push(...v0, ...v1, ...v2, ...v0, ...v2, ...v3);
    for (let k = 0; k < 6; k++) normals.push(nx, 0, nz);
  }
  const wallGeometry = new THREE.BufferGeometry();
  wallGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  wallGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  const walls = new THREE.Mesh(wallGeometry, wallMaterial);
  walls.name = 'Walls';
  group.add(walls);

  return group;
}

export async function exportGroupToGlb(group: THREE.Group): Promise<Blob> {
  const exporter = new GLTFExporter();
  const glb = await exporter.parseAsync(group, { binary: true });
  return new Blob([glb as ArrayBuffer], { type: 'model/gltf-binary' });
}

/** Shoelace formula — polygon area, used to reject degenerate (zero-area
 * or self-crossing-to-a-line) shapes before we try to build a room from them. */
export function polygonArea(points: Point2D[]): number {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += a.x * b.z - b.x * a.z;
  }
  return Math.abs(sum) / 2;
}
