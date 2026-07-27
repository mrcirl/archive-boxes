import { Suspense, useEffect, useMemo } from 'react';
import { useLoader } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { Html, Center } from '@react-three/drei';
import * as THREE from 'three';
import type { Scan } from '../types';
import { scanFileUrl, scanPreviewUrl } from '../api';
import { useBoundsStore } from '../store/boundsStore';

function useReportBounds(object: THREE.Object3D) {
  const setBounds = useBoundsStore((s) => s.setBounds);
  useEffect(() => {
    const box = new THREE.Box3().setFromObject(object);
    const size = new THREE.Vector3();
    box.getSize(size);
    if (size.x > 0 || size.y > 0 || size.z > 0) {
      setBounds({ sizeX: size.x, sizeY: size.y, sizeZ: size.z });
    }
  }, [object, setBounds]);
}

/** Room scans are viewed mostly from outside — opaque walls would hide the
 * furniture being arranged inside, so render the scan semi-transparent. */
function makeScanTranslucent(root: THREE.Object3D) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    if (!child.material) {
      child.material = new THREE.MeshStandardMaterial({ color: '#b7b7b7' });
    }
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const mat of materials) {
      mat.transparent = true;
      mat.opacity = 0.45;
      mat.side = THREE.DoubleSide;
      mat.depthWrite = false;
    }
  });
  return root;
}

function GlbScan({ url }: { url: string }) {
  const gltf = useLoader(GLTFLoader, url);
  const translucent = useMemo(() => makeScanTranslucent(gltf.scene), [gltf.scene]);
  useReportBounds(translucent);
  return <primitive object={translucent} />;
}

function ObjScan({ url }: { url: string }) {
  const obj = useLoader(OBJLoader, url);
  const translucent = useMemo(() => makeScanTranslucent(obj), [obj]);
  useReportBounds(translucent);
  return <primitive object={translucent} />;
}

function UnsupportedScan({ reason }: { reason: string }) {
  return (
    <Html center>
      <div className="scan-unsupported-note">
        {reason}
        <br />
        Export your scan as GLB or OBJ for a full 3D/2D preview — the file is still stored
        and attached to this project.
      </div>
    </Html>
  );
}

export function ScanMesh({ scan }: { scan: Scan }) {
  const clearBounds = useBoundsStore((s) => s.clear);

  useEffect(() => {
    clearBounds();
  }, [scan.id, clearBounds]);

  if (scan.format === 'usdz') {
    const previewUrl = scanPreviewUrl(scan);
    if (!previewUrl) {
      return (
        <UnsupportedScan
          reason={
            scan.preview_error ??
            "Preview isn't available for this .usdz scan in the browser yet."
          }
        />
      );
    }
    return (
      <Suspense fallback={<Html center>Loading scan…</Html>}>
        <Center bottom>
          <GlbScan url={previewUrl} />
        </Center>
      </Suspense>
    );
  }

  const url = scanFileUrl(scan);
  return (
    <Suspense fallback={<Html center>Loading scan…</Html>}>
      <Center bottom>
        {scan.format === 'obj' ? <ObjScan url={url} /> : <GlbScan url={url} />}
      </Center>
    </Suspense>
  );
}
