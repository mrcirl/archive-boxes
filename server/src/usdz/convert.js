import AdmZip from 'adm-zip';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { parseUsdaMeshes } from './parseUsda.js';

// GLTFExporter's binary path reads its merged Blob via FileReader, which
// only exists in browsers. Node has Blob (with .arrayBuffer()) but no
// FileReader, so polyfill just enough of it to make that code path work.
if (typeof globalThis.FileReader === 'undefined') {
  globalThis.FileReader = class {
    readAsArrayBuffer(blob) {
      blob
        .arrayBuffer()
        .then((buf) => {
          this.result = buf;
          this.onloadend?.();
        })
        .catch((err) => {
          this.onerror?.(err);
        });
    }
  };
}

export class UnsupportedUsdzError extends Error {}

/**
 * Converts a RoomPlan-style USDZ (a zip of plain-text .usda files) into a
 * GLB buffer so it can be previewed with the same GLTFLoader path as native
 * GLB/GLTF uploads. Binary "crate" USD (.usdc) is not supported — there is
 * no browser/Node USD crate parser available here — and throws
 * UnsupportedUsdzError so the caller can fall back gracefully.
 */
export async function convertUsdzToGlb(usdzPath) {
  const zip = new AdmZip(usdzPath);
  const entries = zip.getEntries();

  const usdaEntries = entries.filter((e) => e.entryName.toLowerCase().endsWith('.usda'));
  const usdcEntries = entries.filter((e) => e.entryName.toLowerCase().endsWith('.usdc'));

  if (usdaEntries.length === 0) {
    if (usdcEntries.length > 0) {
      throw new UnsupportedUsdzError('This USDZ uses the binary USD (.usdc) format, which has no available parser.');
    }
    throw new UnsupportedUsdzError('No USD content found in this USDZ archive.');
  }

  const group = new THREE.Group();
  let meshCount = 0;

  for (const entry of usdaEntries) {
    const text = entry.getData().toString('utf8');
    const meshes = parseUsdaMeshes(text);

    for (const mesh of meshes) {
      const geometry = new THREE.BufferGeometry();
      const positionArray = new Float32Array(mesh.positions.length * 3);
      mesh.positions.forEach(([x, y, z], i) => {
        positionArray[i * 3] = x;
        positionArray[i * 3 + 1] = y;
        positionArray[i * 3 + 2] = z;
      });
      geometry.setAttribute('position', new THREE.BufferAttribute(positionArray, 3));

      if (mesh.normals) {
        const normalArray = new Float32Array(mesh.normals.length * 3);
        mesh.normals.forEach(([x, y, z], i) => {
          normalArray[i * 3] = x;
          normalArray[i * 3 + 1] = y;
          normalArray[i * 3 + 2] = z;
        });
        geometry.setAttribute('normal', new THREE.BufferAttribute(normalArray, 3));
      } else {
        geometry.computeVertexNormals();
      }

      const material = new THREE.MeshStandardMaterial({
        color: mesh.color
          ? new THREE.Color(mesh.color.r, mesh.color.g, mesh.color.b)
          : new THREE.Color(0.75, 0.75, 0.75),
      });

      const threeMesh = new THREE.Mesh(geometry, material);
      threeMesh.name = mesh.name;
      group.add(threeMesh);
      meshCount++;
    }
  }

  if (meshCount === 0) {
    throw new UnsupportedUsdzError('No renderable geometry found in this USDZ (only placeholder/degenerate meshes).');
  }

  const exporter = new GLTFExporter();
  const glb = await exporter.parseAsync(group, { binary: true });
  return Buffer.from(glb);
}
